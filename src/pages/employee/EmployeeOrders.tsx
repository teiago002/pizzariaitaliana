import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Truck, Loader2, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { OrderStatus, CartItemPizza, CartItemProduct } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/contexts/StoreContext';

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
  const { settings } = useStore();

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

  const handlePrint = (order: any) => {
    // Formatar data
    const date = new Date(order.created_at);
    const formattedDate = date.toLocaleDateString('pt-BR');
    const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const items = order.items || [];
    const pizzas = items.filter((item: any) => item.type === 'pizza');
    const products = items.filter((item: any) => item.type === 'product');

    // Criar conteúdo HTML para impressão (MESMA VERSÃO DO ADMIN)
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
          <h2>Pedido Local - Funcionário</h2>
          <div class="local-badge">🛎️ MESA</div>
        </div>

        <div class="order-info">
          <p><strong>Pedido:</strong> #${order.id.substring(0, 8).toUpperCase()}</p>
          <p><strong>Data:</strong> ${formattedDate} às ${formattedTime}</p>
          <p><strong>Cliente:</strong> ${order.customer_name || 'Cliente'}</p>
          <p><strong>Telefone:</strong> ${order.customer_phone || 'Não informado'}</p>
          ${order.table_number ? `<p><strong>Mesa:</strong> ${order.table_number}</p>` : ''}
        </div>

        ${pizzas.length > 0 ? `
          <div class="section-title">🍕 PIZZAS</div>
          ${pizzas.map((item: any) => {
            const flavors = item.flavors?.map((f: any) => f.name).join(' + ') || 'Pizza';
            const border = item.border ? 
              (Array.isArray(item.border) 
                ? `Bordas: ${item.border.map((b: any) => b.name).join(' + ')}` 
                : `Borda: ${item.border.name}`) 
              : '';
            const observation = item.observation ? `📝 Obs: ${item.observation}` : '';
            
            return `
              <div class="item">
                <div class="item-header">
                  <span>${item.quantity}x Pizza ${item.size}</span>
                  <span>R$ ${(item.unitPrice * item.quantity).toFixed(2)}</span>
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
          ${products.map((item: any) => {
            const observation = item.observation ? `📝 Obs: ${item.observation}` : '';
            return `
              <div class="item">
                <div class="item-header">
                  <span>${item.quantity}x ${item.product?.name || 'Item'}</span>
                  <span>R$ ${(item.unitPrice * item.quantity).toFixed(2)}</span>
                </div>
                ${observation ? `<div class="item-observation">${observation}</div>` : ''}
              </div>
            `;
          }).join('')}
        ` : ''}

        <div class="total-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>R$ ${Number(order.total).toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Entrega:</span>
            <span>Grátis</span>
          </div>
          <div class="total-row grand-total">
            <span>TOTAL:</span>
            <span>R$ ${Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        <div class="payment-info">
          <strong>Pagamento:</strong> ${
            order.payment_method === 'pix' ? 'PIX' :
            order.payment_method === 'cash' ? 'Dinheiro' : 
            order.payment_method === 'split' ? 'Dividido' : 'Cartão'
          }
          ${order.payment_method === 'cash' && order.needs_change ? `<br><strong>Troco para:</strong> R$ ${order.change_for?.toFixed(2)}` : ''}
          ${order.payment_data?.splitPayments ? `
            <br><strong>Dividido:</strong> 
            ${order.payment_data.splitPayments.map((p: any) => 
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
                      <Badge className={`${status?.color} text-white`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status?.label}
                      </Badge>
                      {order.table_number && <Badge variant="outline">Mesa {order.table_number}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.customer_name || 'Cliente'} • {items?.length || 0} itens
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">R$ {Number(order.total).toFixed(2)}</span>
                    
                    {/* Botão de impressão */}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePrint(order)}
                      title="Imprimir pedido"
                    >
                      <Printer className="w-4 h-4" />
                    </Button>

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