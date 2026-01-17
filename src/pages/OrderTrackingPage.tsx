import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock, 
  CheckCircle, 
  ChefHat, 
  Truck, 
  Home, 
  ArrowLeft,
  MessageCircle,
  Package,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/hooks/useSettings';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrderStatus, CartItem, CartItemPizza } from '@/types';

interface OrderData {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_complement: string | null;
  items: CartItem[];
  payment_method: string;
  total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusSteps = [
    { status: 'PENDING', label: 'Aguardando', icon: Clock, description: 'Aguardando confirmação de pagamento' },
    { status: 'CONFIRMED', label: 'Confirmado', icon: CheckCircle, description: 'Pedido confirmado!' },
    { status: 'PREPARING', label: 'Preparando', icon: ChefHat, description: 'Seu pedido está sendo preparado' },
    { status: 'READY', label: 'Saindo', icon: Truck, description: 'Pedido saiu para entrega' },
    { status: 'DELIVERED', label: 'Entregue', icon: Home, description: 'Pedido entregue com sucesso!' },
  ];

  const statusOrder: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'];

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    if (order.status === 'CANCELLED') return -1;
    return statusOrder.indexOf(order.status);
  };

  useEffect(() => {
    if (!orderId) {
      setError('Pedido não encontrado');
      setLoading(false);
      return;
    }

    // Fetch order initially
    const fetchOrder = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .maybeSingle();

        if (fetchError) throw fetchError;
        
        if (!data) {
          setError('Pedido não encontrado');
        } else {
          setOrder({
            ...data,
            items: data.items as unknown as CartItem[],
            status: data.status as OrderStatus,
          });
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Erro ao carregar pedido');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log('Order update received:', payload);
          const updated = payload.new as any;
          setOrder({
            ...updated,
            items: updated.items as unknown as CartItem[],
            status: updated.status as OrderStatus,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const openWhatsApp = () => {
    const phone = settings.whatsapp.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá! Gostaria de saber sobre meu pedido ${order?.id.substring(0, 8).toUpperCase()}`
    );
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground mb-2">
            {error || 'Pedido não encontrado'}
          </h2>
          <p className="text-muted-foreground mb-4">
            Verifique o número do pedido e tente novamente
          </p>
          <Link to="/">
            <Button>Voltar ao Início</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex();
  const isCancelled = order.status === 'CANCELLED';

  const paymentLabels: Record<string, string> = {
    pix: 'PIX',
    cash: 'Dinheiro',
    card: 'Cartão',
  };

  return (
    <div className="min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Início
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Acompanhar Pedido
              </h1>
              <p className="text-muted-foreground">
                Pedido #{order.id.substring(0, 8).toUpperCase()}
              </p>
            </div>
            {isCancelled && (
              <Badge variant="destructive" className="text-sm">
                Cancelado
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Status Timeline */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              {statusSteps.map((step, index) => {
                const isCompleted = currentStepIndex >= index;
                const isCurrent = currentStepIndex === index;
                const StepIcon = step.icon;

                return (
                  <motion.div
                    key={step.status}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-4 mb-6 last:mb-0"
                  >
                    {/* Icon Circle */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`
                          w-12 h-12 rounded-full flex items-center justify-center transition-colors
                          ${isCancelled ? 'bg-muted text-muted-foreground' : 
                            isCompleted ? 'bg-secondary text-secondary-foreground' : 
                            'bg-muted text-muted-foreground'}
                          ${isCurrent && !isCancelled ? 'ring-4 ring-secondary/30 animate-pulse' : ''}
                        `}
                      >
                        <StepIcon className="w-5 h-5" />
                      </div>
                      {/* Connecting Line */}
                      {index < statusSteps.length - 1 && (
                        <div
                          className={`
                            absolute left-1/2 -translate-x-1/2 top-12 w-0.5 h-8
                            ${isCompleted && currentStepIndex > index ? 'bg-secondary' : 'bg-border'}
                          `}
                        />
                      )}
                    </div>

                    {/* Text Content */}
                    <div className={`pt-2 ${isCancelled ? 'opacity-50' : ''}`}>
                      <h3 className={`font-semibold ${isCurrent && !isCancelled ? 'text-primary' : ''}`}>
                        {step.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Detalhes do Pedido</h3>
            
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-start p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    {item.type === 'pizza' ? (
                      <>
                        <p className="font-medium">
                          Pizza {(item as CartItemPizza).size}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(item as CartItemPizza).flavors.map(f => f.name).join(' + ')}
                        </p>
                        {(item as CartItemPizza).border && (
                          <p className="text-xs text-muted-foreground">
                            Borda: {(item as CartItemPizza).border?.name}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="font-medium">{item.product.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                  </div>
                  <p className="font-medium text-primary">
                    R$ {(item.unitPrice * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pagamento</span>
                <span className="font-medium">{paymentLabels[order.payment_method]}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-primary text-lg">R$ {order.total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card className="mb-6">
          <CardContent className="p-6 space-y-3">
            <h3 className="font-semibold text-foreground">Endereço de Entrega</h3>
            <p className="text-muted-foreground">{order.customer_address}</p>
            {order.customer_complement && (
              <p className="text-sm text-muted-foreground">{order.customer_complement}</p>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Contact */}
        <Button
          variant="outline"
          onClick={openWhatsApp}
          className="w-full"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Falar com a Pizzaria
        </Button>
      </div>
    </div>
  );
};

export default OrderTrackingPage;
