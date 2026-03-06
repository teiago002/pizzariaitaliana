import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Package, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const HomePage: React.FC = () => {
  const { settings } = useStore();
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState('');
  const [searching, setSearching] = useState(false);

  const openNow = settings.isOpen;

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderId.trim()) {
      toast.error('Digite o número do pedido');
      return;
    }

    setSearching(true);
    
    // Simula uma pequena busca (pode remover depois)
    setTimeout(() => {
      navigate(`/pedido/${orderId.trim()}`);
      setSearching(false);
    }, 500);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center max-w-2xl mx-auto space-y-6">

        {/* Título */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-4xl md:text-5xl font-bold"
        >
          {settings.name}
        </motion.h1>

        {/* Subtítulo */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-lg"
        >
          Pizza artesanal, ingredientes selecionados e entrega rápida 🍕
        </motion.p>

        {/* Microcopy de conversão */}
        {openNow && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-muted-foreground"
          >
            Peça agora e receba quentinha na sua casa 😋
          </motion.p>
        )}

        {/* Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center"
        >
          {openNow ? (
            <Badge className="bg-secondary text-secondary-foreground text-sm px-4 py-1">
              Estamos abertos agora
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-sm px-4 py-1">
              Estamos fechados no momento
            </Badge>
          )}
        </motion.div>

        {/* CTA Principal */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="pt-4"
        >
          {openNow ? (
            <Link to="/cardapio">
              <Button size="lg" className="px-8">
                Fazer pedido agora 🍕
              </Button>
            </Link>
          ) : (
            <Button size="lg" disabled className="px-8">
              Abriremos em breve
            </Button>
          )}
        </motion.div>

        {/* Separador */}
        <div className="relative py-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-muted" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              ou
            </span>
          </div>
        </div>

        {/* Busca de Pedido */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-2 border-primary/10 bg-gradient-to-br from-background to-muted/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Acompanhar pedido</h2>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                Já fez um pedido? Digite o código para acompanhar o status
              </p>

              <form onSubmit={handleTrackOrder} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Ex: 123e4567-e89b-12d3..."
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={searching}
                  className="gap-2"
                >
                  {searching ? (
                    <>Buscando...</>
                  ) : (
                    <>
                      Acompanhar
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="text-xs text-muted-foreground mt-3">
                Digite o ID completo do pedido que você recebeu após a confirmação
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Links rápidos */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center gap-4 text-sm text-muted-foreground"
        >
          <Link to="/cardapio" className="hover:text-primary transition-colors">
            Cardápio
          </Link>
          <span>•</span>
          <Link to="/carrinho" className="hover:text-primary transition-colors">
            Carrinho
          </Link>
          <span>•</span>
          <Link to="/admin/login" className="hover:text-primary transition-colors">
            Admin
          </Link>
          <span>•</span>
          <Link to="/entregador/login" className="hover:text-primary transition-colors">
            Entregador
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;