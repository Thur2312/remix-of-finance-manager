-- Lead capture for the "Empresarial" plan questionnaire on the landing page.
CREATE TABLE public.enterprise_leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    company_name text NOT NULL,
    contact_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    team_size text NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.enterprise_leads ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can submit the questionnaire.
-- No SELECT policy is defined, so only the service role (dashboard/backend) can read submissions.
CREATE POLICY "Anyone can submit an enterprise lead" ON public.enterprise_leads
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
