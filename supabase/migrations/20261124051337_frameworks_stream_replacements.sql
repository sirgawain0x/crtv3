-- Replacement keys never enter a browser response or an executable SQL artifact.
CREATE TABLE public.frameworks_stream_replacements (
  stream_row_id uuid PRIMARY KEY REFERENCES public.streams(id),
  source_snapshot jsonb NOT NULL,
  source_provider text,
  source_stream_key text NOT NULL,
  state text NOT NULL DEFAULT 'prepared' CHECK (state IN ('prepared','creating','ready','ambiguous','applied')),
  frameworks_stream_id text UNIQUE,
  frameworks_playback_id text UNIQUE,
  frameworks_stream_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (state NOT IN ('ready','applied') OR (
    length(frameworks_stream_id)>0 AND length(frameworks_playback_id)>0 AND length(frameworks_stream_key)>0
    AND frameworks_stream_id IS NOT NULL AND frameworks_playback_id IS NOT NULL AND frameworks_stream_key IS NOT NULL))
);
ALTER TABLE public.frameworks_stream_replacements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.frameworks_stream_replacements FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.frameworks_stream_replacements TO service_role;
COMMENT ON TABLE public.frameworks_stream_replacements IS 'Private channel migration reservations and rollback keys. Never expose via public reads, logs, or API responses.';
