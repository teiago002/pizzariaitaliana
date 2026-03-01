import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { Printer, Eye, Clock, CheckCircle, XCircle, Truck, MessageCircle, Loader2, Send, Trash2 } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useSettings } from '@/hooks/useSettings';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { Order, OrderStatus, CartItemPizza } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const KANBAN_COLUMNS: { status: OrderStatus; label: string; color: string; bg: string }[] = [
  { status: 'CONFIRMED', label: 'Confirmado e preparando', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' },
  { status: 'READY', label: 'Pronto', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  { status: 'DELIVERED', label: 'Entregue', color: 'text-muted-foreground', bg: 'bg-muted/40 border-border' },
  { status: 'CANCELLED', label: 'Cancelado', color: 'text-destructive', bg: 'bg-destructive/5 border-destructive/20' },
];

const paymentLabels: Record<string, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  card: 'Cartão',
};

// --- Draggable Card ---
interface OrderCardProps {
  order: Order;
  isNew: boolean;
  onDelete: (id: string) => void;
  onWhatsApp: (order: Order) => void;
  onPrint: (order: Order) => void;
  onOutForDelivery: (order: Order) => void;
  onViewDetails: (order: Order) => void;
  isDragging?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order, isNew, onDelete, onWhatsApp, onPrint, onOutForDelivery, onViewDetails, isDragging
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: order.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`transition-all duration-150 ${isDragging ? 'opacity-50' : ''}`}
    >
      <Card className={`cursor-grab active:cursor-grabbing select-none ${isNew ? 'ring-2 ring-secondary ring-offset-1' : ''} hover:shadow-md transition-shadow`}>
        <CardContent className="p-3">
          {/* Drag handle area */}
          <div {...listeners} className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isNew && <Badge className="bg-secondary text-secondary-foreground text-[10px] px-1.5 py-0.5 animate-pulse">NOVO</Badge>}
              <span className="font-bold text-sm">{order.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <span className="font-bold text-primary text-sm">R$ {order.total.toFixed(2)}</span>
          </div>

          <div {...listeners}>
            <p className="text-xs text-muted-foreground truncate mb-1">{order.customer.name}</p>
            <p className="text-[11px] text-muted-foreground mb-2">
              {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {' · '}
              {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
              {' · '}
              <span className="uppercase text-[10px]">{paymentLabels[order.payment.method]}</span>
            </p>
          </div>

          {/* Action buttons - stop propagation to prevent drag */}
          <div
            className="flex items-center gap-1 flex-wrap"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewDetails(order)} title="Ver detalhes">
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onWhatsApp(order)} title="WhatsApp">
              <MessageCircle className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPrint(order)} title="Imprimir">
              <Printer className="w-3.5 h-3.5" />
            </Button>
            {['CONFIRMED', 'PREPARING', 'READY'].includes(order.status) && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOutForDelivery(order)} title="Saindo para entrega">
                <Send className="w-3.5 h-3.5" />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Remover">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover Pedido?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Remover o pedido {order.id.substring(0, 8).toUpperCase()}? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(order.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// --- Droppable Column ---
