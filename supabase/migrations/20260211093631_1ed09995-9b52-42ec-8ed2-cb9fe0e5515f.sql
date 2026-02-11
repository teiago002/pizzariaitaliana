
-- Drop all RESTRICTIVE policies on orders and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view their order by id" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can view their order by id" 
ON public.orders 
FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can update orders" 
ON public.orders 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete orders" 
ON public.orders 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also fix other tables that have RESTRICTIVE policies causing issues
DROP POLICY IF EXISTS "Anyone can view settings" ON public.pizzeria_settings;
CREATE POLICY "Anyone can view settings" 
ON public.pizzeria_settings 
FOR SELECT 
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view flavors" ON public.pizza_flavors;
CREATE POLICY "Anyone can view flavors" 
ON public.pizza_flavors 
FOR SELECT 
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view borders" ON public.pizza_borders;
CREATE POLICY "Anyone can view borders" 
ON public.pizza_borders 
FOR SELECT 
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view categories" ON public.pizza_categories;
CREATE POLICY "Anyone can view categories" 
ON public.pizza_categories 
FOR SELECT 
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" 
ON public.products 
FOR SELECT 
TO anon, authenticated
USING (true);
