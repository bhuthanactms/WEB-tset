-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id SERIAL PRIMARY KEY,
  customer_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT customers_customer_code_key UNIQUE (customer_code)
);

CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON public.customers (customer_code);

-- Create customer_histories table
CREATE TABLE IF NOT EXISTS public.customer_histories (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  customer_code TEXT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('home', 'station-accessory', 'combined')),
  data JSONB NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_histories_customer_code ON public.customer_histories (customer_code);
CREATE INDEX IF NOT EXISTS idx_customer_histories_saved_at ON public.customer_histories (saved_at DESC);
