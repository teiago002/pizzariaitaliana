import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, QrCode, Banknote, CreditCard, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useStore } from '@/contexts/StoreContext';
import { CustomerInfo, PaymentMethod, Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const { addOrder, settings } = useStore();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('customerInfo');
    if (saved) {
      setCustomerInfo(JSON.parse(saved));
    } else {
      navigate('/checkout');
    }
  }, [navigate]);

  // Redirect if cart is empty
  if (items.length === 0 && !showSuccessModal) {
    navigate('/carrinho');
    return null;
  }

  const generateOrderId = () => {
    return `PED-${Date.now().toString(36).toUpperCase()}`;
  };

  const createOrder = (status: 'PENDING' | 'CONFIRMED'): Order => {
    const id = generateOrderId();
    setOrderId(id);
    return {
      id,
      items: [...items],
      customer: customerInfo!,
      payment: {
        method: paymentMethod,
        needsChange: paymentMethod === 'cash' ? needsChange : undefined,
        changeFor: paymentMethod === 'cash' && needsChange ? parseFloat(changeFor) : undefined,
      },
      status,
      total,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  const handlePixPayment = () => {
    setShowPixModal(true);
  };

  const confirmPixPayment = () => {
    setIsProcessing(true);
    // Simulate payment confirmation
    setTimeout(() => {
      const order = createOrder('CONFIRMED');
      addOrder(order);
      setShowPixModal(false);
      setIsProcessing(false);
      clearCart();
      sessionStorage.removeItem('customerInfo');
      setShowSuccessModal(true);
    }, 2000);
  };

  const handleCashPayment = () => {
    if (needsChange && (!changeFor || parseFloat(changeFor) <= total)) {
      toast.error('O valor para troco deve ser maior que o total do pedido');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const order = createOrder('CONFIRMED');
      addOrder(order);
      setIsProcessing(false);
      clearCart();
      sessionStorage.removeItem('customerInfo');
      setShowSuccessModal(true);
    }, 1000);
  };

  const handleCardPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const order = createOrder('CONFIRMED');
      addOrder(order);
      setIsProcessing(false);
      clearCart();
      sessionStorage.removeItem('customerInfo');
      setShowSuccessModal(true);
    }, 1000);
  };

  const handleConfirmPayment = () => {
    if (paymentMethod === 'pix') {
      handlePixPayment();
    } else if (paymentMethod === 'cash') {
      handleCashPayment();
    } else {
      handleCardPayment();
    }
  };

  const paymentOptions = [
    {
      id: 'pix' as PaymentMethod,
      label: 'PIX',
      description: 'Pagamento instantâneo via QR Code',
      icon: QrCode,
    },
    {
      id: 'cash' as PaymentMethod,
      label: 'Dinheiro',
      description: 'Pagamento na entrega',
      icon: Banknote,
    },
    {
      id: 'card' as PaymentMethod,
      label: 'Cartão',
      description: 'Maquininha na entrega',
      icon: CreditCard,
    },
  ];

  if (!customerInfo) {
    return null;
  }

  return (
    <div className="min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate('/checkout')}
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </button>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Forma de Pagamento
          </h1>
        </motion.div>

        {/* Payment Warning */}
        <Alert className="mb-6 border-warning bg-warning/10">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">Importante</AlertTitle>
          <AlertDescription>
            Seu pedido só será confirmado após a conclusão do pagamento. 
            Pedidos não pagos não serão processados.
          </AlertDescription>
        </Alert>

        {/* Payment Methods */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Escolha como pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              className="space-y-3"
            >
              {paymentOptions.map((option) => (
                <div key={option.id}>
                  <RadioGroupItem value={option.id} id={option.id} className="peer sr-only" />
                  <Label
                    htmlFor={option.id}
                    className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <option.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Cash Options */}
        {paymentMethod === 'cash' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Precisa de troco?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={!needsChange ? 'default' : 'outline'}
                    onClick={() => {
                      setNeedsChange(false);
                      setChangeFor('');
                    }}
                    className="flex-1"
                  >
                    Não
                  </Button>
                  <Button
                    type="button"
                    variant={needsChange ? 'default' : 'outline'}
                    onClick={() => setNeedsChange(true)}
                    className="flex-1"
                  >
                    Sim
                  </Button>
                </div>

                {needsChange && (
                  <div>
                    <Label htmlFor="changeFor">Troco para quanto?</Label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        R$
                      </span>
                      <Input
                        id="changeFor"
                        type="number"
                        value={changeFor}
                        onChange={(e) => setChangeFor(e.target.value)}
                        placeholder="0,00"
                        className="pl-10"
                        min={total}
                        step="0.01"
                      />
                    </div>
                    {changeFor && parseFloat(changeFor) > total && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Troco: R$ {(parseFloat(changeFor) - total).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Card Notice */}
        {paymentMethod === 'card' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <Alert className="mb-6 border-secondary bg-secondary/10">
              <CreditCard className="h-4 w-4 text-secondary" />
              <AlertTitle className="text-secondary">Pagamento na Entrega</AlertTitle>
              <AlertDescription>
                O entregador levará a maquininha para você efetuar o pagamento no momento da entrega.
                Aceitamos débito e crédito.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Order Summary */}
        <Card className="mb-6 bg-muted/30">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Entrega para:</span>
                <span className="font-medium text-foreground">{customerInfo.name}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Endereço:</span>
                <span className="font-medium text-foreground text-right max-w-[60%]">
                  {customerInfo.address}
                </span>
              </div>
              <div className="border-t border-border pt-2 mt-2 flex justify-between items-center">
                <span className="font-semibold">Total do Pedido</span>
                <span className="text-2xl font-bold text-primary">
                  R$ {total.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          size="lg"
          className="w-full"
          onClick={handleConfirmPayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              Confirmar Pedido
              <Check className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* PIX Modal */}
      <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Pagamento via PIX</DialogTitle>
            <DialogDescription className="text-center">
              Escaneie o QR Code abaixo para pagar
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="w-48 h-48 mx-auto bg-foreground rounded-lg flex items-center justify-center p-4">
              {/* Simulated QR Code */}
              <div className="w-full h-full bg-background rounded grid grid-cols-5 grid-rows-5 gap-1 p-2">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-sm ${Math.random() > 0.5 ? 'bg-foreground' : 'bg-transparent'}`}
                  />
                ))}
              </div>
            </div>

            <p className="text-center text-muted-foreground mt-4 text-sm">
              Valor: <span className="font-bold text-primary">R$ {total.toFixed(2)}</span>
            </p>
          </div>

          <Button onClick={confirmPixPayment} disabled={isProcessing} className="w-full">
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Confirmando pagamento...
              </>
            ) : (
              'Já paguei'
            )}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm">
          <div className="text-center py-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 mx-auto rounded-full bg-secondary flex items-center justify-center mb-6"
            >
              <Check className="w-10 h-10 text-secondary-foreground" />
            </motion.div>

            <DialogTitle className="text-2xl mb-2">Pedido Confirmado!</DialogTitle>
            <DialogDescription className="text-base">
              Seu pedido <span className="font-bold text-primary">{orderId}</span> foi recebido com sucesso.
            </DialogDescription>

            <div className="mt-6 p-4 bg-muted rounded-lg text-sm text-left">
              <p className="font-semibold mb-2">Resumo:</p>
              <p className="text-muted-foreground">Entrega para: {customerInfo?.name}</p>
              <p className="text-muted-foreground">Total: R$ {total.toFixed(2)}</p>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Você receberá atualizações pelo WhatsApp
            </p>

            <Button onClick={() => navigate('/')} className="w-full mt-6">
              Voltar ao Início
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentPage;
