-- Wallet identities are verified by the API, not Supabase auth.uid().
-- Do not expose these tables or SECURITY DEFINER RPCs through the anonymous API.
REVOKE ALL ON public.notifications, public.push_subscriptions, public.push_deliveries FROM anon, authenticated;
GRANT ALL ON public.notifications, public.push_subscriptions, public.push_deliveries TO service_role;

ALTER TABLE public.push_deliveries ADD COLUMN IF NOT EXISTS claim_token uuid;
ALTER TABLE public.push_deliveries ADD CONSTRAINT push_delivery_state
  CHECK (state IN ('pending', 'sending', 'sent', 'failed', 'cancelled'));
ALTER TABLE public.push_deliveries ADD CONSTRAINT push_delivery_attempts CHECK (attempts BETWEEN 0 AND 5);
CREATE INDEX push_deliveries_due ON public.push_deliveries(next_attempt_at)
  WHERE state IN ('pending', 'sending');

CREATE FUNCTION public.register_push_subscription(p_owner text, p_endpoint text, p_keys jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE existing public.push_subscriptions;
BEGIN
  IF p_owner !~ '^0x[0-9a-f]{40}$' THEN RAISE EXCEPTION 'Invalid owner'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner, 0));
  SELECT * INTO existing FROM public.push_subscriptions WHERE endpoint = p_endpoint FOR UPDATE;
  IF FOUND AND existing.owner_id <> p_owner THEN RAISE EXCEPTION 'Endpoint belongs to another account'; END IF;
  IF existing.enabled AND existing.keys <> p_keys THEN RAISE EXCEPTION 'Subscription keys changed'; END IF;
  IF NOT coalesce(existing.enabled, false) AND
    (SELECT count(*) FROM public.push_subscriptions WHERE owner_id = p_owner AND enabled) >= 5 THEN
    RAISE EXCEPTION 'Device limit reached';
  END IF;
  INSERT INTO public.push_subscriptions(id, owner_id, endpoint, keys)
    VALUES (gen_random_uuid()::text, p_owner, p_endpoint, p_keys)
    ON CONFLICT(endpoint) DO UPDATE SET enabled = true, keys = excluded.keys,
      created_at = CASE WHEN public.push_subscriptions.enabled
        THEN public.push_subscriptions.created_at ELSE now() END
    WHERE public.push_subscriptions.owner_id = p_owner
      AND (NOT public.push_subscriptions.enabled OR public.push_subscriptions.keys = excluded.keys);
  -- Also enforce ownership when another transaction inserted the same endpoint
  -- after our initial SELECT. Never replace a different owner's encryption keys.
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription ownership or keys changed'; END IF;
END $$;

