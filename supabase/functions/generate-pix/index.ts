import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate PIX EMV code for copy-paste (static PIX)
function generatePixCode(pixKey: string, merchantName: string, merchantCity: string, amount: number, txId: string): string {
  const formatField = (id: string, value: string): string => {
    const length = value.length.toString().padStart(2, '0');
    return `${id}${length}${value}`;
  };

  // Merchant Account Information (ID 26)
  const gui = formatField('00', 'BR.GOV.BCB.PIX');
  const key = formatField('01', pixKey);
  const merchantAccountInfo = formatField('26', gui + key);

  // Point of Initiation Method (ID 01)
  const initMethod = formatField('01', '12'); // 12 = static QR code

  // Payload Format Indicator (ID 00)
  const payloadFormat = formatField('00', '01');

  // Merchant Category Code (ID 52)
  const mcc = formatField('52', '0000');

  // Transaction Currency (ID 53)
  const currency = formatField('53', '986'); // BRL

  // Transaction Amount (ID 54)
  const amountStr = amount.toFixed(2);
  const amountField = formatField('54', amountStr);

  // Country Code (ID 58)
  const countryCode = formatField('58', 'BR');

  // Merchant Name (ID 59)
  const name = formatField('59', merchantName.substring(0, 25).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

  // Merchant City (ID 60)
  const city = formatField('60', merchantCity.substring(0, 15).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

  // Additional Data Field (ID 62)
  const txIdField = formatField('05', txId.substring(0, 25));
  const additionalData = formatField('62', txIdField);

  // Assemble payload without CRC
  const payloadWithoutCRC = payloadFormat + initMethod + merchantAccountInfo + mcc + currency + amountField + countryCode + name + city + additionalData;
  
  // Add CRC placeholder
  const payloadForCRC = payloadWithoutCRC + '6304';

  // Calculate CRC16-CCITT
  const crc = calculateCRC16(payloadForCRC);

  return payloadForCRC + crc;
}

function calculateCRC16(str: string): string {
  const polynomial = 0x1021;
  let crc = 0xFFFF;

  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, customerName } = await req.json();

    console.log('Generating PIX for order:', orderId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch order to get the REAL total from the database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('total')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      throw new Error('Pedido não encontrado');
    }

    // Use the REAL total from the database
    const amount = Number(order.total);
    console.log('PIX amount from database:', amount);

    // Get pizzeria settings for PIX info
    const { data: settings, error: settingsError } = await supabase
      .from('pizzeria_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw new Error('Erro ao buscar configurações');
    }

    // Use default PIX key if not configured
    const pixKey = settings?.pix_key || '12345678901'; // CPF/CNPJ placeholder
    const pixName = settings?.pix_name || settings?.name || 'PIZZARIA ITALIANA';
    const merchantCity = 'SAO PAULO'; // Default city

    // Generate transaction ID
    const txId = `PED${orderId.replace(/-/g, '').substring(0, 20)}`;

    // Generate PIX code with the REAL amount from database
    const pixCode = generatePixCode(pixKey, pixName, merchantCity, amount, txId);

    console.log('PIX code generated successfully with amount:', amount);

    // Update order with PIX transaction ID
    await supabase
      .from('orders')
      .update({ pix_transaction_id: txId })
      .eq('id', orderId);

    return new Response(
      JSON.stringify({ 
        pixCode,
        txId,
        amount,
        pixKey: pixKey.substring(0, 4) + '****' // Mask the key for security
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error generating PIX:', error);
    const message = error instanceof Error ? error.message : 'Erro ao gerar PIX';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
