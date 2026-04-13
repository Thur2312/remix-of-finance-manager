-- =============================================
-- Migration: Multi-Tenant Support - Companies Table
-- Date: 2026-04-10
-- =============================================

-- =============================================
-- 1. Create companies table
-- =============================================

CREATE TABLE IF NOT EXISTS public.companies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    cnpj TEXT,
    logo_url TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 2. Add company_id to existing tables
-- =============================================

-- Add company_id to raw_orders (Shopee orders)
ALTER TABLE public.raw_orders 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Add company_id to tiktok_orders
ALTER TABLE public.tiktok_orders 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Add company_id to tiktok_settlements
ALTER TABLE public.tiktok_settlements 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Add company_id to tiktok_statements
ALTER TABLE public.tiktok_statements 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Add company_id to cash_flow_categories
ALTER TABLE public.cash_flow_categories 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Add company_id to cash_flow_entries
ALTER TABLE public.cash_flow_entries 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Add company_id to fixed_costs
ALTER TABLE public.fixed_costs 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Add company_id to fixed_costs_settings
ALTER TABLE public.fixed_costs_settings 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Add company_id to settings (Shopee settings)
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Add company_id to tiktok_settings
ALTER TABLE public.tiktok_settings 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Add company_id to product_costs
ALTER TABLE public.product_costs 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Add company_id to anuncios (if exists)
ALTER TABLE public.anuncios 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Add company_id to custom_cost_categories (if exists)
ALTER TABLE public.custom_cost_categories 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- =============================================
-- 3. Create indexes for company_id lookups
-- =============================================

CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);
CREATE INDEX IF NOT EXISTS idx_raw_orders_company_id ON public.raw_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_orders_company_id ON public.tiktok_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_settlements_company_id ON public.tiktok_settlements(company_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_statements_company_id ON public.tiktok_statements(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_categories_company_id ON public.cash_flow_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_company_id ON public.cash_flow_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_fixed_costs_company_id ON public.fixed_costs(company_id);
CREATE INDEX IF NOT EXISTS idx_fixed_costs_settings_company_id ON public.fixed_costs_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_settings_company_id ON public.settings(company_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_settings_company_id ON public.tiktok_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_product_costs_company_id ON public.product_costs(company_id);
CREATE INDEX IF NOT EXISTS idx_anuncios_company_id ON public.anuncios(company_id);
CREATE INDEX IF NOT EXISTS idx_custom_cost_categories_company_id ON public.custom_cost_categories(company_id);

-- =============================================
-- 4. Enable RLS on companies table
-- =============================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Users can view own companies"
ON public.companies
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own companies"
ON public.companies
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companies"
ON public.companies
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own companies"
ON public.companies
FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- 5. Update existing RLS policies to include company_id
-- =============================================

-- Drop existing RLS policies that filter by user_id only
-- and create new ones that filter by company_id

-- raw_orders: Add company_id filter to existing policies
DROP POLICY IF EXISTS "Users can view own raw_orders" ON public.raw_orders;
CREATE POLICY "Users can view own raw_orders"
ON public.raw_orders
FOR SELECT
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own raw_orders" ON public.raw_orders;
CREATE POLICY "Users can insert own raw_orders"
ON public.raw_orders
FOR INSERT
WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own raw_orders" ON public.raw_orders;
CREATE POLICY "Users can update own raw_orders"
ON public.raw_orders
FOR UPDATE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own raw_orders" ON public.raw_orders;
CREATE POLICY "Users can delete own raw_orders"
ON public.raw_orders
FOR DELETE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- tiktok_orders
DROP POLICY IF EXISTS "Users can view own tiktok_orders" ON public.tiktok_orders;
CREATE POLICY "Users can view own tiktok_orders"
ON public.tiktok_orders
FOR SELECT
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own tiktok_orders" ON public.tiktok_orders;
CREATE POLICY "Users can insert own tiktok_orders"
ON public.tiktok_orders
FOR INSERT
WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own tiktok_orders" ON public.tiktok_orders;
CREATE POLICY "Users can update own tiktok_orders"
ON public.tiktok_orders
FOR UPDATE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own tiktok_orders" ON public.tiktok_orders;
CREATE POLICY "Users can delete own tiktok_orders"
ON public.tiktok_orders
FOR DELETE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- tiktok_settlements
DROP POLICY IF EXISTS "Users can view own tiktok_settlements" ON public.tiktok_settlements;
CREATE POLICY "Users can view own tiktok_settlements"
ON public.tiktok_settlements
FOR SELECT
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own tiktok_settlements" ON public.tiktok_settlements;
CREATE POLICY "Users can insert own tiktok_settlements"
ON public.tiktok_settlements
FOR INSERT
WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own tiktok_settlements" ON public.tiktok_settlements;
CREATE POLICY "Users can update own tiktok_settlements"
ON public.tiktok_settlements
FOR UPDATE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own tiktok_settlements" ON public.tiktok_settlements;
CREATE POLICY "Users can delete own tiktok_settlements"
ON public.tiktok_settlements
FOR DELETE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- tiktok_statements
DROP POLICY IF EXISTS "Users can view own tiktok_statements" ON public.tiktok_statements;
CREATE POLICY "Users can view own tiktok_statements"
ON public.tiktok_statements
FOR SELECT
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own tiktok_statements" ON public.tiktok_statements;
CREATE POLICY "Users can insert own tiktok_statements"
ON public.tiktok_statements
FOR INSERT
WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own tiktok_statements" ON public.tiktok_statements;
CREATE POLICY "Users can update own tiktok_statements"
ON public.tiktok_statements
FOR UPDATE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own tiktok_statements" ON public.tiktok_statements;
CREATE POLICY "Users can delete own tiktok_statements"
ON public.tiktok_statements
FOR DELETE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- cash_flow_categories
DROP POLICY IF EXISTS "Users can view own cash_flow_categories" ON public.cash_flow_categories;
CREATE POLICY "Users can view own cash_flow_categories"
ON public.cash_flow_categories
FOR SELECT
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own cash_flow_categories" ON public.cash_flow_categories;
CREATE POLICY "Users can insert own cash_flow_categories"
ON public.cash_flow_categories
FOR INSERT
WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own cash_flow_categories" ON public.cash_flow_categories;
CREATE POLICY "Users can update own cash_flow_categories"
ON public.cash_flow_categories
FOR UPDATE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own cash_flow_categories" ON public.cash_flow_categories;
CREATE POLICY "Users can delete own cash_flow_categories"
ON public.cash_flow_categories
FOR DELETE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- cash_flow_entries
DROP POLICY IF EXISTS "Users can view own cash_flow_entries" ON public.cash_flow_entries;
CREATE POLICY "Users can view own cash_flow_entries"
ON public.cash_flow_entries
FOR SELECT
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own cash_flow_entries" ON public.cash_flow_entries;
CREATE POLICY "Users can insert own cash_flow_entries"
ON public.cash_flow_entries
FOR INSERT
WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own cash_flow_entries" ON public.cash_flow_entries;
CREATE POLICY "Users can update own cash_flow_entries"
ON public.cash_flow_entries
FOR UPDATE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own cash_flow_entries" ON public.cash_flow_entries;
CREATE POLICY "Users can delete own cash_flow_entries"
ON public.cash_flow_entries
FOR DELETE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- fixed_costs
DROP POLICY IF EXISTS "Users can view own fixed_costs" ON public.fixed_costs;
CREATE POLICY "Users can view own fixed_costs"
ON public.fixed_costs
FOR SELECT
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own fixed_costs" ON public.fixed_costs;
CREATE POLICY "Users can insert own fixed_costs"
ON public.fixed_costs
FOR INSERT
WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own fixed_costs" ON public.fixed_costs;
CREATE POLICY "Users can update own fixed_costs"
ON public.fixed_costs
FOR UPDATE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own fixed_costs" ON public.fixed_costs;
CREATE POLICY "Users can delete own fixed_costs"
ON public.fixed_costs
FOR DELETE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- fixed_costs_settings
DROP POLICY IF EXISTS "Users can view own fixed_costs_settings" ON public.fixed_costs_settings;
CREATE POLICY "Users can view own fixed_costs_settings"
ON public.fixed_costs_settings
FOR SELECT
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own fixed_costs_settings" ON public.fixed_costs_settings;
CREATE POLICY "Users can insert own fixed_costs_settings"
ON public.fixed_costs_settings
FOR INSERT
WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own fixed_costs_settings" ON public.fixed_costs_settings;
CREATE POLICY "Users can update own fixed_costs_settings"
ON public.fixed_costs_settings
FOR UPDATE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own fixed_costs_settings" ON public.fixed_costs_settings;
CREATE POLICY "Users can delete own fixed_costs_settings"
ON public.fixed_costs_settings
FOR DELETE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- settings (Shopee)
DROP POLICY IF EXISTS "Users can view own settings" ON public.settings;
CREATE POLICY "Users can view own settings"
ON public.settings
FOR SELECT
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own settings" ON public.settings;
CREATE POLICY "Users can insert own settings"
ON public.settings
FOR INSERT
WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;
CREATE POLICY "Users can update own settings"
ON public.settings
FOR UPDATE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own settings" ON public.settings;
CREATE POLICY "Users can delete own settings"
ON public.settings
FOR DELETE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- tiktok_settings
DROP POLICY IF EXISTS "Users can view own tiktok_settings" ON public.tiktok_settings;
CREATE POLICY "Users can view own tiktok_settings"
ON public.tiktok_settings
FOR SELECT
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own tiktok_settings" ON public.tiktok_settings;
CREATE POLICY "Users can insert own tiktok_settings"
ON public.tiktok_settings
FOR INSERT
WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own tiktok_settings" ON public.tiktok_settings;
CREATE POLICY "Users can update own tiktok_settings"
ON public.tiktok_settings
FOR UPDATE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own tiktok_settings" ON public.tiktok_settings;
CREATE POLICY "Users can delete own tiktok_settings"
ON public.tiktok_settings
FOR DELETE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- product_costs
DROP POLICY IF EXISTS "Users can view own product_costs" ON public.product_costs;
CREATE POLICY "Users can view own product_costs"
ON public.product_costs
FOR SELECT
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own product_costs" ON public.product_costs;
CREATE POLICY "Users can insert own product_costs"
ON public.product_costs
FOR INSERT
WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own product_costs" ON public.product_costs;
CREATE POLICY "Users can update own product_costs"
ON public.product_costs
FOR UPDATE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own product_costs" ON public.product_costs;
CREATE POLICY "Users can delete own product_costs"
ON public.product_costs
FOR DELETE
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- =============================================
-- 6. Add trigger for updated_at on companies
-- =============================================

CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();