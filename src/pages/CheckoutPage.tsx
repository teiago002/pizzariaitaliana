import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, MapPin, Phone, User } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { CustomerInfo } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, total } = useCart();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    address: '',
    complement: '',
  });

  // Redirect if cart is empty
  if (items.length === 0) {
    navigate('/carrinho');
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCustomerInfo(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setCustomerInfo(prev => ({ ...prev, phone: formatted }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerInfo.name.trim()) {
      toast.error('Por favor, informe seu nome');
      return;
    }
    if (customerInfo.phone.replace(/\D/g, '').length < 10) {
      toast.error('Por favor, informe um telefone válido');
      return;
    }
    if (!customerInfo.address.trim()) {
      toast.error('Por favor, informe seu endereço');
      return;
    }

    // Store customer info and navigate to payment
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
          <h1 className="font-display text-3xl font-bold text-foreground">
            Dados para Entrega
          </h1>
          <p className="text-muted-foreground mt-2">
            Informe seus dados para finalizarmos o pedido
          </p>
        </motion.div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
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
                  placeholder="Seu nome completo"
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
                    placeholder="(00) 00000-0000"
                    className="pl-10"
                    maxLength={15}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
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
                  placeholder="Rua, número, bairro..."
                  className="mt-1.5"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="complement">Complemento (opcional)</Label>
                <Input
                  id="complement"
                  name="complement"
                  value={customerInfo.complement}
                  onChange={handleChange}
                  placeholder="Apartamento, bloco, referência..."
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="mb-6 bg-muted/30">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  {items.length} {items.length === 1 ? 'item' : 'itens'} no carrinho
                </span>
                <span className="text-xl font-bold text-primary">
                  R$ {total.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full">
            Continuar para Pagamento
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;
