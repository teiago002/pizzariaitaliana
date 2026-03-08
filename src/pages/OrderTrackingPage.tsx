import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CheckCircle2,
  Package,
  Pizza,
  Bike,
  Home,
  Share2,
  Copy,
  Check,
  ChevronRight,
  AlertCircle,
  Phone,
  MapPin,
  Calendar,
  User,
  CreditCard,
  QrCode,
  Loader2,
  RotateCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface OrderDetails {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_complement?: string;
  items: any[];
  total: number;
  status: string;
  payment_method: string;
  needs_change?: boolean;
  change_for?: number;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { 
  label: string; 
  description: string;
  icon: React.ElementType;
  color: string;
  progress: number;
}> = {
  PENDING: { 
    label: 'Aguardando confirmação', 
    description: 'Seu pedido foi recebido e aguarda confirmação',
    icon: Clock, 
    color: 'text-yellow-500',
    progress: 10 
  },
  CONFIRMED: { 
    label: 'Pedido confirmado', 
    description: 'Seu pedido foi confirmado e logo será preparado',
    icon: CheckCircle2, 
    color: 'text-blue-500',
    progress: 30 
  },
  PREPARING: { 
    label: 'Preparando', 
    description: 'Sua pizza está sendo preparada com muito cuidado',
    icon: Pizza, 
    color: 'text-orange-500',
    progress: 50 
  },
  READY: { 
    label: 'Pronto para entrega', 
    description: 'Seu pedido está pronto e será enviado em breve',
    icon: Package, 
    color: 'text-green-500',
    progress: 70 
  },
  DELIVERED: { 
    label: 'Entregue', 
    description: 'Pedido entregue com sucesso! Bom apetite!',
    icon: Home, 
    color: 'text-green-600',
    progress: 100 
  },
  CANCELLED: { 
    label: 'Cancelado', 
    description: 'Este pedido foi cancelado',
    icon: AlertCircle, 
    color: 'text-red-500',
    progress: 0 
  },
};

const paymentLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pix: { label: 'PIX', icon: QrCode, color: 'text-purple-500' },
  cash: { label: 'Dinheiro', icon: CreditCard, color: 'text-green-500' },
  card: { label: 'Cartão', icon: CreditCard, color: 'text-blue-500' },
};

