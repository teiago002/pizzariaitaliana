import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, MapPin, Phone, User, Lock } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useStore } from '@/contexts/StoreContext';
import { CustomerInfo } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { isPizzeriaOpen, getNextOpeningMessage } from '@/utils/isPizzeriaOpen';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, total } = useCart();
  const { settings } = useStore();

  const operatingHours = settings.operatingHours;
  const isManuallyOpen = settings.isOpen;

  // 🔥 REGRA CORRETA
  const openNow = isManuallyOpen && isPizzeriaOpen(operatingHours);
  const closedMessage = getNextOpeningMessage();

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    address: '',
    complement: '',
  });

  // Redireciona se carrinho estiver vazio
  if (items.length === 0) {
    navigate('/carrinho');
    return null;
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setCustomerInfo(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(
      7,
      11
    )}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerInfo(prev => ({
      ...prev,
      phone: formatPhone(e.target.value),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!openNow) {
      toast.error('Estamos fechados no momento.');
      return;
    }

    if (!customerInfo.name.trim()) {
      toast.error('Informe seu nome completo');
      return;
    }

    if (customerInfo.phone.replace(/\D/g, '').length < 10) {
      toast.error('Informe um telefone válido');
      return;
    }

    if (!customerInfo.address.trim()) {
      toast.error('Informe o endereço de entrega');
      return;
    }

    sessionStorage.setItem('customerInfo', JSON.stringify(customerInfo));
    navigate('/pagamento');
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
            onClick={() => navigate('/carrinho')}
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Carrinho
          </button>

          <h1 className="font-display text-3xl font-bold">
            Finalizar Pedido
          </h1>

          <p className="text-muted-foreground mt-2">
            Preencha seus dados para concluir a entrega
          </p>

          {!openNow && (
            <div className="mt-4 flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
              <Lock className="w-5 h-5" />
              <span className="text-sm font-medium">
                {closedMessage}
              </span>
            </div>
          )}
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-primary" />
                Seus Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  name="name"
                  value={customerInfo.name}
                  onChange={handleChange}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone / WhatsApp *</Label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    value={customerInfo.phone}
                    onChange={handlePhoneChange}
                    className="pl-10"
                    maxLength={15}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-primary" />
                Endereço de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">Endereço Completo *</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={customerInfo.address}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  name="complement"
                  value={customerInfo.complement}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Resumo */}
          <Card className="bg-muted/30">
            <CardContent className="p-4 flex justify-between items-center">
              <span className="text-muted-foreground">
                {items.length} {items.length === 1 ? 'item' : 'itens'}
              </span>
              <span className="text-xl font-bold text-primary">
                R$ {total.toFixed(2)}
              </span>
            </CardContent>
          </Card>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!openNow}
          >
            Continuar para Pagamento
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;