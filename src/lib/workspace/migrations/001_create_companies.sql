-- =============================================
-- MIGRATION: Create companies table and add company_id to existing tables
-- =============================================

-- 1. Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    cnpj TEXT,
    logo_url TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);

-- =============================================
-- 2. Add company_id to cash_flow_entries
-- =============================================
ALTER TABLE cash_flow_entries 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_company_id ON cash_flow_entries(company_id);

-- =============================================
-- 3. Add company_id to cash_flow_categories
-- =============================================
ALTER TABLE cash_flow_categories 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_cash_flow_categories_company_id ON cash_flow_categories(company_id);

-- =============================================
-- 4. Add company_id to fixed_costs
-- =============================================
ALTER TABLE fixed_costs 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_fixed_costs_company_id ON fixed_costs(company_id);

-- =============================================
-- 5. Add company_id to fixed_costs_settings
-- =============================================
ALTER TABLE fixed_costs_settings 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_fixed_costs_settings_company_id ON fixed_costs_settings(company_id);

-- =============================================
-- 6. Add company_id to integrations
-- =============================================
ALTER TABLE integrations 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_integrations_company_id ON integrations(company_id);

-- =============================================
-- 7. Add company_id to integration_connections
-- =============================================
ALTER TABLE integration_connections 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_integration_connections_company_id ON integration_connections(company_id);

-- =============================================
-- 8. Add company_id to integration_sync_logs
-- =============================================
ALTER TABLE integration_sync_logs 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_company_id ON integration_sync_logs(company_id);

-- =============================================
-- 9. Add company_id to orders
-- =============================================
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);

-- =============================================
-- 10. Add company_id to order_items
-- =============================================
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_order_items_company_id ON order_items(company_id);

-- =============================================
-- 11. Add company_id to fees
-- =============================================
ALTER TABLE fees 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_fees_company_id ON fees(company_id);

-- =============================================
-- 12. Add company_id to payouts
-- =============================================
ALTER TABLE payouts 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_payouts_company_id ON payouts(company_id);

-- =============================================
-- 13. Add company_id to products (if exists)
-- =============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'id') THEN
        ALTER TABLE products ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
    END IF;
END $$;

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_costs_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Companies policies
-- =============================================
DROP POLICY IF EXISTS "Users can view own companies" ON companies;
CREATE POLICY "Users can view own companies" ON companies
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own companies" ON companies;
CREATE POLICY "Users can insert own companies" ON companies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own companies" ON companies;
CREATE POLICY "Users can update own companies" ON companies
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own companies" ON companies;
CREATE POLICY "Users can delete own companies" ON companies
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- Cash Flow Entries policies
-- =============================================
DROP POLICY IF EXISTS "Users can manage entries of their companies" ON cash_flow_entries;
CREATE POLICY "Users can manage entries of their companies" ON cash_flow_entries
    FOR ALL USING (
        company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    );

-- =============================================
-- Cash Flow Categories policies
-- =============================================
DROP POLICY IF EXISTS "Users can manage categories of their companies" ON cash_flow_categories;
CREATE POLICY "Users can manage categories of their companies" ON cash_flow_categories
    FOR ALL USING (
        company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    );

-- =============================================
-- Fixed Costs policies
-- =============================================
DROP POLICY IF EXISTS "Users can manage fixed costs of their companies" ON fixed_costs;
CREATE POLICY "Users can manage fixed costs of their companies" ON fixed_costs
    FOR ALL USING (
        company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    );

-- =============================================
-- Fixed Costs Settings policies
-- =============================================
DROP POLICY IF EXISTS "Users can manage settings of their companies" ON fixed_costs_settings;
CREATE POLICY "Users can manage settings of their companies" ON fixed_costs_settings
    FOR ALL USING (
        company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    );

-- =============================================
-- Integrations policies
-- =============================================
DROP POLICY IF EXISTS "Users can manage integrations of their companies" ON integrations;
CREATE POLICY "Users can manage integrations of their companies" ON integrations
    FOR ALL USING (
        company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    );

-- =============================================
-- Integration Connections policies
-- =============================================
DROP POLICY IF EXISTS "Users can manage connections of their companies" ON integration_connections;
CREATE POLICY "Users can manage connections of their companies" ON integration_connections
    FOR ALL USING (
        company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    );