const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { settings } = useStore();
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');

  useEffect(() => {
    if (orderId) {
      fetchOrder();
      setShareUrl(window.location.href);
      
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
            console.log('Order updated:', payload);
            fetchOrder();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrder(data as OrderDetails);
      
      // Calcular tempo estimado baseado no status
      if (data) {
        calculateEstimatedTime(data.created_at, data.status);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Erro ao carregar pedido');
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimatedTime = (createdAt: string, status: string) => {
    const created = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diffMinutes = Math.floor((now - created) / (1000 * 60));

    if (status === 'DELIVERED') {
      setEstimatedTime('Pedido entregue');
    } else if (status === 'CANCELLED') {
      setEstimatedTime('Pedido cancelado');
    } else if (status === 'READY') {
      setEstimatedTime('Saindo para entrega');
    } else if (status === 'PREPARING') {
      const remaining = 30 - diffMinutes;
      setEstimatedTime(remaining > 0 ? `≈ ${remaining} min restantes` : 'Saindo em breve');
    } else if (status === 'CONFIRMED') {
      setEstimatedTime('Iniciando preparo em breve');
    } else {
      setEstimatedTime('Aguardando confirmação');
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  // FUNÇÃO CORRIGIDA DO WHATSAPP
  const handleWhatsApp = () => {
    if (!settings?.whatsapp) {
      toast.error('Número de WhatsApp não configurado');
      return;
    }

    // Remove todos os caracteres não numéricos
    const phone = settings.whatsapp.replace(/\D/g, '');
    
    // Garantir que tenha o código do país (55 para Brasil)
    const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
    
    const message = encodeURIComponent(
      `Olá! Gostaria de informações sobre meu pedido #${order?.id.substring(0, 8).toUpperCase()}`
    );
    
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
    
    console.log('WhatsApp URL:', whatsappUrl); // Para debug
    window.open(whatsappUrl, '_blank');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;
    return <Icon className={`w-6 h-6 ${config.color}`} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Pedido não encontrado</h2>
            <p className="text-muted-foreground mb-6">
              O pedido que você está procurando não existe ou foi removido.
            </p>
            <Button onClick={() => navigate('/')}>
              Voltar para a página inicial
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStatus = statusConfig[order.status] || statusConfig.PENDING;
  const StatusIcon = currentStatus.icon;
  const PaymentIcon = paymentLabels[order.payment_method]?.icon || CreditCard;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 md:py-12">
      <div className="container max-w-3xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              Acompanhar Pedido
            </h1>
          </div>
          <p className="text-muted-foreground">
            Pedido #{order.id.substring(0, 8).toUpperCase()}
          </p>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="overflow-hidden border-2 border-primary/10">
            <div className={`h-2 ${
              order.status === 'DELIVERED' ? 'bg-green-500' :
              order.status === 'CANCELLED' ? 'bg-red-500' :
              'bg-primary'
            }`} />
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${
                    order.status === 'DELIVERED' ? 'from-green-500/20 to-green-600/20' :
                    order.status === 'CANCELLED' ? 'from-red-500/20 to-red-600/20' :
                    'from-primary/20 to-primary/30'
                  }`}>
                    <StatusIcon className={`w-10 h-10 ${currentStatus.color}`} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{currentStatus.label}</h2>
                    <p className="text-muted-foreground">{currentStatus.description}</p>
                  </div>
                </div>
                <Badge 
                  variant={order.status === 'DELIVERED' ? 'default' : 'outline'}
                  className="text-sm py-1"
                >
                  {order.status === 'DELIVERED' ? '✅ Entregue' : 
                   order.status === 'CANCELLED' ? '❌ Cancelado' : 
                   '🔄 Em andamento'}
                </Badge>
              </div>

              {/* Progress Bar */}
              {order.status !== 'CANCELLED' && (
                <div className="mt-6">
                  <Progress value={currentStatus.progress} className="h-2" />
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-muted-foreground">Pedido recebido</span>
                    <span className="text-xs text-muted-foreground">Em preparo</span>
                    <span className="text-xs text-muted-foreground">Saiu para entrega</span>
                    <span className="text-xs text-muted-foreground">Entregue</span>
                  </div>
                </div>
              )}

              {/* Estimated Time */}
              {estimatedTime && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                <div className="mt-4 flex items-center gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-medium">Tempo estimado:</span>
                  <span>{estimatedTime}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Order Details */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Customer Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Dados do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">Nome</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{order.customer_phone}</p>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{order.customer_address}</p>
                    {order.customer_complement && (
                      <p className="text-xs text-muted-foreground">{order.customer_complement}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Endereço de entrega</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{formatDate(order.created_at)}</p>
                    <p className="text-xs text-muted-foreground">Data do pedido</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <PaymentIcon className={`w-5 h-5 ${paymentLabels[order.payment_method]?.color}`} />
                    <div>
                      <p className="font-medium">{paymentLabels[order.payment_method]?.label}</p>
                      <p className="text-xs text-muted-foreground">Forma de pagamento</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-primary font-bold">
                    R$ {order.total.toFixed(2)}
                  </Badge>
                </div>

                {order.payment_method === 'cash' && order.needs_change && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Troco para: </span>
                      <span className="font-bold text-green-600">R$ {order.change_for?.toFixed(2)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Troco: R$ {(Number(order.change_for) - order.total).toFixed(2)}
                    </p>
                  </div>
                )}

                {order.payment_method === 'pix' && (
                  <Alert>
                    <QrCode className="h-4 w-4" />
                    <AlertDescription>
                      Pagamento PIX confirmado automaticamente.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Items List - CORRIGIDO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Itens do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">{item.quantity}x</span>
                          {item.type === 'pizza' ? (
                            <div>
                              <p className="font-medium">
                                Pizza {item.size} - {item.flavors?.map((f: any) => f.name).join(' + ')}
                              </p>
                              {item.border && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  🧀 Borda: {item.border.name}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="font-medium">{item.product?.name || item.name}</p>
                          )}
                        </div>
                        {item.observation && (
                          <p className="text-xs text-muted-foreground mt-1 ml-6">
                            📝 Obs: {item.observation}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">
                          R$ {(item.unitPrice * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          R$ {item.unitPrice.toFixed(2)} cada
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <Separator className="my-4" />

                <div className="flex justify-between items-center">
                  <span className="text-lg text-muted-foreground">Total</span>
                  <span className="text-3xl font-bold text-primary">
                    R$ {order.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex flex-col sm:flex-row gap-3"
        >
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={copyShareLink}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Link copiado!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Compartilhar pedido
              </>
            )}
          </Button>

          <Button
            className="flex-1 gap-2"
            onClick={handleWhatsApp}
          >
            <Phone className="w-4 h-4" />
            Falar com a pizzaria
          </Button>

          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={fetchOrder}
          >
            <RotateCw className="w-4 h-4" />
            Atualizar status
          </Button>
        </motion.div>

        {/* Back to home */}
        <div className="text-center mt-8">
          <Button
            variant="link"
            onClick={() => navigate('/')}
            className="text-muted-foreground"
          >
            <Home className="w-4 h-4 mr-2" />
            Voltar para a página inicial
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;