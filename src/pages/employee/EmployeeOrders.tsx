import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Truck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { OrderStatus } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();

  const fetchOrders = async () => {
    // Only show local orders created by this employee
    let query = supabase
      .from('orders')
      .select('*')
      .eq('order_type', 'local')
      .order('created_at', { ascending: false });

    if (user?.id) {
      query = query.eq('created_by', user.id);
    }

    const { data, error } = await query;
    if (!error && data) setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
      const channel = supabase
        .channel('employee-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status: status as any }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    toast.success('Status atualizado');
  };

  const activeOrders = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const finishedOrders = orders.filter(o => ['DELIVERED', 'CANCELLED'].includes(o.status));

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
                    {!['DELIVERED', 'CANCELLED'].includes(order.status) && (
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
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    ) : (
      <p className="text-center text-muted-foreground py-8">Nenhum pedido</p>
    )
  );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-bold">Meus Pedidos Locais</h1>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Ativos ({activeOrders.length})
        </h2>
        <OrderList list={activeOrders} />
      </div>

      {finishedOrders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Finalizados ({finishedOrders.length})
          </h2>
          <OrderList list={finishedOrders} />
        </div>
      )}
    </div>
  );
};

export default EmployeeOrders;