-- =============================================
-- Integration Sync Logs policies
-- =============================================
DROP POLICY IF EXISTS "Users can view logs of their companies" ON integration_sync_logs;
CREATE POLICY "Users can view logs of their companies" ON integration_sync_logs
    FOR SELECT USING (
        company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert logs of their companies" ON integration_sync_logs;
CREATE POLICY "Users can insert logs of their companies" ON integration_sync_logs
    FOR INSERT WITH CHECK (
        company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    );

-- =============================================
-- Orders policies
-- =============================================
DROP POLICY IF EXISTS "Users can manage orders of their companies" ON orders;
CREATE POLICY "Users can manage orders of their companies" ON orders
    FOR ALL USING (
        company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    );

-- =============================================
-- Order Items policies
-- =============================================
DROP POLICY IF EXISTS "Users can manage items of their companies" ON order_items;
CREATE POLICY "Users can manage items of their companies" ON order_items
    FOR ALL USING (
        company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    );

-- =============================================
-- Fees policies
-- =============================================
DROP POLICY IF EXISTS "Users can manage fees of their companies" ON fees;
CREATE POLICY "Users can manage fees of their companies" ON fees
    FOR ALL USING (
        company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    );

-- =============================================
-- Payouts policies
-- =============================================
DROP POLICY IF EXISTS "Users can manage payouts of their companies" ON payouts;
CREATE POLICY "Users can manage payouts of their companies" ON payouts
    FOR ALL USING (
        company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    );

-- =============================================
-- Migration helper function
-- =============================================
CREATE OR REPLACE FUNCTION migrate_existing_user_to_company()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    company_id UUID;
BEGIN
    -- For each user, create a default company and migrate their data
    FOR user_record IN 
        SELECT DISTINCT user_id FROM cash_flow_entries WHERE user_id IS NOT NULL
    LOOP
        -- Create default company
        INSERT INTO companies (user_id, name)
        VALUES (user_record.user_id, 'Minha Empresa')
        RETURNING id INTO company_id;

        -- Migrate cash_flow_entries
        UPDATE cash_flow_entries 
        SET company_id = company_id 
        WHERE user_id = user_record.user_id AND company_id IS NULL;

        -- Migrate cash_flow_categories
        UPDATE cash_flow_categories 
        SET company_id = company_id 
        WHERE user_id = user_record.user_id AND company_id IS NULL;

        -- Migrate fixed_costs
        UPDATE fixed_costs 
        SET company_id = company_id 
        WHERE user_id = user_record.user_id AND company_id IS NULL;

        -- Migrate fixed_costs_settings
        UPDATE fixed_costs_settings 
        SET company_id = company_id 
        WHERE user_id = user_record.user_id AND company_id IS NULL;

        -- Migrate integrations
        UPDATE integrations 
        SET company_id = company_id 
        WHERE user_id = user_record.user_id AND company_id IS NULL;

        -- Migrate integration_connections
        UPDATE integration_connections 
        SET company_id = company_id 
        WHERE user_id = user_record.user_id AND company_id IS NULL;

        -- Migrate integration_sync_logs
        UPDATE integration_sync_logs 
        SET company_id = company_id 
        WHERE user_id = user_record.user_id AND company_id IS NULL;

        -- Migrate orders
        UPDATE orders 
        SET company_id = company_id 
        WHERE user_id = user_record.user_id AND company_id IS NULL;

        -- Migrate order_items
        UPDATE order_items 
        SET company_id = company_id 
        WHERE user_id = user_record.user_id AND company_id IS NULL;

        -- Migrate fees
        UPDATE fees 
        SET company_id = company_id 
        WHERE user_id = user_record.user_id AND company_id IS NULL;

        -- Migrate payouts
        UPDATE payouts 
        SET company_id = company_id 
        WHERE user_id = user_record.user_id AND company_id IS NULL;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function to get user's companies
-- =============================================
CREATE OR REPLACE FUNCTION get_user_companies()
RETURNS TABLE (
    id UUID,
    name TEXT,
    cnpj TEXT,
    logo_url TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.name, c.cnpj, c.logo_url, c.is_active, c.created_at
    FROM companies c
    WHERE c.user_id = auth.uid()
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
