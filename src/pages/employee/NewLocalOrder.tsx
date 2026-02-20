import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, ShoppingBag, Loader2, CreditCard, CheckCircle, ArrowRight, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProducts } from '@/hooks/useProducts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface LocalOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'product';
}

interface PendingLocalOrder {
  id: string;
  tableNumber: string;
  customerName: string;
  items: LocalOrderItem[];
  total: number;
  createdAt: Date;
  status: string;
}

const NewLocalOrder: React.FC = () => {
  const { products, loading } = useProducts();
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<LocalOrderItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<PendingLocalOrder[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [paymentOrder, setPaymentOrder] = useState<PendingLocalOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash' | 'card'>('cash');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');

  // Fetch local orders that are pending/confirmed (not yet paid/delivered)
  const fetchPendingLocalOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_type', 'local')
      .in('status', ['CONFIRMED', 'PREPARING', 'READY'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPendingOrders(data.map(o => ({
        id: o.id,
        tableNumber: o.table_number || '',
        customerName: o.customer_name,
        items: (o.items as any[]) || [],
        total: Number(o.total),
        createdAt: new Date(o.created_at),
        status: o.status,
      })));
    }
    setLoadingPending(false);
  };

  useEffect(() => {
    fetchPendingLocalOrders();
    const channel = supabase
      .channel('employee-local-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchPendingLocalOrders)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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
    setItems(prev => prev
      .map(i => i.id === id ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleSubmit = async () => {
    if (!tableNumber.trim()) { toast.error('Informe o número da mesa'); return; }
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
        customer_name: customerName.trim() || `Mesa ${tableNumber}`,
        customer_phone: '',
        customer_address: `Mesa ${tableNumber}`,
        items: orderItems as any,
        payment_method: 'cash' as any, // will be updated at payment time
        total,
        status: 'CONFIRMED',
        order_type: 'local' as any,
        table_number: tableNumber,
      });

      if (error) throw error;

      toast.success(`✅ Pedido da Mesa ${tableNumber} registrado!`);
      setItems([]);
      setTableNumber('');
      setCustomerName('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishPayment = async () => {
    if (!paymentOrder) return;
    setProcessingPayment(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'DELIVERED', payment_method: paymentMethod as any })
        .eq('id', paymentOrder.id);

      if (error) throw error;

      toast.success(`🎉 Mesa ${paymentOrder.tableNumber} — Pagamento finalizado!`);
      setPaymentOrder(null);
    } catch {
      toast.error('Erro ao finalizar pagamento');
    } finally {
      setProcessingPayment(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.available &&
    (p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
     p.category.toLowerCase().includes(searchProduct.toLowerCase()))
  );

  const statusLabels: Record<string, { label: string; color: string }> = {
    CONFIRMED: { label: 'Confirmado', color: 'bg-blue-500' },
    PREPARING: { label: 'Preparando', color: 'bg-orange-500' },
    READY: { label: 'Pronto', color: 'bg-green-500' },
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="novo">
        <TabsList className="w-full">
          <TabsTrigger value="novo" className="flex-1">
            <Plus className="w-4 h-4 mr-2" /> Novo Pedido
          </TabsTrigger>
          <TabsTrigger value="mesas" className="flex-1">
            <Clock className="w-4 h-4 mr-2" /> Mesas Abertas
            {pendingOrders.length > 0 && (
              <Badge className="ml-2 bg-destructive text-destructive-foreground text-[10px] h-4 px-1">
                {pendingOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* === TAB: NOVO PEDIDO === */}
        <TabsContent value="novo" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mesa *</Label>
              <Input
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Nº da mesa"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Nome do Cliente</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Opcional"
                className="mt-1"
              />
            </div>
          </div>

          {/* Products */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cardápio</CardTitle>
              <Input
                placeholder="Buscar produto..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="h-8 text-sm"
              />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredProducts.map(product => (
                  <Button
                    key={product.id}
                    variant="outline"
                    className="h-auto py-2 px-3 text-left flex-col items-start"
                    onClick={() => addProduct({ id: product.id, name: product.name, price: product.price })}
                  >
                    <span className="text-xs font-medium truncate w-full">{product.name}</span>
                    <span className="text-xs text-primary font-bold">R$ {product.price.toFixed(2)}</span>
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
                      <p className="text-xs text-muted-foreground">
                        R$ {item.price.toFixed(2)} × {item.quantity} = <span className="font-bold text-foreground">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="font-bold text-lg">Total: R$ {total.toFixed(2)}</span>
                  <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Registrar Pedido
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* === TAB: MESAS ABERTAS === */}
        <TabsContent value="mesas" className="mt-4 space-y-3">
          {loadingPending ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : pendingOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-secondary" />
                <p className="text-muted-foreground">Nenhuma mesa aberta</p>
              </CardContent>
            </Card>
          ) : (
            pendingOrders.map(order => {
              const statusInfo = statusLabels[order.status] || { label: order.status, color: 'bg-gray-500' };
              return (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-lg">Mesa {order.tableNumber}</span>
                          <Badge className={`${statusInfo.color} text-white text-xs`}>{statusInfo.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {' · '}{order.items.length} itens
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary text-xl">R$ {order.total.toFixed(2)}</p>
                        <Button
                          size="sm"
                          className="mt-2 gap-1"
                          onClick={() => { setPaymentOrder(order); setPaymentMethod('cash'); }}
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Pagar
                        </Button>
                      </div>
                    </div>
                    {/* Items preview */}
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {order.items.slice(0, 3).map((item: any, idx: number) => (
                        <p key={idx} className="text-xs text-muted-foreground">
                          {item.quantity}× {item.product?.name || item.name}
                        </p>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{order.items.length - 3} mais...</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={!!paymentOrder} onOpenChange={(open) => !open && setPaymentOrder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pagamento — Mesa {paymentOrder?.tableNumber}</DialogTitle>
          </DialogHeader>

          {paymentOrder && (
            <div className="space-y-4">
              {/* Items summary */}
              <div className="bg-muted/40 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                {paymentOrder.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.quantity}× {item.product?.name || item.name}</span>
                    <span className="font-medium">R$ {((item.unitPrice || item.price) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center font-bold text-lg border-t pt-3">
                <span>Total</span>
                <span className="text-primary">R$ {paymentOrder.total.toFixed(2)}</span>
              </div>

              <div>
                <Label className="mb-2 block">Forma de Pagamento</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'cash', label: '💵 Dinheiro' },
                    { value: 'card', label: '💳 Cartão' },
                    { value: 'pix', label: '📱 PIX' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPaymentMethod(opt.value as any)}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        paymentMethod === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleFinishPayment}
                disabled={processingPayment}
              >
                {processingPayment
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle className="w-4 h-4" />
                }
                Finalizar & Fechar Mesa
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewLocalOrder;
