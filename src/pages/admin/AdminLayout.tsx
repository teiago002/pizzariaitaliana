import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Pizza, 
  Settings, 
  LogOut, 
  Home,
  Users,
  ChevronRight
} from 'lucide-react';
import { useAdmin } from '@/contexts/AdminContext';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';

const AdminLayout: React.FC = () => {
  const { isAuthenticated, isLoading, logout } = useAdmin();
  const { settings } = useStore();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
    { path: '/admin/produtos', label: 'Produtos', icon: Pizza },
    { path: '/admin/usuarios', label: 'Usuários', icon: Users },
    { path: '/admin/configuracoes', label: 'Configurações', icon: Settings },
  ];

  const handleLogout = async () => { await logout(); };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out"
        style={{ width: isExpanded ? '240px' : '68px' }}
      >
        {/* Glass background */}
        <div className="absolute inset-0 bg-card border-r border-border shadow-lg" />

        {/* Glow accent line */}
        <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-primary/40 to-transparent" />

        <div className="relative flex flex-col h-full z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 py-5 border-b border-border overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-lg shrink-0 shadow-md shadow-primary/20">
              🍕
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <p className="font-display font-bold text-foreground text-sm leading-tight">{settings.name}</p>
                  <p className="text-xs text-muted-foreground">Painel Admin</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 py-4 space-y-1 px-2 overflow-hidden">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group overflow-hidden ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {/* Active indicator pill */}
                  {isActive && (
                    <motion.span
                      layoutId="activeNav"
                      className="absolute inset-0 bg-primary rounded-xl"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <item.icon className={`w-5 h-5 shrink-0 relative z-10 transition-transform duration-200 ${!isActive && 'group-hover:scale-110'}`} />
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.span
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.16 }}
                        className="text-sm font-medium relative z-10 whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </nav>

          {/* Expand hint */}
          <AnimatePresence>
            {!isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center pb-2"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom actions */}
          <div className="p-2 border-t border-border space-y-1 overflow-hidden">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group"
            >
              <Home className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.16 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    Ver Loja
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 transition-colors group"
            >
              <LogOut className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.16 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    Sair
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-sm shadow-md shadow-primary/20">
            🍕
          </div>
          <span className="font-display font-bold text-foreground text-sm">{settings.name}</span>
        </div>
        {/* Mobile nav: horizontal scrollable tabs */}
        <nav className="flex gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`p-2 rounded-lg transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="w-4 h-4" />
              </Link>
            );
          })}
          <Link to="/" className="p-2 rounded-lg text-muted-foreground hover:bg-muted">
            <Home className="w-4 h-4" />
          </Link>
        </nav>
      </header>

      {/* Main Content — shifts right based on sidebar width */}
      <main
        className="flex-1 min-h-screen transition-all duration-300 ease-in-out pt-14 lg:pt-0"
        style={{ marginLeft: '68px' }}
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="p-4 lg:p-8 min-h-screen"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
};

export default AdminLayout;
