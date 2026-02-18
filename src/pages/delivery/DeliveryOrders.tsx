import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Clock, CheckCircle, Truck, Loader2, Navigation } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const DeliveryOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_type', 'delivery')
      .in('status', ['CONFIRMED', 'PREPARING', 'READY'])
      .order('created_at', { ascending: false });

    if (!error && data) setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('delivery-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const markDelivered = async (id: string) => {
    const { error } = await supabase.from('orders').update({ status: 'DELIVERED' }).eq('id', id);
    if (error) { toast.error('Erro ao marcar como entregue'); return; }
    toast.success('Pedido marcado como entregue!');
  };

  const openMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const number = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
    window.open(`https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(`Olá ${name}, sou o entregador da Pizzaria. Estou a caminho!`)}`, '_blank');
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold flex items-center gap-2">
        <Truck className="w-5 h-5" /> Entregas Pendentes
      </h1>

      {orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold">{order.id.substring(0, 8).toUpperCase()}</span>
                    <Badge className={`ml-2 ${order.status === 'READY' ? 'bg-green-500' : 'bg-orange-500'} text-white`}>
                      {order.status === 'READY' ? 'Pronto p/ Entrega' : order.status === 'PREPARING' ? 'Preparando' : 'Confirmado'}
                    </Badge>
                  </div>
                  <span className="font-bold text-primary">R$ {Number(order.total).toFixed(2)}</span>
                </div>

                <div className="space-y-1 text-sm">
                  <p className="font-medium">{order.customer_name}</p>
                  <div className="flex items-start gap-1 text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{order.customer_address}{order.customer_complement ? ` — ${order.customer_complement}` : ''}</span>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => openMaps(order.customer_address)}>
                    <Navigation className="w-3 h-3" /> Abrir Mapa
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => openWhatsApp(order.customer_phone, order.customer_name)}>
                    <Phone className="w-3 h-3" /> WhatsApp
                  </Button>
                  {order.status === 'READY' && (
                    <Button size="sm" className="gap-1" onClick={() => markDelivered(order.id)}>
                      <CheckCircle className="w-3 h-3" /> Marcar Entregue
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma entrega pendente</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeliveryOrders;
