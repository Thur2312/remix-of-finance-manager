-- Create table for product costs with history
CREATE TABLE public.product_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sku TEXT NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_product_costs_user_sku ON public.product_costs(user_id, sku);
CREATE INDEX idx_product_costs_effective_from ON public.product_costs(user_id, sku, effective_from DESC);

-- Enable Row Level Security
ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own product costs"
ON public.product_costs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own product costs"
ON public.product_costs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own product costs"
ON public.product_costs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own product costs"
ON public.product_costs
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_product_costs_updated_at
BEFORE UPDATE ON public.product_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();