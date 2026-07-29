-- Migration 00009: atomic upsert RPC for hack beta submissions
-- Replaces the two-step SELECT / UPDATE / INSERT from the frontend with a single
-- SECURITY DEFINER function, eliminating the RLS race that surfaced as
-- "new row violates row-level security policy for table 'hack_beta_submissions'".

CREATE OR REPLACE FUNCTION public.upsert_hack_beta_submission(
    p_video_asset_id TEXT,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_playback_id TEXT DEFAULT NULL,
    p_thumbnail_url TEXT DEFAULT NULL,
    p_grove_url TEXT DEFAULT NULL,
    p_grove_hash TEXT DEFAULT NULL
)
RETURNS public.hack_beta_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
    v_wallet_address TEXT;
    v_result public.hack_beta_submissions;
BEGIN
    v_wallet_address := LOWER((auth.jwt() -> 'app_metadata' ->> 'wallet_address'));

    IF v_wallet_address IS NULL THEN
        RAISE EXCEPTION 'Wallet address not found in JWT app_metadata';
    END IF;

    -- Try update first (the common re-submit path)
    UPDATE public.hack_beta_submissions
    SET
        video_asset_id = p_video_asset_id,
        title = p_title,
        description = p_description,
        playback_id = p_playback_id,
        thumbnail_url = p_thumbnail_url,
        grove_url = p_grove_url,
        grove_hash = p_grove_hash,
        status = 'pending',
        updated_at = now()
    WHERE LOWER(wallet_address) = v_wallet_address
    RETURNING * INTO v_result;

    IF FOUND THEN
        RETURN v_result;
    END IF;

    -- First-time submit
    INSERT INTO public.hack_beta_submissions (
        wallet_address,
        video_asset_id,
        title,
        description,
        playback_id,
        thumbnail_url,
        grove_url,
        grove_hash,
        status,
        is_favorite
    ) VALUES (
        v_wallet_address,
        p_video_asset_id,
        p_title,
        p_description,
        p_playback_id,
        p_thumbnail_url,
        p_grove_url,
        p_grove_hash,
        'pending',
        false
    )
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_hack_beta_submission(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_hack_beta_submission(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Same pattern for song cup submissions
CREATE OR REPLACE FUNCTION public.upsert_song_cup_submission(
    p_grove_url TEXT,
    p_grove_hash TEXT DEFAULT NULL,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_artist_handle TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_cover_url TEXT DEFAULT NULL,
    p_cover_hash TEXT DEFAULT NULL,
    p_attestation_uid TEXT DEFAULT NULL,
    p_post_id TEXT DEFAULT NULL
)
RETURNS public.song_cup_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
    v_wallet_address TEXT;
    v_result public.song_cup_submissions;
BEGIN
    v_wallet_address := LOWER((auth.jwt() -> 'app_metadata' ->> 'wallet_address'));

    IF v_wallet_address IS NULL THEN
        RAISE EXCEPTION 'Wallet address not found in JWT app_metadata';
    END IF;

    UPDATE public.song_cup_submissions
    SET
        grove_url = p_grove_url,
        grove_hash = p_grove_hash,
        title = p_title,
        description = p_description,
        artist_handle = p_artist_handle,
        email = p_email,
        cover_url = p_cover_url,
        cover_hash = p_cover_hash,
        attestation_uid = p_attestation_uid,
        post_id = p_post_id,
        status = 'pending',
        updated_at = now()
    WHERE LOWER(wallet_address) = v_wallet_address
    RETURNING * INTO v_result;

    IF FOUND THEN
        RETURN v_result;
    END IF;

    INSERT INTO public.song_cup_submissions (
        wallet_address,
        grove_url,
        grove_hash,
        title,
        description,
        artist_handle,
        email,
        cover_url,
        cover_hash,
        attestation_uid,
        post_id,
        status,
        is_favorite
    ) VALUES (
        v_wallet_address,
        p_grove_url,
        p_grove_hash,
        p_title,
        p_description,
        p_artist_handle,
        p_email,
        p_cover_url,
        p_cover_hash,
        p_attestation_uid,
        p_post_id,
        'pending',
        false
    )
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_song_cup_submission(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_song_cup_submission(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
