import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Loader2,
  Pizza,
  Clock,
  Award,
  TrendingDown
} from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useStore } from '@/contexts/StoreContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Line,
  AreaChart,
  Area
} from 'recharts';

const AdminDashboard: React.FC = () => {
  const { orders, loading } = useOrders();
  const { flavors } = useStore();
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

    // Calcular total de pizzas vendidas
    const totalPizzas = confirmedOrders.reduce((sum, order) => {
      const pizzas = order.items.filter(item => item.type === 'pizza');
      return sum + pizzas.reduce((pizzaSum, pizza) => pizzaSum + pizza.quantity, 0);
    }, 0);

    return {
      totalSales,
      orderCount,
      averageTicket,
      salesGrowth,
      ordersGrowth,
    };
  }, [filteredOrders, orders, dateFilter]);

  // Top produtos mais vendidos
  const topProducts = useMemo(() => {
    const productCount: Record<string, { name: string; count: number; total: number }> = {};
    
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.type === 'pizza') {
          const pizzaItem = item as any;
          const pizzaName = pizzaItem.flavors?.map((f: any) => f.name).join(' + ') || 'Pizza';
          const key = `pizza-${pizzaName}`;
          if (!productCount[key]) {
            productCount[key] = { name: pizzaName, count: 0, total: 0 };
          }
          productCount[key].count += item.quantity;
          productCount[key].total += item.unitPrice * item.quantity;
        } else {
          const productItem = item as any;
          const productName = productItem.product?.name || 'Produto';
          const key = `prod-${productItem.product?.id || productName}`;
          if (!productCount[key]) {
            productCount[key] = { name: productName, count: 0, total: 0 };
          }
          productCount[key].count += item.quantity;
          productCount[key].total += item.unitPrice * item.quantity;
        }
      });
    });

    return Object.values(productCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredOrders]);

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
      {
        name: 'Dividido',
        value: confirmedOrders.filter(o => (o.payment.method as string) === 'split').reduce((sum, o) => sum + o.total, 0),
        count: confirmedOrders.filter(o => (o.payment.method as string) === 'split').length,
        color: '#a855f7'
      },
    ].filter(d => d.value > 0);
    
    return data;
  }, [filteredOrders]);

  // Daily sales data from REAL orders
  const dailySalesData = useMemo(() => {
    const confirmedOrders = filteredOrders.filter(o => 
      o.status !== 'PENDING' && o.status !== 'CANCELLED'
    );

    const salesByDay: Record<string, { total: number; count: number }> = {};
    
    confirmedOrders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('-feira', '');
      if (!salesByDay[date]) {
        salesByDay[date] = { total: 0, count: 0 };
      }
      salesByDay[date].total += order.total;
      salesByDay[date].count += 1;
    });

    // Get last 7 days
    const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const today = new Date().getDay();
    const orderedDays = [...days.slice(today + 1), ...days.slice(0, today + 1)];

    return orderedDays.map(day => ({
      day: day.charAt(0).toUpperCase() + day.slice(1),
      vendas: salesByDay[day]?.total || 0,
      pedidos: salesByDay[day]?.count || 0,
    }));
  }, [filteredOrders]);

  // Hourly distribution from REAL data
  const hourlyData = useMemo(() => {
    const confirmedOrders = filteredOrders.filter(o => 
      o.status !== 'PENDING' && o.status !== 'CANCELLED'
    );

    const ordersByHour: Record<number, number> = {};
    const salesByHour: Record<number, number> = {};
    
    confirmedOrders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      ordersByHour[hour] = (ordersByHour[hour] || 0) + 1;
      salesByHour[hour] = (salesByHour[hour] || 0) + order.total;
    });

    return Array.from({ length: 24 }, (_, i) => ({
      hora: `${i}h`,
      pedidos: ordersByHour[i] || 0,
      vendas: salesByHour[i] || 0,
    }));
  }, [filteredOrders]);

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const last30Days = filteredOrders.filter(o => 
      o.status !== 'PENDING' && o.status !== 'CANCELLED'
    );

    const salesByDate: Record<string, number> = {};
    
    last30Days.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString('pt-BR');
      salesByDate[date] = (salesByDate[date] || 0) + order.total;
    });

    return Object.entries(salesByDate)
      .map(([date, sales]) => ({ date, sales }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7);
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
        <div className="flex items-center gap-2 bg-card p-2 rounded-lg border">
          <div className="flex items-center gap-2">
            <Label htmlFor="startDate" className="text-sm whitespace-nowrap">De:</Label>
            <Input
              id="startDate"
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
              className="w-auto h-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="endDate" className="text-sm whitespace-nowrap">Até:</Label>
            <Input
              id="endDate"
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
              className="w-auto h-8"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Daily Sales */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Vendas por Dia da Semana
            </CardTitle>
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
                      formatter={(value, name) => {
                        if (name === 'vendas') return [`R$ ${Number(value).toFixed(2)}`, 'Vendas'];
                        return [value, 'Pedidos'];
                      }}
                    />
                    <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pedidos" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
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
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Formas de Pagamento
            </CardTitle>
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
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {paymentMethodData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">
                    {item.name} <span className="text-muted-foreground">({item.count})</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Horários de Pico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {hourlyData.some(h => h.pedidos > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="hora" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="pedidos" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary)/0.2)" 
                      name="Pedidos"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Nenhum pedido no período
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Recent Orders */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              Pedidos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {orders.slice(0, 8).map((order, i) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{order.id.substring(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground truncate">{order.customer.name}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="font-bold text-primary text-sm">R$ {order.total.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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