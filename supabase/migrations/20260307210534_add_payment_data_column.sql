-- Adiciona a coluna payment_data se não existir
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_data JSONB;

-- Remove a constraint antiga se existir
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- Notifica a API para recarregar
NOTIFY pgrst, 'reload schema';