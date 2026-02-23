import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const HomePage: React.FC = () => {
  const { settings } = useStore();

  const openNow = settings.isOpen;

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

        {/* CTA */}
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

      </div>
    </div>
  );
};

export default HomePage;