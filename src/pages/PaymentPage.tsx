import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  QrCode,
  Banknote,
  CreditCard,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  MessageCircle,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useSettings } from '@/hooks/useSettings';
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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const { settings } = useSettings();
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

  useEffect(() => {
    const saved = sessionStorage.getItem('customerInfo');
    if (saved) {
      setCustomerInfo(JSON.parse(saved));
    } else {
      navigate('/checkout');
    }
  }, [navigate]);

  if (items.length === 0 && !showSuccessModal) {
    navigate('/carrinho');
    return null;
  }

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
      if (!newOrderId) throw new Error();

      setOrderId(newOrderId);

      const { data, error } = await supabase.functions.invoke('generate-pix', {
        body: { orderId: newOrderId, amount: total, customerName: customerInfo.name },
      });

      if (error) throw error;

      setPixCode(data.pixCode);
      setShowPixModal(true);
    } catch {
      toast.error('Erro ao gerar PIX.');
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
    toast.success('Código PIX copiado!');
  };

  const handleWhatsApp = () => {
    const message = `Olá! Meu pedido nº ${orderId} foi pago via PIX.`;
    const whatsappUrl = `https://wa.me/${settings?.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!customerInfo) return null;

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="container max-w-2xl mx-auto px-4">
        {/* Header com voltar */}
        <button
          onClick={() => navigate('/checkout')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
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
            Escolha a forma de pagamento
          </p>
        </motion.div>

        {/* Status da loja */}
        {!isStoreOpen && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Loja fechada</AlertTitle>
            <AlertDescription>
              No momento não estamos aceitando pedidos. Volte mais tarde.
            </AlertDescription>
          </Alert>
        )}

        {/* Resumo do pedido */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Resumo do pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entrega</span>
              <span>Grátis</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">R$ {total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Formas de pagamento */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Forma de pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                <RadioGroupItem value="pix" id="pix" />
                <Label htmlFor="pix" className="flex items-center gap-2 cursor-pointer flex-1">
                  <QrCode className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">PIX</p>
                    <p className="text-xs text-muted-foreground">Pague com QR Code</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Banknote className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Dinheiro</p>
                    <p className="text-xs text-muted-foreground">Pague na entrega</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Cartão</p>
                    <p className="text-xs text-muted-foreground">Débito ou crédito na entrega</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {/* Campo de troco para dinheiro */}
            {paymentMethod === 'cash' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="needsChange"
                    checked={needsChange}
                    onChange={(e) => setNeedsChange(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="needsChange" className="text-sm">
                    Precisa de troco?
                  </Label>
                </div>

                {needsChange && (
                  <div>
                    <Label htmlFor="changeFor" className="text-sm">Troco para quanto?</Label>
                    <Input
                      id="changeFor"
                      type="number"
                      min={total + 1}
                      step="0.01"
                      value={changeFor}
                      onChange={(e) => setChangeFor(e.target.value)}
                      placeholder="Ex: 100.00"
                      className="mt-1"
                    />
                    {changeFor && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Troco: R$ {(Number(changeFor) - total).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Botão de confirmação */}
        <Button
          size="lg"
          className="w-full"
          disabled={!isStoreOpen || isProcessing}
          onClick={handleConfirmPayment}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            'Confirmar pedido'
          )}
        </Button>

        {/* Modal PIX */}
        <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Pagamento PIX</DialogTitle>
              <DialogDescription>
                Escaneie o QR Code ou copie o código PIX
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center space-y-4 py-4">
              {pixLoading ? (
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              ) : (
                <>
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG value={pixCode} size={200} />
                  </div>

                  <div className="w-full space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={pixCode}
                        readOnly
                        className="text-xs font-mono"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={copyPixCode}
                        title="Copiar código"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>

                    <Button
                      className="w-full gap-2"
                      variant="outline"
                      onClick={handleWhatsApp}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Enviar comprovante
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de sucesso */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                Pedido confirmado!
              </DialogTitle>
              <DialogDescription>
                Seu pedido #{orderId.slice(0, 8).toUpperCase()} foi recebido.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Em breve você receberá atualizações por WhatsApp.
              </p>

              <Button
                className="w-full"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/pedido/' + orderId);
                }}
              >
                Acompanhar pedido
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PaymentPage;