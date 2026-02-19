import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Loader2
} from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const AdminDashboard: React.FC = () => {
  const { orders, loading } = useOrders();
  const [dateFilter, setDateFilter] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Filter orders by date
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
      return orderDate >= dateFilter.start && orderDate <= dateFilter.end;
    });
  }, [orders, dateFilter]);

  // Calculate stats from REAL data
  const stats = useMemo(() => {
    const confirmedOrders = filteredOrders.filter(o => 
      o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'READY' || o.status === 'DELIVERED'
    );
    
    const totalSales = confirmedOrders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = confirmedOrders.length;
    const averageTicket = orderCount > 0 ? totalSales / orderCount : 0;

    // Calculate previous period for comparison
    const daysDiff = Math.ceil((new Date(dateFilter.end).getTime() - new Date(dateFilter.start).getTime()) / (1000 * 60 * 60 * 24));
    const previousStart = new Date(new Date(dateFilter.start).getTime() - daysDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const previousEnd = new Date(new Date(dateFilter.start).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const previousOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
      return orderDate >= previousStart && orderDate <= previousEnd && 
        (order.status === 'CONFIRMED' || order.status === 'PREPARING' || order.status === 'READY' || order.status === 'DELIVERED');
    });

    const previousSales = previousOrders.reduce((sum, o) => sum + o.total, 0);
    const salesGrowth = previousSales > 0 ? ((totalSales - previousSales) / previousSales) * 100 : 0;
    const ordersGrowth = previousOrders.length > 0 ? ((orderCount - previousOrders.length) / previousOrders.length) * 100 : 0;

    return {
      totalSales,
      orderCount,
      averageTicket,
      salesGrowth,
      ordersGrowth,
    };
  }, [filteredOrders, orders, dateFilter]);

  // Payment method breakdown from REAL data
  const paymentMethodData = useMemo(() => {
    const confirmedOrders = filteredOrders.filter(o => 
      o.status !== 'PENDING' && o.status !== 'CANCELLED'
    );
    
    const data = [
      { 
        name: 'PIX', 
        value: confirmedOrders.filter(o => o.payment.method === 'pix').reduce((sum, o) => sum + o.total, 0),
        count: confirmedOrders.filter(o => o.payment.method === 'pix').length,
        color: '#22c55e' 
      },
      { 
        name: 'Dinheiro', 
        value: confirmedOrders.filter(o => o.payment.method === 'cash').reduce((sum, o) => sum + o.total, 0),
        count: confirmedOrders.filter(o => o.payment.method === 'cash').length,
        color: '#eab308' 
      },
      { 
        name: 'Cartão', 
        value: confirmedOrders.filter(o => o.payment.method === 'card').reduce((sum, o) => sum + o.total, 0),
        count: confirmedOrders.filter(o => o.payment.method === 'card').length,
        color: '#3b82f6' 
      },
    ].filter(d => d.value > 0);
    
    return data;
  }, [filteredOrders]);

  // Daily sales data from REAL orders
  const dailySalesData = useMemo(() => {
    const confirmedOrders = filteredOrders.filter(o => 
      o.status !== 'PENDING' && o.status !== 'CANCELLED'
    );

    const salesByDay: Record<string, number> = {};
    
    confirmedOrders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString('pt-BR', { weekday: 'short' });
      salesByDay[date] = (salesByDay[date] || 0) + order.total;
    });

    // Get last 7 days
    const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const today = new Date().getDay();
    const orderedDays = [...days.slice(today + 1), ...days.slice(0, today + 1)];

    return orderedDays.map(day => ({
      day: day.charAt(0).toUpperCase() + day.slice(1),
      vendas: salesByDay[day] || 0,
    }));
  }, [filteredOrders]);

  // Hourly distribution from REAL data
  const hourlyData = useMemo(() => {
    const confirmedOrders = filteredOrders.filter(o => 
      o.status !== 'PENDING' && o.status !== 'CANCELLED'
    );

    const ordersByHour: Record<number, number> = {};
    
    confirmedOrders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      ordersByHour[hour] = (ordersByHour[hour] || 0) + 1;
    });

    return Array.from({ length: 24 }, (_, i) => ({
      hora: `${i}h`,
      pedidos: ordersByHour[i] || 0,
    })).filter(h => h.pedidos > 0);
  }, [filteredOrders]);

  const statsCards = [
    {
      title: 'Total de Vendas',
      value: `R$ ${stats.totalSales.toFixed(2)}`,
      change: stats.salesGrowth,
      icon: DollarSign,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
    {
      title: 'Pedidos',
      value: stats.orderCount.toString(),
      change: stats.ordersGrowth,
      icon: ShoppingBag,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Ticket Médio',
      value: `R$ ${stats.averageTicket.toFixed(2)}`,
      change: 0,
      icon: TrendingUp,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Dados reais do seu negócio</p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="startDate" className="text-sm whitespace-nowrap">De:</Label>
            <Input
              id="startDate"
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
              className="w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="endDate" className="text-sm whitespace-nowrap">Até:</Label>
            <Input
              id="endDate"
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
              className="w-auto"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="admin-card"
          >
            <Card className="overflow-hidden border-0 shadow-md">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  {/* Colored accent strip */}
                  <div className={`w-1.5 shrink-0 ${stat.bgColor.replace('/10', '')} opacity-80`} />
                  <div className="flex-1 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                        <p className="text-2xl font-bold mt-1 text-foreground">{stat.value}</p>
                        {stat.change !== 0 && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                              stat.change >= 0 
                                ? 'bg-secondary/10 text-secondary' 
                                : 'bg-destructive/10 text-destructive'
                            }`}>
                              {stat.change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                              {Math.abs(stat.change).toFixed(1)}%
                            </span>
                            <span className="text-xs text-muted-foreground">vs anterior</span>
                          </div>
                        )}
                      </div>
                      <div className={`w-11 h-11 rounded-2xl ${stat.bgColor} flex items-center justify-center`}>
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - Daily Sales */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Vendas por Dia da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {dailySalesData.some(d => d.vendas > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySalesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Vendas']}
                    />
                    <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Nenhuma venda no período selecionado
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Formas de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {paymentMethodData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Total']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Nenhum pedido no período
                </div>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {paymentMethodData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.name} ({item.count})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Preview */}
      <Card className="shadow-md border-0">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-lg">Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {orders.length > 0 ? (
            <div className="space-y-2">
              {orders.slice(0, 5).map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{order.id.substring(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{order.customer.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary text-sm">R$ {order.total.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum pedido registrado ainda
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;