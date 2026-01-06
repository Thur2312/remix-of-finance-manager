CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: cash_flow_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_flow_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    color text DEFAULT '#6B7280'::text NOT NULL,
    icon text DEFAULT 'circle'::text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cash_flow_categories_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])))
);


--
-- Name: cash_flow_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_flow_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category_id uuid,
    description text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    type text NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    due_date date,
    is_recurring boolean DEFAULT false NOT NULL,
    recurrence_type text,
    recurrence_end_date date,
    parent_entry_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cash_flow_entries_recurrence_type_check CHECK ((recurrence_type = ANY (ARRAY['weekly'::text, 'monthly'::text, 'yearly'::text]))),
    CONSTRAINT cash_flow_entries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'received'::text]))),
    CONSTRAINT cash_flow_entries_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])))
);


--
-- Name: fixed_costs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fixed_costs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category text NOT NULL,
    name text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    is_recurring boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fixed_costs_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fixed_costs_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    monthly_orders integer DEFAULT 100,
    monthly_products_sold integer DEFAULT 100,
    monthly_revenue numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: raw_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_id text NOT NULL,
    sku text,
    nome_produto text,
    variacao text,
    quantidade integer DEFAULT 1,
    total_faturado numeric(12,2) DEFAULT 0,
    rebate_shopee numeric(12,2) DEFAULT 0,
    custo_unitario numeric(12,2) DEFAULT 0,
    data_pedido timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text DEFAULT 'Padrão Shopee'::text NOT NULL,
    taxa_comissao_shopee numeric(5,4) DEFAULT 0.20,
    adicional_por_item numeric(10,2) DEFAULT 0,
    percentual_valor_antecipado numeric(5,4) DEFAULT 0,
    taxa_antecipacao numeric(5,4) DEFAULT 0,
    imposto_nf_saida numeric(5,4) DEFAULT 0,
    percentual_nf_entrada numeric(5,4) DEFAULT 0,
    desconto_nf_saida numeric(5,4) DEFAULT 0,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    gasto_shopee_ads numeric DEFAULT 0
);


--
-- Name: tiktok_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tiktok_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_id text NOT NULL,
    sku text,
    nome_produto text,
    variacao text,
    quantidade integer DEFAULT 1,
    total_faturado numeric DEFAULT 0,
    desconto_plataforma numeric DEFAULT 0,
    desconto_vendedor numeric DEFAULT 0,
    custo_unitario numeric DEFAULT 0,
    data_pedido timestamp with time zone,
    status_pedido text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tiktok_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tiktok_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text DEFAULT 'Padrão TikTok Shop'::text NOT NULL,
    taxa_comissao_tiktok numeric DEFAULT 0.20,
    taxa_afiliado numeric DEFAULT 0,
    adicional_por_item numeric DEFAULT 0,
    percentual_valor_antecipado numeric DEFAULT 0,
    taxa_antecipacao numeric DEFAULT 0,
    imposto_nf_saida numeric DEFAULT 0,
    percentual_nf_entrada numeric DEFAULT 0,
    desconto_nf_saida numeric DEFAULT 0,
    gasto_tiktok_ads numeric DEFAULT 0,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tiktok_settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tiktok_settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    statement_date date,
    statement_id text,
    payment_id text,
    status text,
    order_id text,
    sku_id text,
    quantidade integer DEFAULT 1,
    nome_produto text,
    variacao text,
    data_criacao_pedido timestamp with time zone,
    data_entrega timestamp with time zone,
    total_settlement_amount numeric DEFAULT 0,
    net_sales numeric DEFAULT 0,
    subtotal_before_discounts numeric DEFAULT 0,
    refund_subtotal numeric DEFAULT 0,
    seller_discounts numeric DEFAULT 0,
    refund_seller_discounts numeric DEFAULT 0,
    platform_discounts numeric DEFAULT 0,
    tiktok_shipping_fee numeric DEFAULT 0,
    customer_shipping_fee numeric DEFAULT 0,
    refunded_shipping numeric DEFAULT 0,
    shipping_incentive numeric DEFAULT 0,
    total_fees numeric DEFAULT 0,
    tiktok_commission_fee numeric DEFAULT 0,
    affiliate_commission numeric DEFAULT 0,
    sfp_service_fee numeric DEFAULT 0,
    adjustment_amount numeric DEFAULT 0,
    adjustment_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    type text,
    customer_payment numeric DEFAULT 0,
    customer_refund numeric DEFAULT 0,
    delivery_option text,
    collection_method text,
    icms_difal numeric DEFAULT 0,
    live_specials_fee numeric DEFAULT 0,
    voucher_xtra_fee numeric DEFAULT 0,
    fee_per_item numeric DEFAULT 0,
    seller_cofunded_discount numeric DEFAULT 0,
    platform_cofunded_discount numeric DEFAULT 0,
    related_order_id text,
    chargeable_weight numeric DEFAULT 0,
    shipping_total numeric DEFAULT 0,
    shipping_incentive_refund numeric DEFAULT 0,
    shipping_subsidy numeric DEFAULT 0,
    actual_return_shipping_fee numeric DEFAULT 0,
    seller_cofunded_discount_refund numeric DEFAULT 0,
    platform_discounts_refund numeric DEFAULT 0,
    bonus_cashback_fee numeric DEFAULT 0,
    icms_penalty numeric DEFAULT 0,
    affiliate_partner_commission numeric DEFAULT 0,
    affiliate_shop_ads_commission numeric DEFAULT 0,
    currency text DEFAULT 'BRL'::text
);


