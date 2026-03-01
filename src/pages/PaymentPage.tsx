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

  const isStoreOpen = settings?.isOpen; // ✅ REGRA ÚNICA

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

  // 🔒 BLOQUEIO CENTRALIZADO
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

  if (!customerInfo) return null;

  return (
    <>
      {/* TODO O JSX PERMANECE IGUAL */}
      {/* Nenhuma alteração visual foi necessária */}
    </>
  );
};

export default PaymentPage;