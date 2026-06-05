-- Search metadata for predictions + trigram indexes for autocomplete

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.prediction_market_creations
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS question_type text;

CREATE INDEX IF NOT EXISTS idx_prediction_creations_category
  ON public.prediction_market_creations (lower(category));

CREATE INDEX IF NOT EXISTS idx_prediction_creations_title_trgm
  ON public.prediction_market_creations USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_video_assets_title_trgm
  ON public.video_assets USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_metokens_name_trgm
  ON public.metokens USING gin (name gin_trgm_ops);
