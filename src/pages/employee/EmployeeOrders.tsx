import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Truck, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, CartItemPizza } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-500', icon: Clock },
  CONFIRMED: { label: 'Confirmado', color: 'bg-blue-500', icon: CheckCircle },
  PREPARING: { label: 'Preparando', color: 'bg-orange-500', icon: Clock },
  READY: { label: 'Pronto', color: 'bg-green-500', icon: CheckCircle },
  DELIVERED: { label: 'Entregue', color: 'bg-gray-500', icon: Truck },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-500', icon: XCircle },
};

const EmployeeOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('employee-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status: status as any }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    toast.success('Status atualizado');
  };

  const activeOrders = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const localOrders = activeOrders.filter(o => o.order_type === 'local');
  const deliveryOrders = activeOrders.filter(o => o.order_type === 'delivery');

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const OrderList = ({ list }: { list: any[] }) => (
    list.length > 0 ? (
      <div className="space-y-3">
        {list.map((order) => {
          const status = statusConfig[order.status as OrderStatus];
          const StatusIcon = status?.icon || Clock;
          const items = order.items as any[];
          return (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold">{order.id.substring(0, 8).toUpperCase()}</span>
                      <Badge className={`${status?.color} text-white`}><StatusIcon className="w-3 h-3 mr-1" />{status?.label}</Badge>
                      {order.table_number && <Badge variant="outline">Mesa {order.table_number}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{order.customer_name} • {items?.length || 0} itens</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">R$ {Number(order.total).toFixed(2)}</span>
                    <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                        <SelectItem value="PREPARING">Preparando</SelectItem>
                        <SelectItem value="READY">Pronto</SelectItem>
                        <SelectItem value="DELIVERED">Entregue</SelectItem>
                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    ) : (
      <p className="text-center text-muted-foreground py-8">Nenhum pedido ativo</p>
    )
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Pedidos Ativos</h1>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todos ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="local">Local ({localOrders.length})</TabsTrigger>
          <TabsTrigger value="delivery">Delivery ({deliveryOrders.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><OrderList list={activeOrders} /></TabsContent>
        <TabsContent value="local"><OrderList list={localOrders} /></TabsContent>
        <TabsContent value="delivery"><OrderList list={deliveryOrders} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeOrders;
