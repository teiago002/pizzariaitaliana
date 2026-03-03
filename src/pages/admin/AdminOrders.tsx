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
import { Order, OrderStatus, CartItemPizza, CartItemProduct } from '@/types';
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
    // Se for a coluna CONFIRMED, mostra tanto CONFIRMED quanto PREPARING juntos
    if (status === 'CONFIRMED') {
      return confirmedOrders.filter(o => o.status === 'CONFIRMED' || o.status === 'PREPARING');
    }
    // Para as outras colunas, mostra apenas o status específico
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
    // Formatar data e hora
    const date = new Date(order.createdAt);
    const formattedDate = date.toLocaleDateString('pt-BR');
    const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Agrupar itens por tipo para melhor organização
    const pizzas = order.items.filter(item => item.type === 'pizza');
    const products = order.items.filter(item => item.type === 'product');

    // Criar conteúdo HTML para impressão
    const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Pedido ${order.id.substring(0, 8).toUpperCase()}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', monospace;
          background: #fff;
          color: #000;
          line-height: 1.4;
          padding: 20px;
          max-width: 300px;
          margin: 0 auto;
        }

        .header {
          text-align: center;
          border-bottom: 2px dashed #000;
          padding-bottom: 15px;
          margin-bottom: 15px;
        }

        .header h1 {
          font-size: 24px;
          margin-bottom: 5px;
        }

        .header h2 {
          font-size: 18px;
          font-weight: normal;
        }

        .order-info {
          margin-bottom: 15px;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 5px;
        }

        .order-info p {
          margin: 3px 0;
          font-size: 13px;
        }

        .section-title {
          font-weight: bold;
          font-size: 14px;
          margin: 15px 0 8px 0;
          border-bottom: 1px solid #000;
          padding-bottom: 3px;
        }

        .item {
          margin: 8px 0;
          padding: 5px 0;
          border-bottom: 1px dotted #ccc;
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 13px;
        }

        .item-details {
          font-size: 11px;
          color: #666;
          margin-left: 15px;
          margin-top: 3px;
        }

        .total-section {
          margin-top: 20px;
          border-top: 2px solid #000;
          padding-top: 10px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          margin: 5px 0;
        }

        .grand-total {
          font-size: 18px;
          font-weight: bold;
          border-top: 1px solid #000;
          margin-top: 8px;
          padding-top: 8px;
        }

        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 11px;
          border-top: 1px dashed #000;
          padding-top: 15px;
        }

        .payment-info {
          background: #f0f0f0;
          padding: 8px;
          border-radius: 5px;
          margin: 10px 0;
          font-size: 12px;
        }

        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🍕 ${settings?.name || 'Pizzaria'}</h1>
        <h2>Comprovante de Pedido</h2>
      </div>

      <div class="order-info">
        <p><strong>Pedido:</strong> #${order.id.substring(0, 8).toUpperCase()}</p>
        <p><strong>Data:</strong> ${formattedDate} às ${formattedTime}</p>
        <p><strong>Cliente:</strong> ${order.customer.name}</p>
        <p><strong>Telefone:</strong> ${order.customer.phone}</p>
        <p><strong>Endereço:</strong> ${order.customer.address}</p>
        ${order.customer.complement ? `<p><strong>Complemento:</strong> ${order.customer.complement}</p>` : ''}
      </div>

      ${pizzas.length > 0 ? `
        <div class="section-title">🍕 PIZZAS</div>
        ${pizzas.map(item => {
      const pizzaItem = item as CartItemPizza;
      const flavors = pizzaItem.flavors.map(f => f.name).join(' + ');
      const border = pizzaItem.border ? ` - Borda: ${pizzaItem.border.name}` : '';
      return `
            <div class="item">
              <div class="item-header">
                <span>${pizzaItem.quantity}x Pizza ${pizzaItem.size}</span>
                <span>R$ ${(pizzaItem.unitPrice * pizzaItem.quantity).toFixed(2)}</span>
              </div>
              <div class="item-details">${flavors}${border}</div>
            </div>
          `;
    }).join('')}
      ` : ''}

      ${products.length > 0 ? `
        <div class="section-title">🥤 BEBIDAS & OUTROS</div>
        ${products.map(item => {
      const productItem = item as CartItemProduct;
      return `
            <div class="item">
              <div class="item-header">
                <span>${productItem.quantity}x ${productItem.product.name}</span>
                <span>R$ ${(productItem.unitPrice * productItem.quantity).toFixed(2)}</span>
              </div>
            </div>
          `;
    }).join('')}
      ` : ''}

      <div class="total-section">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>R$ ${order.total.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Entrega:</span>
          <span>Grátis</span>
        </div>
        <div class="total-row grand-total">
          <span>TOTAL:</span>
          <span>R$ ${order.total.toFixed(2)}</span>
        </div>
      </div>

      <div class="payment-info">
        <strong>Pagamento:</strong> ${order.payment.method === 'pix' ? 'PIX' :
        order.payment.method === 'cash' ? 'Dinheiro' : 'Cartão'
      }
        ${order.payment.needsChange ? `<br><strong>Troco para:</strong> R$ ${order.payment.changeFor?.toFixed(2)}` : ''}
      </div>

      <div class="footer">
        <p>Obrigado pela preferência!</p>
        <p style="font-size: 9px; margin-top: 5px;">${settings?.address || ''}</p>
        <p style="font-size: 9px;">${settings?.whatsapp ? `WhatsApp: ${settings.whatsapp}` : ''}</p>
      </div>

      <script>
        window.onload = () => {
          window.print();
          setTimeout(() => window.close(), 500);
        };
      </script>
    </body>
    </html>
  `;

    // Abrir janela de impressão
    const printWindow = window.open('', '_blank', 'width=400,height=600,menubar=no,toolbar=no,location=no,status=no');

    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    } else {
      // Se o popup foi bloqueado
      toast.error('Permita popups para imprimir o pedido');

      // Fallback: imprimir na mesma página
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframe.contentDocument?.write(printContent);
      iframe.contentDocument?.close();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }
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
