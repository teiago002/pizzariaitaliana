import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, messageType } = await req.json();

    console.log('Sending WhatsApp for order:', orderId, 'Type:', messageType);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      throw new Error('Pedido não encontrado');
    }

    // Fetch settings for WhatsApp number
    const { data: settings, error: settingsError } = await supabase
      .from('pizzeria_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw new Error('Erro ao buscar configurações');
    }

    const pizzeriaWhatsapp = settings?.whatsapp || '(89) 98134-7052';
    const pizzeriaName = settings?.name || 'Pizzaria Italiana';

    // Format phone number for WhatsApp
    const formatPhone = (phone: string) => {
      return phone.replace(/\D/g, '');
    };

    // Generate message based on type
    let message = '';
    const customerPhone = formatPhone(order.customer_phone);
    const pizzeriaPhone = formatPhone(pizzeriaWhatsapp);

    // Parse items from JSONB
    const items = order.items as any[];
    const itemsList = items.map((item: any) => {
      if (item.type === 'pizza') {
        const flavors = item.flavors.map((f: any) => f.name).join(' + ');
        return `🍕 Pizza ${flavors} (${item.size}) x${item.quantity}`;
      } else {
        return `🥤 ${item.product?.name || 'Produto'} x${item.quantity}`;
      }
    }).join('\n');

    const paymentMethods: Record<string, string> = {
      pix: '💳 PIX',
      cash: '💵 Dinheiro',
      card: '💳 Cartão'
    };

    switch (messageType) {
      case 'order_confirmed':
        message = `🍕 *${pizzeriaName}*\n\n` +
          `✅ *Pedido Confirmado!*\n\n` +
          `📋 *Número:* ${order.id.substring(0, 8).toUpperCase()}\n\n` +
          `*Itens:*\n${itemsList}\n\n` +
          `💰 *Total:* R$ ${order.total.toFixed(2)}\n` +
          `${paymentMethods[order.payment_method]}\n\n` +
          `📍 *Entrega:*\n${order.customer_address}${order.customer_complement ? '\n' + order.customer_complement : ''}\n\n` +
          `⏱️ Tempo estimado: 40-60 minutos\n\n` +
          `Obrigado pela preferência! 🙏`;
        break;

      case 'order_preparing':
        message = `🍕 *${pizzeriaName}*\n\n` +
          `👨‍🍳 Seu pedido *${order.id.substring(0, 8).toUpperCase()}* está sendo preparado!\n\n` +
          `Em breve sairá para entrega. 🚗`;
        break;

      case 'order_ready':
      case 'order_out_for_delivery':
        message = `🍕 *${pizzeriaName}*\n\n` +
          `🚗💨 *Seu pedido está saindo para entrega!*\n\n` +
          `📋 *Número:* ${order.id.substring(0, 8).toUpperCase()}\n\n` +
          `📍 *Endereço:*\n${order.customer_address}${order.customer_complement ? '\n' + order.customer_complement : ''}\n\n` +
          `Aguarde, logo chegaremos! 🏃‍♂️`;
        break;

      case 'order_delivered':
        message = `🍕 *${pizzeriaName}*\n\n` +
          `✅ Pedido *${order.id.substring(0, 8).toUpperCase()}* entregue!\n\n` +
          `Esperamos que você goste! 😋\n` +
          `Volte sempre! 🙏`;
        break;

      default:
        message = `🍕 *${pizzeriaName}*\n\n` +
          `Atualização do seu pedido *${order.id.substring(0, 8).toUpperCase()}*\n\n` +
          `Status: ${order.status}`;
    }

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Generate WhatsApp URL (for opening in app)
    const whatsappUrl = `https://wa.me/55${customerPhone}?text=${encodedMessage}`;

    // For the admin to send message to customer
    const adminWhatsappUrl = `https://wa.me/55${customerPhone}?text=${encodedMessage}`;

    // For the customer to contact pizzeria
    const customerWhatsappUrl = `https://wa.me/55${pizzeriaPhone}?text=${encodeURIComponent(`Olá! Gostaria de saber sobre meu pedido ${order.id.substring(0, 8).toUpperCase()}`)}`;

    console.log('WhatsApp message generated for order:', orderId);

    return new Response(
      JSON.stringify({ 
        success: true,
        whatsappUrl: adminWhatsappUrl,
        customerWhatsappUrl,
        message,
        customerPhone,
        pizzeriaPhone
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error sending WhatsApp:', error);
    const message = error instanceof Error ? error.message : 'Erro ao gerar mensagem WhatsApp';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});