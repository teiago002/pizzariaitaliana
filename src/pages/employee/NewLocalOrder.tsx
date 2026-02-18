import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Trash2, ShoppingBag, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProducts } from '@/hooks/useProducts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface LocalOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'product';
}

const NewLocalOrder: React.FC = () => {
  const navigate = useNavigate();
  const { products, flavors, loading } = useProducts();
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<LocalOrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash' | 'card'>('cash');
  const [submitting, setSubmitting] = useState(false);

  const addProduct = (product: { id: string; name: string; price: number }) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1, type: 'product' as const }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const newQty = i.quantity + delta;
      return newQty > 0 ? { ...i, quantity: newQty } : i;
    }).filter(i => i.quantity > 0));
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleSubmit = async () => {
    if (!tableNumber) { toast.error('Informe o número da mesa'); return; }
    if (items.length === 0) { toast.error('Adicione pelo menos um item'); return; }

    setSubmitting(true);
    try {
      const orderItems = items.map(i => ({
        type: 'product',
        id: i.id,
        product: { id: i.id, name: i.name, price: i.price, description: '', category: '', available: true },
        quantity: i.quantity,
        unitPrice: i.price,
      }));

      const { error } = await supabase.from('orders').insert({
        customer_name: customerName || `Mesa ${tableNumber}`,
        customer_phone: '',
        customer_address: `Mesa ${tableNumber}`,
        items: orderItems as any,
        payment_method: paymentMethod,
        total,
        status: 'CONFIRMED',
        order_type: 'local' as any,
        table_number: tableNumber,
      });

      if (error) throw error;

      toast.success(`Pedido da Mesa ${tableNumber} criado!`);
      setItems([]);
      setTableNumber('');
      setCustomerName('');
    } catch (error) {
      console.error('Error creating local order:', error);
      toast.error('Erro ao criar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Novo Pedido Local</h1>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Mesa *</Label>
          <Input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="Nº da mesa" className="mt-1" />
        </div>
        <div>
          <Label>Nome do Cliente</Label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Opcional" className="mt-1" />
        </div>
      </div>

      {/* Products list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Produtos Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {products.filter(p => p.available).map(product => (
              <Button
                key={product.id}
                variant="outline"
                className="h-auto py-2 px-3 text-left flex-col items-start"
                onClick={() => addProduct({ id: product.id, name: product.name, price: product.price })}
              >
                <span className="text-xs font-medium truncate w-full">{product.name}</span>
                <span className="text-xs text-primary">R$ {product.price.toFixed(2)}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Order items */}
      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Itens do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">R$ {item.price.toFixed(2)} x {item.quantity}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <Label>Pagamento</Label>
              <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <span className="font-bold text-lg">Total: R$ {total.toFixed(2)}</span>
              <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                Criar Pedido
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NewLocalOrder;
