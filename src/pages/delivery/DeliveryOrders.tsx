import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Clock, CheckCircle, Truck, Loader2, Navigation, Package, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DeliveryOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_complement: string | null;
  status: string;
  total: number;
  items: any[];
  created_at: string;
  payment_method: string;
}

const statusColumns = [
  { key: 'CONFIRMED', label: 'Confirmados', color: 'bg-blue-500', icon: Package },
  { key: 'PREPARING', label: 'Preparando', color: 'bg-orange-500', icon: Clock },
  { key: 'READY', label: 'Prontos p/ Entrega', color: 'bg-green-500', icon: Truck },
];

const paymentLabels: Record<string, string> = {
  pix: 'PIX', cash: 'Dinheiro', card: 'Cartão',
};

const DeliveryOrderCard: React.FC<{ order: DeliveryOrder; onMarkDelivered: (id: string) => void; onOpenMaps: (addr: string) => void; onOpenWhatsApp: (phone: string, name: string) => void }> = ({
  order, onMarkDelivered, onOpenMaps, onOpenWhatsApp
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: order.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`transition-shadow ${isDragging ? 'shadow-xl ring-2 ring-primary' : 'hover:shadow-md'}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground">
                <GripVertical className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm">{order.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{paymentLabels[order.payment_method] || order.payment_method}</Badge>
              <span className="font-bold text-primary">R$ {Number(order.total).toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-sm">{order.customer_name}</p>
            <div className="flex items-start gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{order.customer_address}{order.customer_complement ? ` — ${order.customer_complement}` : ''}</span>
            </div>
          </div>

          {/* Items completos */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Itens do pedido:</p>
            {order.items && order.items.length > 0 ? (
              order.items.map((item: any, idx: number) => {
                // Se for pizza
                if (item.type === 'pizza') {
                  const pizzaItem = item as any;
                  const flavors = pizzaItem.flavors?.map((f: any) => f.name).join(' + ') || 'Pizza';
                  const border = pizzaItem.border ? ` - Borda: ${pizzaItem.border.name}` : '';

                  return (
                    <div key={idx} className="text-xs border-b border-border/30 last:border-0 pb-1.5 last:pb-0">
                      <div className="flex justify-between">
                        <span className="font-medium">{pizzaItem.quantity}× Pizza {pizzaItem.size}</span>
                        <span className="text-primary">R$ {(pizzaItem.unitPrice * pizzaItem.quantity).toFixed(2)}</span>
                      </div>
                      <p className="text-muted-foreground text-[11px] ml-3">
                        {flavors}{border}
                      </p>
                    </div>
                  );
                }
                // Se for produto (bebida, etc)
                else {
                  const productItem = item as any;
                  return (
                    <div key={idx} className="text-xs border-b border-border/30 last:border-0 pb-1.5 last:pb-0">
                      <div className="flex justify-between">
                        <span className="font-medium">{productItem.quantity}× {productItem.product?.name || productItem.name || 'Item'}</span>
                        <span className="text-primary">R$ {(productItem.unitPrice * productItem.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                }
              })
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum item listado</p>
            )}

            {/* Total do pedido dentro do card */}
            <div className="flex justify-between items-center pt-1 mt-1 border-t border-border">
              <span className="text-xs font-semibold">Total:</span>
              <span className="font-bold text-sm text-primary">R$ {Number(order.total).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => onOpenMaps(order.customer_address)}>
              <Navigation className="w-3 h-3" /> Mapa
            </Button>
            <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => onOpenWhatsApp(order.customer_phone, order.customer_name)}>
              <Phone className="w-3 h-3" /> WhatsApp
            </Button>
            {order.status === 'READY' && (
              <Button size="sm" className="gap-1 w-full" onClick={() => onMarkDelivered(order.id)}>
                <CheckCircle className="w-3 h-3" /> Marcar Entregue
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const DeliveryOrders: React.FC = () => {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_type', 'delivery')
      .in('status', ['CONFIRMED', 'PREPARING', 'READY'])
      .order('created_at', { ascending: false });

    if (!error && data) setOrders(data as DeliveryOrder[]);
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

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus as any }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar status'); return; }
    toast.success('Status atualizado!');
  };

  const openMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const number = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
    window.open(`https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(`Olá ${name}, sou o entregador da Pizzaria. Estou a caminho!`)}`, '_blank');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active) return;

    const overId = over.id as string;
    const activeId = active.id as string;

    // Check if dropped on a column
    const targetColumn = statusColumns.find(c => c.key === overId);
    if (targetColumn) {
      const order = orders.find(o => o.id === activeId);
      if (order && order.status !== targetColumn.key) {
        updateStatus(activeId, targetColumn.key);
      }
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const totalOrders = orders.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <Truck className="w-5 h-5" /> Entregas
        </h1>
        <Badge variant="secondary">{totalOrders} pedidos</Badge>
      </div>

      {totalOrders === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma entrega pendente</p>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statusColumns.map(column => {
              const columnOrders = orders.filter(o => o.status === column.key);
              const ColumnIcon = column.icon;
              return (
                <div key={column.key} className="space-y-3">
                  <div className="flex items-center gap-2 sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10">
                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                    <h2 className="font-semibold text-sm">{column.label}</h2>
                    <Badge variant="outline" className="text-xs ml-auto">{columnOrders.length}</Badge>
                  </div>

                  <SortableContext items={columnOrders.map(o => o.id)} strategy={verticalListSortingStrategy} id={column.key}>
                    <div className="space-y-3 min-h-[100px] p-2 rounded-lg border border-dashed border-border/50">
                      {columnOrders.length > 0 ? (
                        columnOrders.map(order => (
                          <DeliveryOrderCard
                            key={order.id}
                            order={order}
                            onMarkDelivered={markDelivered}
                            onOpenMaps={openMaps}
                            onOpenWhatsApp={openWhatsApp}
                          />
                        ))
                      ) : (
                        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                          <ColumnIcon className="w-4 h-4 mr-2" /> Nenhum pedido
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
        </DndContext>
      )}
    </div>
  );
};

export default DeliveryOrders;
