import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { 
  Printer, Eye, Clock, CheckCircle, XCircle, Truck, 
  MessageCircle, Loader2, Send, Trash2, Filter, X,
  Calendar, DollarSign, CreditCard, Search, RefreshCw
} from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useSettings } from '@/hooks/useSettings';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { Order, OrderStatus, CartItemPizza, CartItemProduct } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
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
  split: 'Dividido',
};

const orderTypeLabels: Record<string, string> = {
  delivery: 'Entrega',
  local: 'Mesa',
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

  // Verificar se é pedido local (funcionário)
  const isLocalOrder = !order.customer.address || order.customer.address.includes('Mesa');

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
              {isLocalOrder && <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">MESA</Badge>}
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
              <span className="uppercase text-[10px]">{paymentLabels[order.payment.method] || order.payment.method}</span>
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

// --- Order Details Modal (COM DEBUG) ---
const OrderDetailsModal: React.FC<{ order: Order | null; onClose: () => void; settings: any }> = ({ order, onClose, settings }) => {
  // Log para ver o que está chegando
  console.log('OrderDetailsModal - order recebido:', order);

  if (!order) {
    console.log('OrderDetailsModal - order é null');
    return null;
  }

  // Verificação segura de cada campo
  const customerName = order.customer?.name || 'Nome não disponível';
  const customerPhone = order.customer?.phone || 'Não informado';
  const customerAddress = order.customer?.address || '';
  const customerComplement = order.customer?.complement || '';

  const isLocalOrder = !customerAddress || customerAddress.includes('Mesa');
  const tableNumber = isLocalOrder && customerAddress ? customerAddress.replace('Mesa ', '') : '';

  const paymentMethod = order.payment?.method || 'unknown';
  const isSplitPayment = !!(order.payment as any)?.splitPayments;

  // Verificar se items existe
  const items = order.items || [];
  console.log('OrderDetailsModal - items:', items);

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Pedido {order.id?.substring(0, 8).toUpperCase() || 'N/A'}
            {isLocalOrder && (
              <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-300">
                🍽️ MESA {tableNumber || 'LOCAL'}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-medium">{customerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              <p className="font-medium">{customerPhone}</p>
            </div>

            {!isLocalOrder ? (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Endereço</p>
                <p className="font-medium">{customerAddress}</p>
                {customerComplement && (
                  <p className="text-sm text-muted-foreground">{customerComplement}</p>
                )}
              </div>
            ) : (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Tipo de Pedido</p>
                <p className="font-medium flex items-center gap-2">
                  <Badge variant="secondary">Pedido Local</Badge>
                  {tableNumber && <Badge>Mesa {tableNumber}</Badge>}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Itens do pedido */}
          <div>
            <p className="text-sm font-semibold mb-2">Itens do Pedido</p>
            {items.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-start p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      {item.type === 'pizza' ? (
                        <>
                          <p className="font-medium text-sm">
                            {item.quantity || 1}x Pizza {item.size || 'M'} —
                            {item.flavors?.map((f: any) => f.name).join(' + ') || 'Pizza'}
                          </p>
                          {item.border && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Borda: {
                                Array.isArray(item.border)
                                  ? item.border.map((b: any) => b.name).join(' + ')
                                  : item.border?.name || ''
                              }
                            </p>
                          )}
                          {item.observation && (
                            <p className="text-xs text-muted-foreground italic mt-1">
                              📝 Obs: {item.observation}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-sm">
                            {item.quantity || 1}x {item.product?.name || item.name || 'Item'}
                          </p>
                          {item.observation && (
                            <p className="text-xs text-muted-foreground italic mt-1">
                              📝 Obs: {item.observation}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <p className="font-medium text-primary text-sm whitespace-nowrap ml-3">
                      R$ {((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">Nenhum item no pedido</p>
            )}
          </div>

          <Separator />

          {/* Informações de pagamento */}
          <div>
            <p className="text-sm font-semibold mb-2">Pagamento</p>
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Método:</span>
                <Badge variant="outline" className="text-sm">
                  {isSplitPayment ? 'Dividido' : paymentLabels[paymentMethod] || paymentMethod}
                </Badge>
              </div>

              {isSplitPayment && (order.payment as any)?.splitPayments && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <p className="text-xs font-medium text-muted-foreground">Divisão do pagamento:</p>
                  {(order.payment as any).splitPayments.map((p: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm bg-background/50 p-2 rounded">
                      <span className="flex items-center gap-1">
                        {p.method === 'cash' ? '💵' : '💳'}
                        {p.method === 'cash' ? 'Dinheiro' : 'Cartão'}
                      </span>
                      <span className="font-medium">R$ {p.amount?.toFixed(2) || '0.00'}</span>
                    </div>
                  ))}
                </div>
              )}

              {order.payment?.needsChange && (
                <div className="flex justify-between items-center text-sm bg-green-50 dark:bg-green-950/20 p-2 rounded">
                  <span className="text-muted-foreground">Troco para:</span>
                  <span className="font-medium text-green-600">R$ {order.payment.changeFor?.toFixed(2) || '0.00'}</span>
                </div>
              )}

              <div className="flex justify-between items-center font-bold text-base pt-2 border-t border-border">
                <span>Total:</span>
                <span className="text-primary text-lg">R$ {order.total?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>

          {/* Informações adicionais para pedidos locais */}
          {isLocalOrder && (
            <>
              <Separator />
              <div className="text-xs text-muted-foreground text-center">
                Pedido registrado por funcionário • {new Date(order.createdAt).toLocaleString('pt-BR')}
              </div>
            </>
          )}
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
  
  // Estados para filtros
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string[]>([]);
  const [orderTypeFilter, setOrderTypeFilter] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [activeFilters, setActiveFilters] = useState(0);

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

  // Aplicar filtros aos pedidos
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Filtro por ID
      if (searchId && !order.id.toLowerCase().includes(searchId.toLowerCase())) {
        return false;
      }

      // Filtro por data
      if (dateRange.start || dateRange.end) {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        if (dateRange.start && orderDate < dateRange.start) return false;
        if (dateRange.end && orderDate > dateRange.end) return false;
      }

      // Filtro por método de pagamento
      if (paymentMethodFilter.length > 0) {
        const method = order.payment.method as string;
        if (!paymentMethodFilter.includes(method)) return false;
      }

      // Filtro por tipo de pedido (delivery vs local)
      if (orderTypeFilter.length > 0) {
        const isLocal = !order.customer.address || order.customer.address.includes('Mesa');
        const type = isLocal ? 'local' : 'delivery';
        if (!orderTypeFilter.includes(type)) return false;
      }

      // Filtro por valor
      if (priceRange.min && order.total < Number(priceRange.min)) return false;
      if (priceRange.max && order.total > Number(priceRange.max)) return false;

      return true;
    });
  }, [orders, searchId, dateRange, paymentMethodFilter, orderTypeFilter, priceRange]);

  // Contar filtros ativos
  useMemo(() => {
    let count = 0;
    if (searchId) count++;
    if (dateRange.start || dateRange.end) count++;
    if (paymentMethodFilter.length > 0) count++;
    if (orderTypeFilter.length > 0) count++;
    if (priceRange.min || priceRange.max) count++;
    setActiveFilters(count);
  }, [searchId, dateRange, paymentMethodFilter, orderTypeFilter, priceRange]);

  const confirmedOrders = filteredOrders.filter(o => o.status !== 'PENDING');

  const ordersByStatus = useCallback((status: OrderStatus) => {
    if (status === 'CONFIRMED') {
      return confirmedOrders.filter(o => o.status === 'CONFIRMED' || o.status === 'PREPARING');
    }
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
    // Verificar se é pedido local (funcionário)
    const isLocalOrder = !order.customer.address || order.customer.address.includes('Mesa');
    
    // Formatar data
    const date = new Date(order.createdAt);
    const formattedDate = date.toLocaleDateString('pt-BR');
    const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Agrupar itens
    const pizzas = order.items.filter(item => item.type === 'pizza');
    const products = order.items.filter(item => item.type === 'product');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Pedido ${order.id.substring(0, 8).toUpperCase()}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            background: #fff; 
            color: #000; 
            padding: 20px; 
            max-width: 300px; 
            margin: 0 auto;
            line-height: 1.4;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px dashed #000; 
            padding-bottom: 15px; 
            margin-bottom: 15px; 
          }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header h2 { font-size: 16px; font-weight: normal; }
          .order-info { 
            margin-bottom: 15px; 
            padding: 10px; 
            background: #f5f5f5; 
            border-radius: 5px; 
          }
          .order-info p { margin: 3px 0; font-size: 13px; }
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
            font-size: 12px; 
            font-weight: bold;
            color: #000; 
            margin-left: 15px; 
            margin-top: 3px; 
          }
          .item-observation { 
            font-size: 10px; 
            color: #666; 
            margin-left: 15px; 
            margin-top: 2px; 
            font-style: italic; 
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
          .local-badge {
            background: #ffd700;
            color: #000;
            padding: 3px 8px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: bold;
            text-align: center;
            display: inline-block;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🍕 ${settings?.name || 'Pizzaria'}</h1>
          <h2>${isLocalOrder ? 'Pedido Local - Funcionário' : 'Comprovante de Pedido'}</h2>
          ${isLocalOrder ? '<div class="local-badge">🛎️ MESA</div>' : ''}
        </div>

        <div class="order-info">
          <p><strong>Pedido:</strong> #${order.id.substring(0, 8).toUpperCase()}</p>
          <p><strong>Data:</strong> ${formattedDate} às ${formattedTime}</p>
          <p><strong>Cliente:</strong> ${order.customer.name}</p>
          <p><strong>Telefone:</strong> ${order.customer.phone || 'Não informado'}</p>
          ${!isLocalOrder ? `
            <p><strong>Endereço:</strong> ${order.customer.address}</p>
            ${order.customer.complement ? `<p><strong>Complemento:</strong> ${order.customer.complement}</p>` : ''}
          ` : `
            <p><strong>Local:</strong> Pedido na mesa</p>
          `}
        </div>

        ${pizzas.length > 0 ? `
          <div class="section-title">🍕 PIZZAS</div>
          ${pizzas.map(item => {
            const pizzaItem = item as any;
            const flavors = pizzaItem.flavors?.map((f: any) => f.name).join(' + ') || 'Pizza';
            const border = pizzaItem.border ? 
              (Array.isArray(pizzaItem.border) 
                ? `Bordas: ${(pizzaItem.border as any[]).map((b: any) => b.name).join(' + ')}` 
                : `Borda: ${(pizzaItem.border as any).name}`) 
              : '';
            const observation = pizzaItem.observation ? `📝 Obs: ${pizzaItem.observation}` : '';
            
            return `
              <div class="item">
                <div class="item-header">
                  <span>${pizzaItem.quantity}x Pizza ${pizzaItem.size}</span>
                  <span>R$ ${(pizzaItem.unitPrice * pizzaItem.quantity).toFixed(2)}</span>
                </div>
                <div class="item-details">${flavors}</div>
                ${border ? `<div class="item-details" style="font-size: 11px;">${border}</div>` : ''}
                ${observation ? `<div class="item-observation">${observation}</div>` : ''}
              </div>
            `;
          }).join('')}
        ` : ''}

        ${products.length > 0 ? `
          <div class="section-title">🥤 BEBIDAS & OUTROS</div>
          ${products.map(item => {
            const productItem = item as any;
            const observation = productItem.observation ? `📝 Obs: ${productItem.observation}` : '';
            return `
              <div class="item">
                <div class="item-header">
                  <span>${productItem.quantity}x ${productItem.product?.name || 'Item'}</span>
                  <span>R$ ${(productItem.unitPrice * productItem.quantity).toFixed(2)}</span>
                </div>
                ${observation ? `<div class="item-observation">${observation}</div>` : ''}
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
          <strong>Pagamento:</strong> ${
            order.payment.method === 'pix' ? 'PIX' :
            order.payment.method === 'cash' ? 'Dinheiro' : 
            order.payment.method === 'card' ? 'Cartão' : 'Dividido'
          }
          ${order.payment.needsChange ? `<br><strong>Troco para:</strong> R$ ${order.payment.changeFor?.toFixed(2)}` : ''}
          ${(order.payment as any).splitPayments ? `
            <br><strong>Dividido:</strong> 
            ${(order.payment as any).splitPayments.map((p: any) => 
              `${p.method === 'cash' ? '💵' : '💳'} R$ ${p.amount.toFixed(2)}`
            ).join(' + ')}
          ` : ''}
        </div>

        <div class="footer">
          <p>Obrigado pela preferência!</p>
          <p style="font-size: 9px; margin-top: 5px;">${settings?.address || ''}</p>
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

    // Usar iframe para impressão
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    iframe.contentDocument?.write(printContent);
    iframe.contentDocument?.close();
    
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 200);
  };

  const clearFilters = () => {
    setSearchId('');
    setDateRange({ start: '', end: '' });
    setPaymentMethodFilter([]);
    setOrderTypeFilter([]);
    setPriceRange({ min: '', max: '' });
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
      {/* Header com título e contador */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Pedidos</h1>
          <p className="text-muted-foreground text-sm">
            {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''} no total
            {filteredOrders.length !== orders.length && ` (${orders.length} sem filtros)`}
          </p>
        </div>

        {/* Botão de filtros */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtros
            {activeFilters > 0 && (
              <Badge className="ml-1 bg-primary text-primary-foreground text-xs h-5 px-1.5">
                {activeFilters}
              </Badge>
            )}
          </Button>
          {activeFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1 text-muted-foreground"
            >
              <RefreshCw className="w-3 h-3" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Painel de filtros */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-2 border-primary/10">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Busca por ID */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Search className="w-3 h-3" /> Buscar por ID
                    </Label>
                    <Input
                      placeholder="Ex: abc123..."
                      value={searchId}
                      onChange={(e) => setSearchId(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Período */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Período
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="h-8 text-sm"
                      />
                      <span className="text-muted-foreground">até</span>
                      <Input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Faixa de preço */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Faixa de preço
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min R$"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                        className="h-8 text-sm"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        placeholder="Max R$"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Método de pagamento */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> Pagamento
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'pix', label: 'PIX' },
                        { value: 'cash', label: 'Dinheiro' },
                        { value: 'card', label: 'Cartão' },
                        { value: 'split', label: 'Dividido' },
                      ].map(method => (
                        <Badge
                          key={method.value}
                          variant={paymentMethodFilter.includes(method.value) ? 'default' : 'outline'}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setPaymentMethodFilter(prev =>
                              prev.includes(method.value)
                                ? prev.filter(m => m !== method.value)
                                : [...prev, method.value]
                            );
                          }}
                        >
                          {method.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Tipo de pedido */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Truck className="w-3 h-3" /> Tipo
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'delivery', label: 'Entrega' },
                        { value: 'local', label: 'Mesa' },
                      ].map(type => (
                        <Badge
                          key={type.value}
                          variant={orderTypeFilter.includes(type.value) ? 'default' : 'outline'}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setOrderTypeFilter(prev =>
                              prev.includes(type.value)
                                ? prev.filter(t => t !== type.value)
                                : [...prev, type.value]
                            );
                          }}
                        >
                          {type.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban com pedidos filtrados */}
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