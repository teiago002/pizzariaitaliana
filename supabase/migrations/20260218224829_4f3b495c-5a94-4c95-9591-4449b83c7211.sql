
-- Add order_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
    CREATE TYPE public.order_type AS ENUM ('delivery', 'local');
  END IF;
END$$;

-- Add new columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type public.order_type NOT NULL DEFAULT 'delivery';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_by uuid;

-- Operating hours table
CREATE TABLE IF NOT EXISTS public.operating_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time time NOT NULL DEFAULT '18:00',
  close_time time NOT NULL DEFAULT '23:00',
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(day_of_week)
);

ALTER TABLE public.operating_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view operating hours"
  ON public.operating_hours FOR SELECT USING (true);

CREATE POLICY "Admins can manage operating hours"
  ON public.operating_hours FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default operating hours
INSERT INTO public.operating_hours (day_of_week, open_time, close_time, is_open) VALUES
  (0, '18:00', '23:00', true),
  (1, '18:00', '23:00', false),
  (2, '18:00', '23:00', true),
  (3, '18:00', '23:00', true),
  (4, '18:00', '23:00', true),
  (5, '18:00', '23:00', true),
  (6, '18:00', '23:00', true)
ON CONFLICT (day_of_week) DO NOTHING;

-- Special closures table
CREATE TABLE IF NOT EXISTS public.special_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(closure_date)
);

ALTER TABLE public.special_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view special closures"
  ON public.special_closures FOR SELECT USING (true);

CREATE POLICY "Admins can manage special closures"
  ON public.special_closures FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Employee order policies
CREATE POLICY "Employees can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'employee'));

CREATE POLICY "Employees can view orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'employee'));

CREATE POLICY "Employees can update orders"
  ON public.orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'employee'));

-- Delivery order policies
CREATE POLICY "Delivery can view delivery orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'delivery') AND order_type = 'delivery');

CREATE POLICY "Delivery can update delivery orders"
  ON public.orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'delivery') AND order_type = 'delivery');