const KanbanColumn: React.FC<{
  col: typeof KANBAN_COLUMNS[0];
  orders: Order[];
  newOrderIds: Set<string>;
  onDelete: (id: string) => void;
  onWhatsApp: (order: Order) => void;
  onPrint: (order: Order) => void;
  onOutForDelivery: (order: Order) => void;
  onViewDetails: (order: Order) => void;
  draggingId: string | null;
}> = ({ col, orders, newOrderIds, onDelete, onWhatsApp, onPrint, onOutForDelivery, onViewDetails, draggingId }) => {
  const { setNodeRef, isOver } = useDroppable({ id: col.status });

  return (
    <div className={`flex flex-col rounded-xl border-2 transition-all duration-150 ${col.bg} ${isOver ? 'ring-2 ring-primary/50 scale-[1.01]' : ''}`}>
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2.5 border-b border-inherit`}>
        <span className={`font-semibold text-sm ${col.color}`}>{col.label}</span>
        <Badge variant="secondary" className="text-xs h-5 px-1.5">{orders.length}</Badge>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className="flex-1 p-2 space-y-2 min-h-[120px]"
      >
        <AnimatePresence>
          {orders.map((order) => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
            >
              <OrderCard
                order={order}
                isNew={newOrderIds.has(order.id)}
                onDelete={onDelete}
                onWhatsApp={onWhatsApp}
                onPrint={onPrint}
                onOutForDelivery={onOutForDelivery}
                onViewDetails={onViewDetails}
                isDragging={draggingId === order.id}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {orders.length === 0 && (
          <div className="h-20 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Arraste pedidos aqui</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Order Details Modal ---
const OrderDetailsModal: React.FC<{ order: Order | null; onClose: () => void; settings: any }> = ({ order, onClose, settings }) => {
  if (!order) return null;
  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pedido {order.id.substring(0, 8).toUpperCase()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-medium">{order.customer.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              <p className="font-medium">{order.customer.phone}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Endereço</p>
              <p className="font-medium">{order.customer.address}</p>
              {order.customer.complement && (
                <p className="text-sm text-muted-foreground">{order.customer.complement}</p>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Itens do Pedido</p>
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-start p-2 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    {item.type === 'pizza' ? (
                      <>
                        <p className="font-medium text-sm">
                          Pizza {(item as CartItemPizza).size} — {(item as CartItemPizza).flavors.map(f => f.name).join(' + ')}
                        </p>
                        {(item as CartItemPizza).border && (
                          <p className="text-xs text-muted-foreground">Borda: {(item as CartItemPizza).border?.name}</p>
                        )}
                      </>
                    ) : (
                      <p className="font-medium text-sm">{item.product.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                  </div>
                  <p className="font-medium text-primary text-sm">R$ {(item.unitPrice * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-3 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Pagamento: <span className="font-medium text-foreground">{paymentLabels[order.payment.method]}</span></p>
              {order.payment.needsChange && (
                <p className="text-xs text-muted-foreground">Troco para: R$ {order.payment.changeFor?.toFixed(2)}</p>
              )}
            </div>
            <p className="font-bold text-lg text-primary">R$ {order.total.toFixed(2)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// --- Main Component ---
const AdminOrders: React.FC = () => {
  const { orders, loading, updateOrderStatus, deleteOrder } = useOrders();
  const { settings } = useSettings();
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useOrderNotifications((newOrder) => {
    setNewOrderIds(prev => new Set([...prev, newOrder.id]));
    setTimeout(() => {
      setNewOrderIds(prev => {
        const next = new Set(prev);
        next.delete(newOrder.id);
        return next;
      });
    }, 30000);
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const confirmedOrders = orders.filter(o => o.status !== 'PENDING');

  const ordersByStatus = useCallback((status: OrderStatus) => {
    return confirmedOrders.filter(o => o.status === status);
  }, [confirmedOrders]);

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggingId(null);
    if (!over || active.id === over.id) return;

    const newStatus = over.id as OrderStatus;
    const validStatuses: OrderStatus[] = ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(newStatus)) return;

    const order = orders.find(o => o.id === active.id);
    if (!order || order.status === newStatus) return;

    await updateOrderStatus(active.id as string, newStatus);
  };

  const handleWhatsApp = async (order: Order) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { orderId: order.id, messageType: `order_${order.status.toLowerCase()}` },
      });
      if (error) throw error;
      if (data.whatsappUrl) window.open(data.whatsappUrl, '_blank');
    } catch {
      toast.error('Erro ao abrir WhatsApp');
    }
  };

  const handleOutForDelivery = async (order: Order) => {
    try {
      await updateOrderStatus(order.id, 'READY');
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { orderId: order.id, messageType: 'order_out_for_delivery' },
      });
      if (error) throw error;
      if (data?.whatsappUrl) window.open(data.whatsappUrl, '_blank');
      toast.success('Pedido marcado como saindo para entrega!');
    } catch {
      toast.error('Erro ao processar');
    }
  };

  const handlePrint = (order: Order) => {
    const printContent = `
      <html>
        <head>
          <title>Pedido ${order.id.substring(0, 8).toUpperCase()}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; }
            h1 { font-size: 18px; text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; }
            .info { margin: 8px 0; font-size: 13px; }
            .item { margin: 4px 0; font-size: 12px; }
            .total { font-weight: bold; border-top: 2px dashed #000; padding-top: 10px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 11px; }
          </style>
        </head>
        <body>
          <h1>🍕 ${settings.name}</h1>
          <div class="info"><strong>Pedido:</strong> ${order.id.substring(0, 8).toUpperCase()}</div>
          <div class="info"><strong>Data:</strong> ${new Date(order.createdAt).toLocaleString('pt-BR')}</div>
          <div class="info"><strong>Cliente:</strong> ${order.customer.name}</div>
          <div class="info"><strong>Telefone:</strong> ${order.customer.phone}</div>
          <div class="info"><strong>Endereço:</strong> ${order.customer.address}</div>
          ${order.customer.complement ? `<div class="info"><strong>Complemento:</strong> ${order.customer.complement}</div>` : ''}
          <hr/>
          <div><strong>Itens:</strong></div>
          ${order.items.map(item => {
            if (item.type === 'pizza') {
              return `<div class="item">${item.quantity}x Pizza ${item.size} (${(item as CartItemPizza).flavors.map(f => f.name).join(' + ')}) - R$ ${(item.unitPrice * item.quantity).toFixed(2)}</div>`;
            } else {
              return `<div class="item">${item.quantity}x ${item.product.name} - R$ ${(item.unitPrice * item.quantity).toFixed(2)}</div>`;
            }
          }).join('')}
          <div class="total">TOTAL: R$ ${order.total.toFixed(2)}</div>
          <div class="info"><strong>Pagamento:</strong> ${paymentLabels[order.payment.method]}</div>
          ${order.payment.needsChange ? `<div class="info"><strong>Troco para:</strong> R$ ${order.payment.changeFor?.toFixed(2)}</div>` : ''}
          <div class="footer">Obrigado pela preferência!</div>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (w) { w.document.write(printContent); w.document.close(); w.print(); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const draggingOrder = draggingId ? orders.find(o => o.id === draggingId) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Pedidos</h1>
        <p className="text-muted-foreground text-sm">Arraste os cards para mudar o status</p>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              col={col}
              orders={ordersByStatus(col.status)}
              newOrderIds={newOrderIds}
              onDelete={deleteOrder}
              onWhatsApp={handleWhatsApp}
              onPrint={handlePrint}
              onOutForDelivery={handleOutForDelivery}
              onViewDetails={setSelectedOrder}
              draggingId={draggingId}
            />
          ))}
        </div>

        <DragOverlay>
          {draggingOrder && (
            <div className="opacity-90 rotate-2 scale-105">
              <Card className="shadow-xl cursor-grabbing">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{draggingOrder.id.substring(0, 8).toUpperCase()}</span>
                    <span className="font-bold text-primary text-sm">R$ {draggingOrder.total.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{draggingOrder.customer.name}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <OrderDetailsModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        settings={settings}
      />
    </div>
  );
};

export default AdminOrders;
