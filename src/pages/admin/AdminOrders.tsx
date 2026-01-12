import React from 'react';
import { motion } from 'framer-motion';
import { Printer, Eye, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { Order, OrderStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const AdminOrders: React.FC = () => {
  const { orders, updateOrderStatus } = useStore();

  // Only show confirmed orders (as per requirements)
  const confirmedOrders = orders.filter(o => o.status !== 'PENDING');

  const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
    PENDING: { label: 'Pendente', color: 'bg-yellow-500', icon: Clock },
    CONFIRMED: { label: 'Confirmado', color: 'bg-blue-500', icon: CheckCircle },
    PREPARING: { label: 'Preparando', color: 'bg-orange-500', icon: Clock },
    READY: { label: 'Pronto', color: 'bg-green-500', icon: CheckCircle },
    DELIVERED: { label: 'Entregue', color: 'bg-gray-500', icon: Truck },
    CANCELLED: { label: 'Cancelado', color: 'bg-red-500', icon: XCircle },
  };

  const paymentLabels = {
    pix: 'PIX',
    cash: 'Dinheiro',
    card: 'Cartão',
  };

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    updateOrderStatus(orderId, status);
    toast.success(`Status atualizado para ${statusConfig[status].label}`);
  };

  const handlePrint = (order: Order) => {
    // Create print content
    const printContent = `
      <html>
        <head>
          <title>Pedido ${order.id}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; }
            h1 { font-size: 18px; text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; }
            .info { margin: 10px 0; }
            .item { margin: 5px 0; }
            .total { font-weight: bold; border-top: 2px dashed #000; padding-top: 10px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>🍕 PIZZARIA ITALIANA</h1>
          <div class="info"><strong>Pedido:</strong> ${order.id}</div>
          <div class="info"><strong>Data:</strong> ${new Date(order.createdAt).toLocaleString('pt-BR')}</div>
          <div class="info"><strong>Cliente:</strong> ${order.customer.name}</div>
          <div class="info"><strong>Telefone:</strong> ${order.customer.phone}</div>
          <div class="info"><strong>Endereço:</strong> ${order.customer.address}</div>
          ${order.customer.complement ? `<div class="info"><strong>Complemento:</strong> ${order.customer.complement}</div>` : ''}
          <hr/>
          <div><strong>Itens:</strong></div>
          ${order.items.map(item => {
            if (item.type === 'pizza') {
              return `<div class="item">${item.quantity}x Pizza ${item.flavors.map(f => f.name).join(' + ')} (${item.size}) - R$ ${(item.unitPrice * item.quantity).toFixed(2)}</div>`;
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

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const OrderDetails: React.FC<{ order: Order }> = ({ order }) => (
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
            <div key={index} className="flex justify-between items-center">
              <div>
                <p className="font-medium">
                  {item.type === 'pizza' 
                    ? `Pizza ${item.flavors.map(f => f.name).join(' + ')} (${item.size})`
                    : item.product.name
                  }
                </p>
                <p className="text-sm text-muted-foreground">Qtd: {item.quantity}</p>
              </div>
              <p className="font-medium">R$ {(item.unitPrice * item.quantity).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">Pagamento</p>
          <Badge variant="outline">{paymentLabels[order.payment.method]}</Badge>
        </div>
        {order.payment.needsChange && (
          <p className="text-sm text-muted-foreground mt-1">
            Troco para: R$ {order.payment.changeFor?.toFixed(2)}
          </p>
        )}
      </div>

      <div className="border-t pt-4 flex justify-between items-center">
        <p className="font-bold text-lg">Total</p>
        <p className="font-bold text-lg text-primary">R$ {order.total.toFixed(2)}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Pedidos</h1>
        <p className="text-muted-foreground">Gerencie os pedidos confirmados</p>
      </div>

      {confirmedOrders.length > 0 ? (
        <div className="space-y-4">
          {confirmedOrders.map((order, index) => {
            const status = statusConfig[order.status];
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Order Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-bold text-lg">{order.id}</span>
                          <Badge className={`${status.color} text-white`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.customer.name} • {order.customer.phone}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(order.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="text-right lg:text-center">
                        <p className="text-2xl font-bold text-primary">
                          R$ {order.total.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleStatusChange(order.id, value as OrderStatus)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                            <SelectItem value="PREPARING">Preparando</SelectItem>
                            <SelectItem value="READY">Pronto</SelectItem>
                            <SelectItem value="DELIVERED">Entregue</SelectItem>
                            <SelectItem value="CANCELLED">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Pedido {order.id}</DialogTitle>
                            </DialogHeader>
                            <OrderDetails order={order} />
                          </DialogContent>
                        </Dialog>

                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handlePrint(order)}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Nenhum pedido confirmado ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Os pedidos aparecerão aqui após o pagamento ser confirmado
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminOrders;
