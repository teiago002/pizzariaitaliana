import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isPizzeriaOpen } from '@/utils/isPizzeriaOpen';

export const HomePage: React.FC = () => {
  const { settings, operatingHours } = useStore();

  const openNow = isPizzeriaOpen(operatingHours);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center space-y-4">

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-bold"
        >
          {settings.name}
        </motion.h1>

        <p className="text-muted-foreground max-w-xl mx-auto">
          Faça seu pedido online com rapidez e praticidade.
        </p>

        <div className="flex justify-center">
          {openNow ? (
            <Badge className="bg-secondary text-secondary-foreground">
              Estamos abertos agora 🍕
            </Badge>
          ) : (
            <Badge variant="destructive">
              Estamos fechados no momento ⏰
            </Badge>
          )}
        </div>

        <div className="pt-6">
          <Button size="lg" disabled={!openNow}>
            {openNow ? 'Ver Cardápio' : 'Abriremos em breve'}
          </Button>
        </div>

      </div>
    </div>
  );
};