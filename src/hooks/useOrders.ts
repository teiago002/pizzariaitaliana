import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, CartItem, CustomerInfo, PaymentMethod } from '@/types';
import { toast } from 'sonner';

interface DbOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_complement: string | null;
  items: any;
  payment_method: string;
  needs_change: boolean | null;
  change_for: number | null;
  total: number;
  status: string;
  pix_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

const mapDbToOrder = (dbOrder: DbOrder): Order => ({
  id: dbOrder.id,
  customer: {
    name: dbOrder.customer_name,
    phone: dbOrder.customer_phone,
    address: dbOrder.customer_address,
    complement: dbOrder.customer_complement || undefined,
  },
  items: dbOrder.items as CartItem[],
  payment: {
    method: dbOrder.payment_method as PaymentMethod,
    needsChange: dbOrder.needs_change || undefined,
    changeFor: dbOrder.change_for || undefined,
  },
  total: Number(dbOrder.total),
  status: dbOrder.status as OrderStatus,
  createdAt: new Date(dbOrder.created_at),
  updatedAt: new Date(dbOrder.updated_at),
});

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders((data as DbOrder[]).map(mapDbToOrder));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Order change received:', payload);
          if (payload.eventType === 'INSERT') {
            const newOrder = mapDbToOrder(payload.new as DbOrder);
            setOrders(prev => [newOrder, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = mapDbToOrder(payload.new as DbOrder);
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== (payload.old as DbOrder).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  const createOrder = async (
    items: CartItem[],
    customer: CustomerInfo,
    paymentMethod: PaymentMethod,
    total: number,
    needsChange?: boolean,
    changeFor?: number
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_address: customer.address,
          customer_complement: customer.complement || null,
          items: items as unknown as import('@/integrations/supabase/types').Json,
          payment_method: paymentMethod as 'pix' | 'cash' | 'card',
          needs_change: needsChange || false,
          change_for: changeFor || null,
          total: total,
          status: 'PENDING' as const,
        })
        .select()
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Erro ao criar pedido');
      return null;
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      // Send WhatsApp notification
      const messageTypeMap: Record<OrderStatus, string> = {
        PENDING: 'order_pending',
        CONFIRMED: 'order_confirmed',
        PREPARING: 'order_preparing',
        READY: 'order_ready',
        DELIVERED: 'order_delivered',
        CANCELLED: 'order_cancelled',
      };

      await supabase.functions.invoke('send-whatsapp', {
        body: { orderId, messageType: messageTypeMap[status] },
      });

      toast.success('Status atualizado');
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const confirmOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'CONFIRMED' })
        .eq('id', orderId);

      if (error) throw error;

      // Send confirmation WhatsApp
      await supabase.functions.invoke('send-whatsapp', {
        body: { orderId, messageType: 'order_confirmed' },
      });

      return true;
    } catch (error) {
      console.error('Error confirming order:', error);
      return false;
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Pedido removido');
      return true;
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Erro ao remover pedido');
      return false;
    }
  };

  return {
    orders,
    loading,
    createOrder,
    updateOrderStatus,
    confirmOrder,
    deleteOrder,
    refetch: fetchOrders,
  };
}