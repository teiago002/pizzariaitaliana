-- Create enum types
-- CREATE TYPE public.pizza_size AS ENUM ('P', 'M', 'G', 'GG');
--CREATE TYPE public.payment_method AS ENUM ('pix', 'cash', 'card');
--CREATE TYPE public.order_status AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');
--CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create pizzeria settings table
CREATE TABLE public.pizzeria_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Pizzaria Italiana',
    logo_url TEXT,
    is_open BOOLEAN NOT NULL DEFAULT true,
    whatsapp TEXT NOT NULL DEFAULT '(89) 98134-7052',
    address TEXT NOT NULL DEFAULT 'Av. Manoel Bezerra | Nº 189 | Centro',
    primary_color TEXT NOT NULL DEFAULT '#C41E3A',
    secondary_color TEXT NOT NULL DEFAULT '#228B22',
    accent_color TEXT NOT NULL DEFAULT '#FFFFFF',
    pix_key TEXT,
    pix_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pizza flavors table
CREATE TABLE public.pizza_flavors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    ingredients TEXT[] DEFAULT '{}',
    image_url TEXT,
    price_p DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_m DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_g DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_gg DECIMAL(10,2) NOT NULL DEFAULT 0,
    available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pizza borders table
CREATE TABLE public.pizza_borders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table (drinks, etc)
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL DEFAULT 'Bebidas',
    image_url TEXT,
    available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    customer_complement TEXT,
    items JSONB NOT NULL,
    payment_method payment_method NOT NULL,
    needs_change BOOLEAN DEFAULT false,
    change_for DECIMAL(10,2),
    total DECIMAL(10,2) NOT NULL,
    status order_status NOT NULL DEFAULT 'PENDING',
    pix_transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles table for admin authentication
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Create profiles table for admin users
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.pizzeria_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pizza_flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pizza_borders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for pizzeria_settings (public read, admin write)
CREATE POLICY "Anyone can view settings" ON public.pizzeria_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update settings" ON public.pizzeria_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert settings" ON public.pizzeria_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for pizza_flavors (public read, admin write)
CREATE POLICY "Anyone can view flavors" ON public.pizza_flavors FOR SELECT USING (true);
CREATE POLICY "Admins can manage flavors" ON public.pizza_flavors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for pizza_borders (public read, admin write)
CREATE POLICY "Anyone can view borders" ON public.pizza_borders FOR SELECT USING (true);
CREATE POLICY "Admins can manage borders" ON public.pizza_borders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for products (public read, admin write)
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for orders (public insert, admin read/update)
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view their order by id" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Storage policies for product images
CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Authenticated users can upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Authenticated users can update product images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images');
CREATE POLICY "Authenticated users can delete product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_pizzeria_settings_updated_at BEFORE UPDATE ON public.pizzeria_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pizza_flavors_updated_at BEFORE UPDATE ON public.pizza_flavors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.pizzeria_settings (name, whatsapp, address, primary_color, secondary_color, accent_color)
VALUES ('Pizzaria Italiana', '(89) 98134-7052', 'Av. Manoel Bezerra | Nº 189 | Centro', '#C41E3A', '#228B22', '#FFFFFF');

-- Insert default pizza flavors
INSERT INTO public.pizza_flavors (name, description, ingredients, price_p, price_m, price_g, price_gg) VALUES
('Margherita', 'A clássica italiana com molho de tomate fresco', ARRAY['Molho de tomate', 'Mozzarella', 'Manjericão fresco', 'Azeite'], 25.00, 35.00, 45.00, 55.00),
('Pepperoni', 'Coberta com fatias generosas de pepperoni', ARRAY['Molho de tomate', 'Mozzarella', 'Pepperoni'], 28.00, 38.00, 48.00, 58.00),
('Quattro Formaggi', 'Combinação perfeita de quatro queijos', ARRAY['Mozzarella', 'Gorgonzola', 'Parmesão', 'Provolone'], 32.00, 42.00, 52.00, 62.00),
('Portuguesa', 'Tradicional sabor brasileiro', ARRAY['Molho de tomate', 'Mozzarella', 'Presunto', 'Ovos', 'Cebola', 'Azeitonas'], 30.00, 40.00, 50.00, 60.00);

-- Insert default borders
INSERT INTO public.pizza_borders (name, price) VALUES
('Sem Borda', 0),
('Catupiry', 8.00),
('Cheddar', 8.00),
('Cream Cheese', 10.00);

-- Insert default products (drinks)
INSERT INTO public.products (name, description, price, category) VALUES
('Coca-Cola 2L', 'Refrigerante Coca-Cola 2 litros', 12.00, 'Bebidas'),
('Guaraná Antarctica 2L', 'Refrigerante Guaraná 2 litros', 10.00, 'Bebidas'),
('Água Mineral 500ml', 'Água mineral sem gás', 4.00, 'Bebidas'),
('Suco Natural 500ml', 'Suco de laranja natural', 8.00, 'Bebidas');

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;