-- Creator-owned newsletters (Creative Platform). Writes via service-role API routes.

DO $$ BEGIN
  CREATE TYPE public.newsletter_issue_status AS ENUM ('draft', 'published');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.newsletter_subscriber_status AS ENUM (
    'pending',
    'subscribed',
    'unsubscribed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.newsletter_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  owner_address text NOT NULL,
  metoken_address text,
  mailgun_domain text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_publications_owner_lower CHECK (owner_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT newsletter_publications_metoken_lower CHECK (
    metoken_address IS NULL OR metoken_address ~ '^0x[a-f0-9]{40}$'
  )
);

CREATE INDEX IF NOT EXISTS idx_newsletter_publications_owner
  ON public.newsletter_publications (owner_address);

CREATE TABLE IF NOT EXISTS public.newsletter_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL
    REFERENCES public.newsletter_publications(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  subtitle text,
  body_html text NOT NULL DEFAULT '',
  cover_image_url text,
  status public.newsletter_issue_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_issues_slug_per_pub UNIQUE (publication_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_issues_publication
  ON public.newsletter_issues (publication_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_issues_published
  ON public.newsletter_issues (publication_id, published_at DESC)
  WHERE status = 'published';

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL
    REFERENCES public.newsletter_publications(id) ON DELETE CASCADE,
  email text NOT NULL,
  status public.newsletter_subscriber_status NOT NULL DEFAULT 'pending',
  subscribed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_subscribers_email_lower CHECK (email = lower(email)),
  CONSTRAINT newsletter_subscribers_unique_email UNIQUE (publication_id, email)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_publication
  ON public.newsletter_subscribers (publication_id)
  WHERE status = 'subscribed';

ALTER TABLE public.newsletter_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Public read: publications and published issues only.
CREATE POLICY newsletter_publications_public_select
  ON public.newsletter_publications
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY newsletter_issues_public_select
  ON public.newsletter_issues
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- No direct client writes; API uses service role.
CREATE POLICY newsletter_subscribers_no_direct_access
  ON public.newsletter_subscribers
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.newsletter_publications IS
  'Per-creator newsletter brand; owner_address is smart account (lowercase).';
COMMENT ON TABLE public.newsletter_issues IS
  'Newsletter issues; published rows power TV listings and public RSS.';
COMMENT ON TABLE public.newsletter_subscribers IS
  'Mailing list; managed only via crtv3 API + Mailgun.';
