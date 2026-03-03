import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  QrCode,
  Banknote,
  CreditCard,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  Clock,
  Shield,
  Smartphone,
  Ban,
  ChevronRight,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useStore } from '@/contexts/StoreContext';
import { useOrders } from '@/hooks/useOrders';
import { CustomerInfo, PaymentMethod } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const { settings } = useStore();
  const { createOrder, confirmOrder } = useOrders();

  const isStoreOpen = settings?.isOpen;

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [pixLoading, setPixLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos em segundos

  useEffect(() => {
    const saved = sessionStorage.getItem('customerInfo');
    if (saved) {
      setCustomerInfo(JSON.parse(saved));
    } else {
      navigate('/checkout');
    }
  }, [navigate]);

  // Timer para o PIX
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showPixModal && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showPixModal, timeLeft]);

  // Reset timer quando abrir modal
  useEffect(() => {
    if (showPixModal) {
      setTimeLeft(600);
    }
  }, [showPixModal]);

  if (items.length === 0 && !showSuccessModal) {
    navigate('/carrinho');
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConfirmPayment = () => {
    if (!isStoreOpen) {
      toast.error('A pizzaria está fechada no momento.');
      return;
    }

    if (paymentMethod === 'pix') {
      handlePixPayment();
    } else if (paymentMethod === 'cash') {
      handleCashPayment();
    } else {
      handleCardPayment();
    }
  };

  const handlePixPayment = async () => {
    if (!customerInfo) return;

    setIsProcessing(true);
    setPixLoading(true);

    try {
      const newOrderId = await createOrder(items, customerInfo, 'pix', total);
      if (!newOrderId) throw new Error('Erro ao criar pedido');

      setOrderId(newOrderId);

      const customerName = customerInfo.name || 'Cliente';
      
      const { data, error } = await supabase.functions.invoke('generate-pix', {
        body: { 
          orderId: newOrderId, 
          amount: total, 
          customerName: customerName 
        },
      });

      if (error) throw new Error(error.message || 'Erro ao gerar PIX');

      if (!data?.pixCode) {
        throw new Error('PIX code não recebido');
      }

      setPixCode(data.pixCode);
      setShowPixModal(true);
      
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error(error.message || 'Erro ao gerar PIX. Tente novamente.');
    } finally {
      setIsProcessing(false);
      setPixLoading(false);
    }
  };

  const handleCashPayment = async () => {
    if (!customerInfo) return;

    if (needsChange && (!changeFor || Number(changeFor) <= total)) {
      toast.error('O valor do troco deve ser maior que o total.');
      return;
    }

    setIsProcessing(true);
    try {
      const newOrderId = await createOrder(
        items,
        customerInfo,
        'cash',
        total,
        needsChange,
        needsChange ? Number(changeFor) : undefined
      );

      await confirmOrder(newOrderId);
      clearCart();
      sessionStorage.removeItem('customerInfo');
      setOrderId(newOrderId);
      setShowSuccessModal(true);
    } catch {
      toast.error('Erro ao processar pedido.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    if (!customerInfo) return;

    setIsProcessing(true);
    try {
      const newOrderId = await createOrder(items, customerInfo, 'card', total);
      await confirmOrder(newOrderId);

      clearCart();
      sessionStorage.removeItem('customerInfo');
      setOrderId(newOrderId);
      setShowSuccessModal(true);
    } catch {
      toast.error('Erro ao processar pedido.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast.success('Código PIX copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!customerInfo) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 md:py-12">
      <div className="container max-w-2xl mx-auto px-4">
        {/* Header com voltar */}
        <button
          onClick={() => navigate('/checkout')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-all group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Voltar para dados</span>
        </button>

        {/* Título */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Pagamento
          </h1>
          <p className="text-muted-foreground">
            Escolha a forma de pagamento e confirme seu pedido
          </p>
        </motion.div>

        {/* Status da loja */}
        <AnimatePresence>
          {!isStoreOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-6"
            >
              <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
                <Ban className="h-4 w-4" />
                <AlertTitle>Loja fechada</AlertTitle>
                <AlertDescription>
                  No momento não estamos aceitando pedidos. Volte durante nosso horário de funcionamento.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cards de resumo e pagamento em grid */}
        <div className="space-y-6">
          {/* Resumo do pedido */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden border-2 hover:border-primary/20 transition-colors">
              <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Resumo do pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-2">
                  {items.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.quantity}x {item.type === 'pizza' 
                          ? `Pizza ${(item as any).size}` 
                          : (item as any).product?.name || 'Item'}
                      </span>
                      <span>R$ {(item.unitPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  {items.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{items.length - 3} outros itens
                    </p>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entrega</span>
                  <Badge variant="outline" className="text-xs">Grátis</Badge>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary text-2xl">R$ {total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Formas de pagamento */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-2 hover:border-primary/20 transition-colors">
              <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Forma de pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                  className="space-y-3"
                >
                  {[
                    { value: 'pix', icon: QrCode, label: 'PIX', desc: 'Pague com QR Code', color: 'text-primary' },
                    { value: 'cash', icon: Banknote, label: 'Dinheiro', desc: 'Pague na entrega', color: 'text-green-600' },
                    { value: 'card', icon: CreditCard, label: 'Cartão', desc: 'Débito ou crédito na entrega', color: 'text-blue-600' },
                  ].map((method) => (
                    <label
                      key={method.value}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        paymentMethod === method.value
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-primary/30 hover:bg-muted/30'
                      }`}
                    >
                      <RadioGroupItem value={method.value} id={method.value} className="sr-only" />
                      <method.icon className={`w-6 h-6 ${method.color}`} />
                      <div className="flex-1">
                        <p className="font-medium">{method.label}</p>
                        <p className="text-xs text-muted-foreground">{method.desc}</p>
                      </div>
                      {paymentMethod === method.value && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </label>
                  ))}
                </RadioGroup>

                {/* Campo de troco para dinheiro */}
                <AnimatePresence>
                  {paymentMethod === 'cash' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-3 overflow-hidden"
                    >
                      <Separator />
                      <div className="flex items-center gap-2 p-2">
                        <input
                          type="checkbox"
                          id="needsChange"
                          checked={needsChange}
                          onChange={(e) => setNeedsChange(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="needsChange" className="text-sm font-medium">
                          Precisa de troco?
                        </Label>
                      </div>

                      {needsChange && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <Label htmlFor="changeFor" className="text-sm">Troco para quanto?</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                            <Input
                              id="changeFor"
                              type="number"
                              min={total + 1}
                              step="0.01"
                              value={changeFor}
                              onChange={(e) => setChangeFor(e.target.value)}
                              placeholder="0,00"
                              className="pl-8"
                            />
                          </div>
                          {changeFor && (
                            <p className="text-sm text-muted-foreground">
                              Troco: <span className="text-green-600 font-medium">R$ {(Number(changeFor) - total).toFixed(2)}</span>
                            </p>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Botão de confirmação */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              size="lg"
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all"
              disabled={!isStoreOpen || isProcessing}
              onClick={handleConfirmPayment}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  Confirmar pedido
                  <ChevronRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </motion.div>
        </div>

        {/* Modal PIX - VERSÃO MODERNA */}
        <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden">
            <div className="relative">
              {/* Header decorativo */}
              <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-white">
                <DialogHeader className="p-0">
                  <DialogTitle className="text-xl text-white flex items-center gap-2">
                    <QrCode className="w-6 h-6" />
                    Pagamento PIX
                  </DialogTitle>
                  <DialogDescription className="text-white/80">
                    Escaneie o QR Code ou copie o código PIX
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Timer */}
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-medium">
                <Clock className="w-3 h-3 inline mr-1" />
                {formatTime(timeLeft)}
              </div>

              <div className="p-6">
                {pixLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Gerando código PIX...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* QR Code */}
                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-2xl shadow-xl">
                        <QRCodeSVG value={pixCode} size={220} />
                      </div>
                    </div>

                    {/* Informações do pedido */}
                    <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pedido</span>
                        <span className="font-medium">#{orderId.slice(0, 8).toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Valor</span>
                        <span className="font-bold text-primary">R$ {total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Código PIX e botão copiar */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Código PIX (copia e cola)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={pixCode}
                          readOnly
                          className="font-mono text-xs bg-muted/30"
                        />
                        <Button
                          size="icon"
                          variant={copied ? "default" : "outline"}
                          onClick={copyPixCode}
                          className="shrink-0 transition-all"
                        >
                          {copied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Instruções */}
                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Pagamento seguro</p>
                          <p className="text-xs text-muted-foreground">
                            Após o pagamento, seu pedido será confirmado automaticamente.
                            Você pode acompanhar o status na página de acompanhamento.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* App do banco */}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Smartphone className="w-4 h-4" />
                      <span>Abra o app do seu banco, escolha PIX e escaneie o QR Code</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de sucesso - VERSÃO MODERNA */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="sm:max-w-md">
            <div className="text-center py-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
              </motion.div>
              
              <DialogHeader className="text-center">
                <DialogTitle className="text-2xl">Pedido confirmado!</DialogTitle>
                <DialogDescription className="text-base mt-2">
                  Seu pedido #{orderId.slice(0, 8).toUpperCase()} foi recebido com sucesso.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Em breve você receberá atualizações do seu pedido por WhatsApp.
                </p>

                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total pago</p>
                  <p className="text-3xl font-bold text-primary">R$ {total.toFixed(2)}</p>
                </div>

                <Button
                  className="w-full h-12 text-base"
                  onClick={() => {
                    setShowSuccessModal(false);
                    navigate('/pedido/' + orderId);
                  }}
                >
                  Acompanhar pedido
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setShowSuccessModal(false);
                    navigate('/');
                  }}
                >
                  Voltar para a home
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PaymentPage;