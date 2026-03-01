import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useStore } from '@/contexts/StoreContext';
import { CartItemPizza, CartItemProduct } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  isPizzeriaOpen,
  getNextOpeningMessage,
} from '@/utils/isPizzeriaOpen';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const { settings } = useStore();

  const operatingHours = settings.operatingHours;
  const isOpenBySchedule = operatingHours
    ? isPizzeriaOpen(operatingHours)
    : true;

  const openNow = settings.isOpen && isOpenBySchedule;

  const sizeLabels = {
    P: 'Pequena',
    M: 'Média',
    G: 'Grande',
    GG: 'Gigante',
  };

  const renderPizzaItem = (item: CartItemPizza, index: number) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="p-4"
    >
      <div className="flex gap-4">
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {item.flavors[0]?.image ? (
            <img
              src={item.flavors[0].image}
              alt={item.flavors[0].name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              🍕
            </div>
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-semibold">
            Pizza {item.flavors.map(f => f.name).join(' + ')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {sizeLabels[item.size]}
            {item.border && ` • Borda ${item.border.name}`}
          </p>
          <p className="text-primary font-bold mt-1">
            R$ {item.unitPrice.toFixed(2)}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeItem(index)}
            className="text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => updateQuantity(index, item.quantity - 1)}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="w-8 text-center font-medium">
              {item.quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => updateQuantity(index, item.quantity + 1)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderProductItem = (item: CartItemProduct, index: number) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="p-4"
    >
      <div className="flex gap-4">
        <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
          {item.product.image ? (
            <img
              src={item.product.image}
              alt={item.product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl">🥤</span>
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-semibold">{item.product.name}</h3>
          <p className="text-sm text-muted-foreground">
            {item.product.description}
          </p>
          <p className="text-primary font-bold mt-1">
            R$ {item.unitPrice.toFixed(2)}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeItem(index)}
          className="text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Carrinho vazio</h2>
          <Link to="/cardapio">
            <Button>Ver Cardápio</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-3xl space-y-6">
        <Link
          to="/cardapio"
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Continuar Comprando
        </Link>

        <Card>
          <CardContent className="p-0 divide-y">
            <AnimatePresence>
              {items.map((item, index) =>
                item.type === 'pizza'
                  ? renderPizzaItem(item, index)
                  : renderProductItem(item, index)
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">
                R$ {total.toFixed(2)}
              </span>
            </div>

            {!openNow && (
              <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
                <Lock className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {settings.isOpen
                    ? getNextOpeningMessage()
                    : 'Estamos temporariamente fechados.'}
                </span>
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              disabled={!openNow}
              onClick={() => navigate('/checkout')}
            >
              Finalizar Pedido
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive"
              onClick={clearCart}
            >
              Limpar Carrinho
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CartPage;