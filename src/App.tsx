import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { StoreProvider } from "@/contexts/StoreContext";
import { AdminProvider } from "@/contexts/AdminContext";

// Public Pages
import { PublicLayout } from "@/components/public/PublicLayout";
import HomePage from "@/pages/HomePage";
import MenuPage from "@/pages/MenuPage";
import CartPage from "@/pages/CartPage";
import CheckoutPage from "@/pages/CheckoutPage";
import PaymentPage from "@/pages/PaymentPage";
import OrderTrackingPage from "@/pages/OrderTrackingPage";

// Auth
import LoginPage from "@/pages/LoginPage";

// Admin Pages
import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminUsers from "@/pages/admin/AdminUsers";

// Employee Pages
import EmployeeLayout from "@/pages/employee/EmployeeLayout";
import EmployeeOrders from "@/pages/employee/EmployeeOrders";
import NewLocalOrder from "@/pages/employee/NewLocalOrder";

// Delivery Pages
import DeliveryLayout from "@/pages/delivery/DeliveryLayout";
import DeliveryOrders from "@/pages/delivery/DeliveryOrders";

import NotFound from "./pages/NotFound";
import DeliveryLoginPage from "./pages/delivery/DeliveryLoginPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <StoreProvider>
        <CartProvider>
          <AdminProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                
                {/* Public Routes */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/cardapio" element={<MenuPage />} />
                  <Route path="/carrinho" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/pagamento" element={<PaymentPage />} />
                  <Route path="/pedido/:orderId" element={<OrderTrackingPage />} />
                </Route>

                {/* Unified Login */}
                <Route path="/login" element={<LoginPage />} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="pedidos" element={<AdminOrders />} />
                  <Route path="produtos" element={<AdminProducts />} />
                  <Route path="usuarios" element={<AdminUsers />} />
                  <Route path="configuracoes" element={<AdminSettings />} />
                </Route>

                {/* Employee Routes */}
                <Route path="/funcionario" element={<EmployeeLayout />}>
                  <Route path="pedidos" element={<EmployeeOrders />} />
                  <Route path="novo-pedido" element={<NewLocalOrder />} />
                </Route>

                {/* Delivery Routes */}
                <Route path="/entregador/login" element={<DeliveryLoginPage />} /> {/* Crie esta página */}
                <Route path="/entregador" element={<DeliveryLayout />}>
                  <Route index element={<DeliveryOrders />} />
                  <Route path="entregas" element={<DeliveryOrders />} />
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AdminProvider>
        </CartProvider>
      </StoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
