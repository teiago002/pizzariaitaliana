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
  Split,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useStore } from '@/contexts/StoreContext';
import { useOrders } from '@/hooks/useOrders';
import { CustomerInfo, PaymentMethod, SplitPayment } from '@/types';
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'split'>('pix');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [pixLoading, setPixLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  
  // Estados para split payment
  const [splitStep, setSplitStep] = useState<'first' | 'second' | 'values'>('first');
  const [firstMethod, setFirstMethod] = useState<'pix' | 'cash' | 'card' | null>(null);
  const [secondMethod, setSecondMethod] = useState<'pix' | 'cash' | 'card' | null>(null);
  const [firstAmount, setFirstAmount] = useState('');
  const [secondAmount, setSecondAmount] = useState('');
  const [splitError, setSplitError] = useState('');
  
  // Estados para PIX no split
  const [showSplitPixModal, setShowSplitPixModal] = useState(false);
  const [splitPixCode, setSplitPixCode] = useState('');
  const [splitPixLoading, setSplitPixLoading] = useState(false);

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

  useEffect(() => {
    if (showPixModal) {
      setTimeLeft(600);
    }
  }, [showPixModal]);

  // Reset split quando mudar de método
  useEffect(() => {
    if (paymentMethod !== 'split') {
      resetSplit();
    }
  }, [paymentMethod]);

  const resetSplit = () => {
    setSplitStep('first');
    setFirstMethod(null);
    setSecondMethod(null);
    setFirstAmount('');
    setSecondAmount('');
    setSplitError('');
  };

  if (items.length === 0 && !showSuccessModal) {
    navigate('/carrinho');
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const validateSplitPayments = () => {
    const first = parseFloat(firstAmount) || 0;
    const second = parseFloat(secondAmount) || 0;
    const totalSplit = first + second;
    
    if (Math.abs(totalSplit - total) > 0.01) {
      setSplitError(`A soma dos valores (R$ ${totalSplit.toFixed(2)}) é diferente do total (R$ ${total.toFixed(2)})`);
      return false;
    }

    if (first <= 0 || second <= 0) {
      setSplitError('Os valores devem ser maiores que zero');
      return false;
    }

    setSplitError('');
    return true;
  };

  const handleFirstMethodSelect = (method: 'pix' | 'cash' | 'card') => {
    setFirstMethod(method);
    setSplitStep('second');
  };

  const handleSecondMethodSelect = (method: 'pix' | 'cash' | 'card') => {
    if (method === firstMethod) {
      toast.error('Escolha uma forma de pagamento diferente da primeira');
      return;
    }
    setSecondMethod(method);
    setSplitStep('values');
  };

  const handleSplitPayment = async () => {
    if (!customerInfo) return;
    
    if (!validateSplitPayments()) {
      toast.error(splitError);
      return;
    }

    const first = parseFloat(firstAmount) || 0;
    const second = parseFloat(secondAmount) || 0;

    const splitPayments: SplitPayment[] = [
      { method: firstMethod as 'cash' | 'card' | 'pix', amount: first },
      { method: secondMethod as 'cash' | 'card' | 'pix', amount: second },
    ];

    console.log('Split payments:', splitPayments);
    console.log('Total:', total);
    console.log('Customer:', customerInfo);

    // Se algum dos métodos for PIX, precisamos gerar o PIX
    if (firstMethod === 'pix' || secondMethod === 'pix') {
      await handleSplitPixPayment(splitPayments);
    } else {
      await processSplitOrder(splitPayments);
    }
  };

  const handleSplitPixPayment = async (splitPayments: SplitPayment[]) => {
    if (!customerInfo) return;

    setSplitPixLoading(true);
    try {
      // Criar o pedido primeiro
      const newOrderId = await createOrder(
        items,
        customerInfo,
        'split',
        total,
        false,
        undefined,
        splitPayments
      );

      console.log('Order ID retornado (split pix):', newOrderId);

      if (!newOrderId) throw new Error('Erro ao criar pedido - ID não retornado');

      setOrderId(newOrderId);

      // Gerar PIX para o valor total
      const { data, error } = await supabase.functions.invoke('generate-pix', {
        body: { 
          orderId: newOrderId, 
          amount: total, 
          customerName: customerInfo.name 
        },
      });

      if (error) throw new Error(error.message || 'Erro ao gerar PIX');

      if (!data?.pixCode) {
        throw new Error('PIX code não recebido');
      }

      setSplitPixCode(data.pixCode);
      setShowSplitPixModal(true);
      
    } catch (error: any) {
      console.error('Erro detalhado:', error);
      toast.error(error.message || 'Erro ao gerar PIX');
    } finally {
      setSplitPixLoading(false);
    }
  };

  const processSplitOrder = async (splitPayments: SplitPayment[]) => {
    if (!customerInfo) return;

    setIsProcessing(true);
    try {
      console.log('Criando pedido split...', { splitPayments, total, customerInfo });
      
      const newOrderId = await createOrder(
        items,
        customerInfo,
        'split',
        total,
        false,
        undefined,
        splitPayments
      );

      console.log('Order ID retornado:', newOrderId);

      if (!newOrderId) throw new Error('Erro ao criar pedido - ID não retornado');

      await confirmOrder(newOrderId);
      clearCart();
      sessionStorage.removeItem('customerInfo');
      setOrderId(newOrderId);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Erro detalhado no split payment:', error);
      toast.error(`Erro ao processar pagamento: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPayment = () => {
    if (!isStoreOpen) {
      toast.error('A pizzaria está fechada no momento.');
      return;
    }

    if (paymentMethod === 'split') {
      if (splitStep === 'first') {
        toast.error('Selecione a primeira forma de pagamento');
        return;
      }
      if (splitStep === 'second') {
        toast.error('Selecione a segunda forma de pagamento');
        return;
      }
      handleSplitPayment();
    } else if (paymentMethod === 'pix') {
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
      if (!newOrderId) throw new Error('Erro ao criar pedido - ID não retornado');

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
      console.log('Processando pagamento em dinheiro...', { total, needsChange, changeFor });

      const newOrderId = await createOrder(
        items,
        customerInfo,
        'cash',
        total,
        needsChange,
        needsChange ? Number(changeFor) : undefined
      );

      console.log('Order ID:', newOrderId);

      if (!newOrderId) throw new Error('Erro ao criar pedido - ID não retornado');

      await confirmOrder(newOrderId);
      clearCart();
      sessionStorage.removeItem('customerInfo');
      setOrderId(newOrderId);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Erro detalhado no pagamento dinheiro:', error);
      toast.error(`Erro ao processar pedido: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    if (!customerInfo) return;

    setIsProcessing(true);
    try {
      const newOrderId = await createOrder(items, customerInfo, 'card', total);
      if (!newOrderId) throw new Error('Erro ao criar pedido - ID não retornado');
      
      await confirmOrder(newOrderId);
      clearCart();
      sessionStorage.removeItem('customerInfo');
      setOrderId(newOrderId);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Erro detalhado no pagamento cartão:', error);
      toast.error(`Erro ao processar pedido: ${error.message || 'Erro desconhecido'}`);
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

  const copySplitPixCode = () => {
    navigator.clipboard.writeText(splitPixCode);
    toast.success('Código PIX copiado!');
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
                  onValueChange={(value) => {
                    setPaymentMethod(value as any);
                    resetSplit();
                  }}
                  className="space-y-3"
                >
                  {[
                    { value: 'pix', icon: QrCode, label: 'PIX', desc: 'Pague com QR Code', color: 'text-primary' },
                    { value: 'cash', icon: Banknote, label: 'Dinheiro', desc: 'Pague na entrega', color: 'text-green-600' },
                    { value: 'card', icon: CreditCard, label: 'Cartão', desc: 'Débito ou crédito na entrega', color: 'text-blue-600' },
                    { value: 'split', icon: Split, label: 'Dividir pagamento', desc: 'Use 2 formas diferentes', color: 'text-purple-600' },
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

                {/* Split Payment Interface */}
                <AnimatePresence>
                  {paymentMethod === 'split' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-4 overflow-hidden"
                    >
                      <Separator />
                      
                      {splitStep === 'first' && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium">Escolha a 1ª forma de pagamento:</p>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: 'pix', label: '📱 PIX' },
                              { value: 'cash', label: '💵 Dinheiro' },
                              { value: 'card', label: '💳 Cartão' },
                            ].map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => handleFirstMethodSelect(opt.value as any)}
                                className="p-3 rounded-xl border-2 text-sm font-medium transition-all hover:border-primary/40"
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {splitStep === 'second' && firstMethod && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium">Escolha a 2ª forma de pagamento:</p>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: 'pix', label: '📱 PIX' },
                              { value: 'cash', label: '💵 Dinheiro' },
                              { value: 'card', label: '💳 Cartão' },
                            ]
                              .filter(opt => opt.value !== firstMethod)
                              .map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => handleSecondMethodSelect(opt.value as any)}
                                  className="p-3 rounded-xl border-2 text-sm font-medium transition-all hover:border-primary/40"
                                >
                                  {opt.label}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {splitStep === 'values' && firstMethod && secondMethod && (
                        <div className="space-y-4">
                          <p className="text-sm font-medium">Digite os valores:</p>
                          
                          <div className="space-y-3">
                            <div className="p-3 bg-muted/20 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                {firstMethod === 'pix' && <QrCode className="w-4 h-4 text-primary" />}
                                {firstMethod === 'cash' && <Banknote className="w-4 h-4 text-green-600" />}
                                {firstMethod === 'card' && <CreditCard className="w-4 h-4 text-blue-600" />}
                                <span className="text-sm font-medium capitalize">
                                  {firstMethod === 'pix' ? 'PIX' : firstMethod === 'cash' ? 'Dinheiro' : 'Cartão'}
                                </span>
                              </div>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                                <Input
                                  type="number"
                                  min={1}
                                  max={total - 1}
                                  step="0.01"
                                  value={firstAmount}
                                  onChange={(e) => {
                                    setFirstAmount(e.target.value);
                                    // Limpa o erro quando o usuário digita
                                    setSplitError('');
                                  }}
                                  placeholder="0,00"
                                  className="pl-8"
                                />
                              </div>
                            </div>

                            <div className="p-3 bg-muted/20 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                {secondMethod === 'pix' && <QrCode className="w-4 h-4 text-primary" />}
                                {secondMethod === 'cash' && <Banknote className="w-4 h-4 text-green-600" />}
                                {secondMethod === 'card' && <CreditCard className="w-4 h-4 text-blue-600" />}
                                <span className="text-sm font-medium capitalize">
                                  {secondMethod === 'pix' ? 'PIX' : secondMethod === 'cash' ? 'Dinheiro' : 'Cartão'}
                                </span>
                              </div>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                                <Input
                                  type="number"
                                  min={1}
                                  max={total - 1}
                                  step="0.01"
                                  value={secondAmount}
                                  onChange={(e) => {
                                    setSecondAmount(e.target.value);
                                    // Limpa o erro quando o usuário digita
                                    setSplitError('');
                                  }}
                                  placeholder="0,00"
                                  className="pl-8"
                                />
                              </div>
                            </div>
                          </div>

                          {splitError && (
                            <Alert variant="destructive" className="py-2">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                {splitError}
                              </AlertDescription>
                            </Alert>
                          )}

                          <div className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded-lg">
                            <span className="font-medium">Total distribuído:</span>
                            <span className={`font-bold ${
                              Math.abs((parseFloat(firstAmount)||0) + (parseFloat(secondAmount)||0) - total) < 0.01
                                ? 'text-green-600'
                                : 'text-destructive'
                            }`}>
                              R$ {((parseFloat(firstAmount)||0) + (parseFloat(secondAmount)||0)).toFixed(2)}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            A soma dos valores deve ser igual ao total do pedido.
                          </p>
                        </div>
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
              disabled={
                !isStoreOpen || 
                isProcessing || 
                (paymentMethod === 'split' && (
                  splitStep !== 'values' || 
                  !firstAmount || 
                  !secondAmount || 
                  splitError !== ''
                ))
              }
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

        {/* Modal PIX normal */}
        <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden">
            <div className="relative">
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
                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-2xl shadow-xl">
                        <QRCodeSVG value={pixCode} size={220} />
                      </div>
                    </div>

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

                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Pagamento seguro</p>
                          <p className="text-xs text-muted-foreground">
                            Após o pagamento, seu pedido será confirmado automaticamente.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Smartphone className="w-4 h-4" />
                      <span>Abra o app do seu banco e escaneie o QR Code</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal PIX para split payment */}
        <Dialog open={showSplitPixModal} onOpenChange={setShowSplitPixModal}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden">
            <div className="relative">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
                <DialogHeader className="p-0">
                  <DialogTitle className="text-xl text-white flex items-center gap-2">
                    <QrCode className="w-6 h-6" />
                    Pagamento PIX - Pedido Dividido
                  </DialogTitle>
                  <DialogDescription className="text-white/80">
                    Escaneie o QR Code para pagar o valor total
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-6">
                {splitPixLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Gerando código PIX...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-2xl shadow-xl">
                        <QRCodeSVG value={splitPixCode} size={220} />
                      </div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pedido</span>
                        <span className="font-medium">#{orderId.slice(0, 8).toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Valor total</span>
                        <span className="font-bold text-primary">R$ {total.toFixed(2)}</span>
                      </div>
                      {firstMethod && secondMethod && (
                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          <p>Dividido: {firstMethod === 'pix' ? '📱' : firstMethod === 'cash' ? '💵' : '💳'} R$ {parseFloat(firstAmount||'0').toFixed(2)} + {secondMethod === 'pix' ? '📱' : secondMethod === 'cash' ? '💵' : '💳'} R$ {parseFloat(secondAmount||'0').toFixed(2)}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Código PIX (copia e cola)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={splitPixCode}
                          readOnly
                          className="font-mono text-xs bg-muted/30"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={copySplitPixCode}
                          className="shrink-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => {
                        setShowSplitPixModal(false);
                        setShowSuccessModal(true);
                      }}
                    >
                      PIX realizado? Finalizar pedido
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de sucesso */}
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