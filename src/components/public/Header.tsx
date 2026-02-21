import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const Header: React.FC = () => {
  const { items } = useCart();
  const { settings } = useStore();
  const location = useLocation();

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo / Nome */}
        <Link to="/" className="font-display text-xl font-bold">
          {settings.name}
        </Link>

        {/* Navegação */}
        <nav className="flex items-center gap-4">
          <Link
            to="/cardapio"
            className={`text-sm ${
              location.pathname === '/cardapio'
                ? 'font-semibold text-primary'
                : 'text-muted-foreground'
            }`}
          >
            Cardápio
          </Link>

          <Link to="/carrinho">
            <Button variant="outline" size="sm" className="relative">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Carrinho
              {cartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs">
                  {cartCount}
                </Badge>
              )}
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
};