import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Home, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';

const DeliveryLayout: React.FC = () => {
  const { user, loading, logout, userRole } = useAuth();
  const { settings } = useStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || (userRole !== 'delivery' && userRole !== 'admin')) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm"><Truck className="w-4 h-4 text-primary-foreground" /></div>
            <span className="font-display font-bold text-foreground">{settings.name} — Entregador</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/"><Button variant="ghost" size="icon"><Home className="w-4 h-4" /></Button></Link>
            <Button variant="ghost" size="icon" onClick={logout} className="text-destructive"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>
      <main>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4">
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
};

export default DeliveryLayout;
