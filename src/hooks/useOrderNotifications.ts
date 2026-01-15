import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, PaymentMethod, CartItem } from '@/types';
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

// Notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant notification sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Pleasant bell-like sound
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
    
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.log('Could not play notification sound:', error);
  }
};

export function useOrderNotifications(onNewOrder?: (order: Order) => void) {
  const processedOrdersRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);

  const handleNewOrder = useCallback((order: Order) => {
    // Only notify for confirmed orders (not PENDING)
    if (order.status === 'PENDING') return;
    
    // Avoid duplicate notifications
    if (processedOrdersRef.current.has(order.id)) return;
    processedOrdersRef.current.add(order.id);

    // Play sound
    playNotificationSound();

    // Show toast notification
    toast.success(
      `🍕 Novo Pedido!`,
      {
        description: `${order.customer.name} - R$ ${order.total.toFixed(2)}`,
        duration: 10000,
        action: {
          label: 'Ver',
          onClick: () => {
            // Scroll to orders or navigate
            window.location.href = '/admin/pedidos';
          },
        },
      }
    );

    // Call callback if provided
    onNewOrder?.(order);
  }, [onNewOrder]);

  useEffect(() => {
    // Mark as initialized after first render to avoid notifying existing orders
    const initTimeout = setTimeout(() => {
      isInitializedRef.current = true;
    }, 2000);

    const channel = supabase
      .channel('admin-order-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          if (!isInitializedRef.current) return;
          
          const newOrder = mapDbToOrder(payload.new as DbOrder);
          // Only notify if order is already confirmed (not PENDING)
          if (newOrder.status !== 'PENDING') {
            handleNewOrder(newOrder);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          if (!isInitializedRef.current) return;
          
          const oldOrder = payload.old as DbOrder;
          const newOrder = mapDbToOrder(payload.new as DbOrder);
          
          // Notify when order goes from PENDING to CONFIRMED
          if (oldOrder.status === 'PENDING' && newOrder.status === 'CONFIRMED') {
            handleNewOrder(newOrder);
          }
        }
      )
      .subscribe();

    return () => {
      clearTimeout(initTimeout);
      supabase.removeChannel(channel);
    };
  }, [handleNewOrder]);

  return { playNotificationSound };
}