-- Enqueue only new notifications for devices already opted in. Enabling or
-- re-enabling push never replays the user's historical unread inbox.
CREATE FUNCTION public.enqueue_notification_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.push_deliveries(id, notification_id, subscription_id)
    SELECT gen_random_uuid()::text, NEW.id, s.id
    FROM public.push_subscriptions s
    WHERE s.owner_id = NEW.owner_id AND s.enabled AND s.created_at <= NEW.created_at
    ON CONFLICT(notification_id, subscription_id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER notifications_enqueue_push AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_notification_push();

CREATE FUNCTION public.cancel_notification_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.push_deliveries SET state = 'cancelled', claim_token = NULL, locked_at = NULL
    WHERE notification_id = NEW.id AND state IN ('pending', 'sending');
  RETURN NEW;
END $$;
CREATE TRIGGER notifications_read_cancel_push AFTER UPDATE OF read_at ON public.notifications
  FOR EACH ROW WHEN (NEW.read_at IS NOT NULL) EXECUTE FUNCTION public.cancel_notification_push();

CREATE FUNCTION public.cancel_device_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.push_deliveries SET state = 'cancelled', claim_token = NULL, locked_at = NULL
    WHERE subscription_id = NEW.id AND state IN ('pending', 'sending');
  RETURN NEW;
END $$;
CREATE TRIGGER push_subscription_disabled AFTER UPDATE OF enabled ON public.push_subscriptions
  FOR EACH ROW WHEN (NOT NEW.enabled) EXECUTE FUNCTION public.cancel_device_push();

CREATE FUNCTION public.claim_push_deliveries(p_owner text DEFAULT NULL, p_limit integer DEFAULT 20)
RETURNS TABLE(id text, attempts integer, claim_token uuid, subscription_id text, endpoint text, keys jsonb, href text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- A crash after the fifth attempt must still become terminal when its lease expires.
  UPDATE public.push_deliveries d SET state = 'failed', claim_token = NULL, locked_at = NULL
    WHERE d.attempts >= 5 AND (d.state = 'pending' OR
      (d.state = 'sending' AND d.locked_at < now() - interval '5 minutes'));
  RETURN QUERY
    WITH candidates AS (
      SELECT d.id FROM public.push_deliveries d
      JOIN public.push_subscriptions s ON s.id = d.subscription_id
      JOIN public.notifications n ON n.id = d.notification_id AND n.owner_id = s.owner_id
      WHERE (p_owner IS NULL OR s.owner_id = p_owner) AND s.enabled AND n.read_at IS NULL
        AND d.attempts < 5 AND d.next_attempt_at <= now()
        AND (d.state = 'pending' OR (d.state = 'sending' AND d.locked_at < now() - interval '5 minutes'))
      ORDER BY d.next_attempt_at, d.id LIMIT greatest(1, least(p_limit, 20))
      FOR UPDATE OF d SKIP LOCKED
    ), claimed AS (
      UPDATE public.push_deliveries d SET state = 'sending', attempts = d.attempts + 1,
        locked_at = now(), claim_token = gen_random_uuid()
      FROM candidates c WHERE d.id = c.id
      RETURNING d.id, d.attempts, d.claim_token, d.subscription_id, d.notification_id
    )
    SELECT c.id, c.attempts, c.claim_token, c.subscription_id, s.endpoint, s.keys, n.href
      FROM claimed c JOIN public.push_subscriptions s ON s.id = c.subscription_id
      JOIN public.notifications n ON n.id = c.notification_id;
END $$;

-- Comments and replies are durable activity sources. Do not include raw comment
-- text in notifications. The inbox links back to the original video.
CREATE FUNCTION public.notify_video_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE video public.video_assets; recipient text;
BEGIN
  IF NEW.is_deleted THEN RETURN NEW; END IF;
  SELECT * INTO video FROM public.video_assets WHERE id = NEW.video_asset_id;
  FOR recipient IN
    SELECT DISTINCT lower(address) FROM (
      SELECT video.creator_id AS address
      UNION ALL SELECT c.commenter_address FROM public.video_comments c
        WHERE c.id = NEW.parent_comment_id AND c.video_asset_id = NEW.video_asset_id AND NOT c.is_deleted
    ) recipients
    WHERE address ~* '^0x[0-9a-f]{40}$' AND lower(address) <> lower(NEW.commenter_address)
  LOOP
    INSERT INTO public.notifications(id, owner_id, event_key, title, body, href)
      VALUES (gen_random_uuid()::text, recipient, 'video-comment:' || NEW.id,
        CASE WHEN recipient = lower(video.creator_id) THEN 'New video comment' ELSE 'New comment reply' END,
        'There is a new comment on a video you participated in.', '/watch/' || video.playback_id)
      ON CONFLICT(owner_id, event_key) DO NOTHING;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER video_comment_notification AFTER INSERT ON public.video_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_video_comment();

REVOKE ALL ON FUNCTION public.register_push_subscription(text, text, jsonb),
  public.enqueue_notification_push(), public.cancel_notification_push(), public.cancel_device_push(),
  public.claim_push_deliveries(text, integer), public.notify_video_comment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_push_subscription(text, text, jsonb),
  public.claim_push_deliveries(text, integer) TO service_role;
