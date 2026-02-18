import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, LogOut, Home, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';

const EmployeeLayout: React.FC = () => {
  const { user, loading, logout, userRole } = useAuth();
  const { settings } = useStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || (userRole !== 'employee' && userRole !== 'admin')) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: '/funcionario/pedidos', label: 'Pedidos', icon: ShoppingBag },
    { path: '/funcionario/novo-pedido', label: 'Novo Pedido Local', icon: UtensilsCrossed },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm">🍕</div>
            <span className="font-display font-bold text-foreground">{settings.name} — Funcionário</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="icon"><Home className="w-4 h-4" /></Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={logout} className="text-destructive">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex border-t border-border">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                  isActive ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>
      <main>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-4"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
};

export default EmployeeLayout;
