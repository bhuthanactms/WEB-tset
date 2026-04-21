-- Enable RLS on customer-related tables exposed to PostgREST.
-- Policies: authenticated users (JWT) may read/write all rows.
-- Anonymous API clients get no policies → denied.
-- service_role and direct DB connections as table owner still bypass RLS unless FORCE RLS is set.

-- customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_authenticated_select"
  ON public.customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "customers_authenticated_insert"
  ON public.customers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "customers_authenticated_update"
  ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "customers_authenticated_delete"
  ON public.customers FOR DELETE TO authenticated USING (true);

-- customer_homes
ALTER TABLE public.customer_homes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_homes_authenticated_select"
  ON public.customer_homes FOR SELECT TO authenticated USING (true);

CREATE POLICY "customer_homes_authenticated_insert"
  ON public.customer_homes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "customer_homes_authenticated_update"
  ON public.customer_homes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "customer_homes_authenticated_delete"
  ON public.customer_homes FOR DELETE TO authenticated USING (true);

-- customer_station_accessories
ALTER TABLE public.customer_station_accessories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_station_accessories_authenticated_select"
  ON public.customer_station_accessories FOR SELECT TO authenticated USING (true);

CREATE POLICY "customer_station_accessories_authenticated_insert"
  ON public.customer_station_accessories FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "customer_station_accessories_authenticated_update"
  ON public.customer_station_accessories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "customer_station_accessories_authenticated_delete"
  ON public.customer_station_accessories FOR DELETE TO authenticated USING (true);

-- customer_histories
ALTER TABLE public.customer_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_histories_authenticated_select"
  ON public.customer_histories FOR SELECT TO authenticated USING (true);

CREATE POLICY "customer_histories_authenticated_insert"
  ON public.customer_histories FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "customer_histories_authenticated_update"
  ON public.customer_histories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "customer_histories_authenticated_delete"
  ON public.customer_histories FOR DELETE TO authenticated USING (true);