--
-- Name: tiktok_statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tiktok_statements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    statement_id text NOT NULL,
    statement_date date,
    payment_id text,
    status text,
    currency text DEFAULT 'BRL'::text,
    total_settlement_amount numeric DEFAULT 0,
    net_sales numeric DEFAULT 0,
    fees_total numeric DEFAULT 0,
    shipping_total numeric DEFAULT 0,
    adjustments numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: cash_flow_categories cash_flow_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_flow_categories
    ADD CONSTRAINT cash_flow_categories_pkey PRIMARY KEY (id);


--
-- Name: cash_flow_entries cash_flow_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_flow_entries
    ADD CONSTRAINT cash_flow_entries_pkey PRIMARY KEY (id);


--
-- Name: fixed_costs fixed_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_costs
    ADD CONSTRAINT fixed_costs_pkey PRIMARY KEY (id);


--
-- Name: fixed_costs_settings fixed_costs_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_costs_settings
    ADD CONSTRAINT fixed_costs_settings_pkey PRIMARY KEY (id);


--
-- Name: fixed_costs_settings fixed_costs_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_costs_settings
    ADD CONSTRAINT fixed_costs_settings_user_id_key UNIQUE (user_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: raw_orders raw_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_orders
    ADD CONSTRAINT raw_orders_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: tiktok_orders tiktok_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiktok_orders
    ADD CONSTRAINT tiktok_orders_pkey PRIMARY KEY (id);


--
-- Name: tiktok_settings tiktok_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiktok_settings
    ADD CONSTRAINT tiktok_settings_pkey PRIMARY KEY (id);


--
-- Name: tiktok_settlements tiktok_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiktok_settlements
    ADD CONSTRAINT tiktok_settlements_pkey PRIMARY KEY (id);


--
-- Name: tiktok_settlements tiktok_settlements_user_order_sku_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiktok_settlements
    ADD CONSTRAINT tiktok_settlements_user_order_sku_unique UNIQUE (user_id, order_id, sku_id);


--
-- Name: tiktok_statements tiktok_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiktok_statements
    ADD CONSTRAINT tiktok_statements_pkey PRIMARY KEY (id);


--
-- Name: tiktok_statements tiktok_statements_user_id_statement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiktok_statements
    ADD CONSTRAINT tiktok_statements_user_id_statement_id_key UNIQUE (user_id, statement_id);


--
-- Name: idx_cash_flow_categories_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_flow_categories_user ON public.cash_flow_categories USING btree (user_id);


--
-- Name: idx_cash_flow_entries_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_flow_entries_user_date ON public.cash_flow_entries USING btree (user_id, date);


--
-- Name: idx_cash_flow_entries_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_flow_entries_user_status ON public.cash_flow_entries USING btree (user_id, status);


--
-- Name: idx_tiktok_statements_user_statement; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_tiktok_statements_user_statement ON public.tiktok_statements USING btree (user_id, statement_id);


--
-- Name: cash_flow_categories update_cash_flow_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cash_flow_categories_updated_at BEFORE UPDATE ON public.cash_flow_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cash_flow_entries update_cash_flow_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cash_flow_entries_updated_at BEFORE UPDATE ON public.cash_flow_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fixed_costs_settings update_fixed_costs_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_fixed_costs_settings_updated_at BEFORE UPDATE ON public.fixed_costs_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fixed_costs update_fixed_costs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_fixed_costs_updated_at BEFORE UPDATE ON public.fixed_costs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: raw_orders update_raw_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_raw_orders_updated_at BEFORE UPDATE ON public.raw_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: settings update_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tiktok_orders update_tiktok_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tiktok_orders_updated_at BEFORE UPDATE ON public.tiktok_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tiktok_settings update_tiktok_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tiktok_settings_updated_at BEFORE UPDATE ON public.tiktok_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tiktok_settlements update_tiktok_settlements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tiktok_settlements_updated_at BEFORE UPDATE ON public.tiktok_settlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tiktok_statements update_tiktok_statements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tiktok_statements_updated_at BEFORE UPDATE ON public.tiktok_statements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cash_flow_entries cash_flow_entries_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_flow_entries
    ADD CONSTRAINT cash_flow_entries_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.cash_flow_categories(id) ON DELETE SET NULL;


--
-- Name: cash_flow_entries cash_flow_entries_parent_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_flow_entries
    ADD CONSTRAINT cash_flow_entries_parent_entry_id_fkey FOREIGN KEY (parent_entry_id) REFERENCES public.cash_flow_entries(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: raw_orders raw_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_orders
    ADD CONSTRAINT raw_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: settings settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: cash_flow_categories Users can delete own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own categories" ON public.cash_flow_categories FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: cash_flow_entries Users can delete own entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own entries" ON public.cash_flow_entries FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: fixed_costs Users can delete own fixed costs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own fixed costs" ON public.fixed_costs FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: fixed_costs_settings Users can delete own fixed costs settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own fixed costs settings" ON public.fixed_costs_settings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: raw_orders Users can delete own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own orders" ON public.raw_orders FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: settings Users can delete own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own settings" ON public.settings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: tiktok_orders Users can delete own tiktok orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own tiktok orders" ON public.tiktok_orders FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: tiktok_settings Users can delete own tiktok settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own tiktok settings" ON public.tiktok_settings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: tiktok_settlements Users can delete own tiktok settlements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own tiktok settlements" ON public.tiktok_settlements FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: tiktok_statements Users can delete own tiktok statements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own tiktok statements" ON public.tiktok_statements FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: cash_flow_categories Users can insert own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own categories" ON public.cash_flow_categories FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: cash_flow_entries Users can insert own entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own entries" ON public.cash_flow_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: fixed_costs Users can insert own fixed costs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own fixed costs" ON public.fixed_costs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: fixed_costs_settings Users can insert own fixed costs settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own fixed costs settings" ON public.fixed_costs_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: raw_orders Users can insert own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own orders" ON public.raw_orders FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: settings Users can insert own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own settings" ON public.settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: tiktok_orders Users can insert own tiktok orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own tiktok orders" ON public.tiktok_orders FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: tiktok_settings Users can insert own tiktok settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own tiktok settings" ON public.tiktok_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: tiktok_settlements Users can insert own tiktok settlements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own tiktok settlements" ON public.tiktok_settlements FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: tiktok_statements Users can insert own tiktok statements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own tiktok statements" ON public.tiktok_statements FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: cash_flow_categories Users can update own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own categories" ON public.cash_flow_categories FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: cash_flow_entries Users can update own entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own entries" ON public.cash_flow_entries FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: fixed_costs Users can update own fixed costs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own fixed costs" ON public.fixed_costs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: fixed_costs_settings Users can update own fixed costs settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own fixed costs settings" ON public.fixed_costs_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: raw_orders Users can update own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own orders" ON public.raw_orders FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: settings Users can update own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own settings" ON public.settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: tiktok_orders Users can update own tiktok orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own tiktok orders" ON public.tiktok_orders FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: tiktok_settings Users can update own tiktok settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own tiktok settings" ON public.tiktok_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: tiktok_settlements Users can update own tiktok settlements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own tiktok settlements" ON public.tiktok_settlements FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: tiktok_statements Users can update own tiktok statements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own tiktok statements" ON public.tiktok_statements FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: cash_flow_categories Users can view own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own categories" ON public.cash_flow_categories FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: cash_flow_entries Users can view own entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own entries" ON public.cash_flow_entries FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: fixed_costs Users can view own fixed costs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own fixed costs" ON public.fixed_costs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: fixed_costs_settings Users can view own fixed costs settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own fixed costs settings" ON public.fixed_costs_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: raw_orders Users can view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own orders" ON public.raw_orders FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: settings Users can view own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own settings" ON public.settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: tiktok_orders Users can view own tiktok orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own tiktok orders" ON public.tiktok_orders FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: tiktok_settings Users can view own tiktok settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own tiktok settings" ON public.tiktok_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: tiktok_settlements Users can view own tiktok settlements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own tiktok settlements" ON public.tiktok_settlements FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: tiktok_statements Users can view own tiktok statements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own tiktok statements" ON public.tiktok_statements FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: cash_flow_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cash_flow_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: cash_flow_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cash_flow_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: fixed_costs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;

--
-- Name: fixed_costs_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fixed_costs_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: raw_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.raw_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- Name: tiktok_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tiktok_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: tiktok_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tiktok_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: tiktok_settlements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tiktok_settlements ENABLE ROW LEVEL SECURITY;

--
-- Name: tiktok_statements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tiktok_statements ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;