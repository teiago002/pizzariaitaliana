import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Phone, Clock } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PizzaCard } from '@/components/public/PizzaCard';
import heroPizza from '@/assets/hero-pizza.jpg';

const HomePage: React.FC = () => {
  const { settings, flavors } = useStore();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroPizza}
            alt="Pizza deliciosa"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-foreground/40" />
        </div>

        <div className="relative container mx-auto px-4 text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            {/* Status Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              {settings.isOpen ? (
                <Badge className="bg-secondary text-secondary-foreground px-4 py-2 text-sm">
                  <Clock className="w-4 h-4 mr-2" />
                  Estamos Abertos
                </Badge>
              ) : (
                <Badge variant="destructive" className="px-4 py-2 text-sm">
                  <Clock className="w-4 h-4 mr-2" />
                  Fechado no momento
                </Badge>
              )}
            </motion.div>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-background mb-4 leading-tight">
              {settings.name}
            </h1>
            <p className="text-lg md:text-xl text-background/80 mb-8 max-w-lg">
              Sabor autêntico italiano com ingredientes frescos e receitas tradicionais. 
              Peça agora e receba em casa!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link to="/cardapio">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8">
                  Ver Cardápio
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a
                href={`https://wa.me/55${settings.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 bg-background/10 border-background/30 text-background hover:bg-background/20">
                  <Phone className="w-5 h-5 mr-2" />
                  WhatsApp
                </Button>
              </a>
            </div>

            {/* Address Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 flex items-center gap-2 text-background/70 justify-center md:justify-start"
            >
              <MapPin className="w-5 h-5" />
              <span>{settings.address}</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Featured Pizzas */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Nossas Pizzas
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Pizzas artesanais preparadas com ingredientes selecionados e muito amor. 
              Escolha seu tamanho e sabores favoritos!
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {flavors.slice(0, 4).map((flavor, index) => (
              <motion.div
                key={flavor.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <PizzaCard flavor={flavor} />
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link to="/cardapio">
              <Button size="lg" variant="outline">
                Ver Cardápio Completo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="w-16 h-16 rounded-full bg-primary-foreground/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🍕</span>
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">Receitas Artesanais</h3>
              <p className="text-primary-foreground/80">
                Massa feita à mão diariamente com ingredientes selecionados
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="w-16 h-16 rounded-full bg-primary-foreground/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">Entrega Rápida</h3>
              <p className="text-primary-foreground/80">
                Sua pizza quentinha em até 45 minutos
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-16 h-16 rounded-full bg-primary-foreground/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">❤️</span>
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">Feito com Amor</h3>
              <p className="text-primary-foreground/80">
                Tradição italiana em cada fatia
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
