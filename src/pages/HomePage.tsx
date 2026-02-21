import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isPizzeriaOpen } from '@/utils/isPizzeriaOpen';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, operatingHours } = useStore();

  const openNow = isPizzeriaOpen(operatingHours);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center space-y-6 max-w-2xl mx-auto">

        {/* Título */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-3xl md:text-5xl font-bold"
        >
          {settings.name}
        </motion.h1>

        {/* Subtítulo */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-base md:text-lg"
        >
          Pizzas artesanais, ingredientes selecionados e entrega rápida na sua casa.
        </motion.p>

        {/* Status */}
        <div className="flex justify-center">
          {openNow ? (
            <Badge className="bg-secondary text-secondary-foreground px-4 py-1 text-sm">
              🍕 Estamos abertos agora
            </Badge>
          ) : (
            <Badge variant="destructive" className="px-4 py-1 text-sm">
              ⏰ Estamos fechados no momento
            </Badge>
          )}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="pt-4"
        >
          <Button
            size="lg"
            className="px-8"
            disabled={!openNow}
            onClick={() => navigate('/cardapio')}
          >
            {openNow ? 'Ver Cardápio 🍕' : 'Abriremos em breve'}
          </Button>
        </motion.div>

        {/* Texto auxiliar */}
        {!openNow && (
          <p className="text-xs text-muted-foreground pt-2">
            Confira nossos horários de funcionamento.
          </p>
        )}
      </div>
    </div>
  );
};

export default HomePage;