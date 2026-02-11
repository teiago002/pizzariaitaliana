import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// EfiPay (Gerencianet) API endpoints
const EFIPAY_BASE_URL_PROD = 'https://pix.api.efipay.com.br';
const EFIPAY_BASE_URL_SANDBOX = 'https://pix-h.api.efipay.com.br';

async function getEfiPayToken(clientId: string, clientSecret: string, certificate: string, sandbox: boolean): Promise<string> {
  const baseUrl = sandbox ? EFIPAY_BASE_URL_SANDBOX : EFIPAY_BASE_URL_PROD;
  
  const credentials = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('EfiPay auth error:', errorText);
    throw new Error(`Erro ao autenticar com EfiPay: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function createPixCharge(
  token: string, 
  amount: number, 
  txId: string, 
  customerName: string,
  sandbox: boolean
) {
  const baseUrl = sandbox ? EFIPAY_BASE_URL_SANDBOX : EFIPAY_BASE_URL_PROD;
  
  const response = await fetch(`${baseUrl}/v2/cob/${txId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      calendario: {
        expiracao: 3600, // 1 hour
      },
      devedor: {
        nome: customerName,
      },
      valor: {
        original: amount.toFixed(2),
      },
      chave: Deno.env.get('EFIPAY_PIX_KEY') || '',
      solicitacaoPagador: `Pedido ${txId}`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('EfiPay charge error:', errorText);
    throw new Error(`Erro ao criar cobrança PIX: ${response.status}`);
  }

  return await response.json();
}

async function getPixQRCode(token: string, locId: string, sandbox: boolean) {
  const baseUrl = sandbox ? EFIPAY_BASE_URL_SANDBOX : EFIPAY_BASE_URL_PROD;
  
  const response = await fetch(`${baseUrl}/v2/loc/${locId}/qrcode`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('EfiPay QR error:', errorText);
    throw new Error(`Erro ao gerar QR Code: ${response.status}`);
  }

  return await response.json();
}

// Generate static PIX code (fallback when EfiPay is not configured)
function generateStaticPixCode(pixKey: string, merchantName: string, merchantCity: string, amount: number, txId: string): string {
  const formatField = (id: string, value: string): string => {
    const length = value.length.toString().padStart(2, '0');
    return `${id}${length}${value}`;
  };

  const gui = formatField('00', 'BR.GOV.BCB.PIX');
  const key = formatField('01', pixKey);
  const merchantAccountInfo = formatField('26', gui + key);
  const initMethod = formatField('01', '12');
  const payloadFormat = formatField('00', '01');
  const mcc = formatField('52', '0000');
  const currency = formatField('53', '986');
  const amountField = formatField('54', amount.toFixed(2));
  const countryCode = formatField('58', 'BR');
  const name = formatField('59', merchantName.substring(0, 25).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const city = formatField('60', merchantCity.substring(0, 15).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const txIdField = formatField('05', txId.substring(0, 25));
  const additionalData = formatField('62', txIdField);

  const payloadWithoutCRC = payloadFormat + initMethod + merchantAccountInfo + mcc + currency + amountField + countryCode + name + city + additionalData;
  const payloadForCRC = payloadWithoutCRC + '6304';
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch order total from database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('total')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      throw new Error('Pedido não encontrado');
    }

    const amount = Number(order.total);
    console.log('PIX amount from database:', amount);

    // Get pizzeria settings
    const { data: settings } = await supabase
      .from('pizzeria_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    const txId = `PED${orderId.replace(/-/g, '').substring(0, 20)}`;

    // Check if EfiPay is configured
    const efiClientId = Deno.env.get('EFIPAY_CLIENT_ID');
    const efiClientSecret = Deno.env.get('EFIPAY_CLIENT_SECRET');
    const efiSandbox = Deno.env.get('EFIPAY_SANDBOX') === 'true';

    let pixCode: string;
    let pixProvider = 'static';

    if (efiClientId && efiClientSecret) {
      // Use EfiPay for real PIX charges
      try {
        console.log('Using EfiPay for PIX generation');
        const token = await getEfiPayToken(efiClientId, efiClientSecret, '', efiSandbox);
        
        const charge = await createPixCharge(token, amount, txId, customerName || 'Cliente', efiSandbox);
        console.log('EfiPay charge created:', charge);

        // Get QR Code
        if (charge.loc?.id) {
          const qrData = await getPixQRCode(token, charge.loc.id.toString(), efiSandbox);
          pixCode = qrData.qrcode;
          pixProvider = 'efipay';
        } else {
          pixCode = charge.pixCopiaECola || '';
          pixProvider = 'efipay';
        }

        // Save EfiPay transaction info
        await supabase
          .from('orders')
          .update({ 
            pix_transaction_id: txId,
          })
          .eq('id', orderId);

      } catch (efiError) {
        console.error('EfiPay error, falling back to static PIX:', efiError);
        // Fallback to static PIX
        const pixKey = settings?.pix_key || '12345678901';
        const pixName = settings?.pix_name || settings?.name || 'PIZZARIA ITALIANA';
        pixCode = generateStaticPixCode(pixKey, pixName, 'SAO PAULO', amount, txId);
        pixProvider = 'static_fallback';
      }
    } else {
      // Use static PIX (no EfiPay configured)
      const pixKey = settings?.pix_key || '12345678901';
      const pixName = settings?.pix_name || settings?.name || 'PIZZARIA ITALIANA';
      pixCode = generateStaticPixCode(pixKey, pixName, 'SAO PAULO', amount, txId);

      await supabase
        .from('orders')
        .update({ pix_transaction_id: txId })
        .eq('id', orderId);
    }

    console.log(`PIX generated via ${pixProvider} with amount:`, amount);

    return new Response(
      JSON.stringify({ 
        pixCode,
        txId,
        amount,
        provider: pixProvider,
        pixKey: (settings?.pix_key || '****').substring(0, 4) + '****',
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
