import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/**
 * Processa o Webhook da Green usando a sua tabela existente
 */
export async function handleGreenWebhook(headers: any, body: any) {
    // 1. Validar Token da Green (Segurança)
    if (headers['x-green-token'] !== process.env.GREEN_WEBHOOK_TOKEN) {
        throw new Error('Não autorizado');
    }

    if (body.status === 'paid') {
        // 2. Chamar a função RPC do Supabase para atualizar a assinatura
        // 'external_id' deve ser o ID da linha na tabela subscriptions
        const { error } = await supabase.rpc('process_green_payment_v2', {
            p_subscription_id: body.external_id,
            p_transaction_id: body.transaction_id,
            p_plan_name: body.product.name 
        });

        if (error) {
            console.error('Erro ao atualizar assinatura no Supabase:', error.message);
            throw error;
        }
    }

    return { success: true };
}


export default async function handler(req, res) {
  // 1. Validar o Token da Green logo no início
  const greenToken = req.headers['x-green-token'];
  
  if (greenToken !== process.env.GREEN_WEBHOOK_TOKEN) {
    console.error('Tentativa de acesso não autorizado. Token recebido:', greenToken);
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const { status, external_id, transaction_id, product } = req.body;
  
  try {
    if (status === 'paid') {
      // 2. Chamar o RPC do Supabase
      const { error } = await supabase.rpc('process_green_payment_v2', {
        p_subscription_id: external_id,
        p_transaction_id: transaction_id,
        p_plan_name: product?.name || 'Plano'
      });

      if (error) {
        console.error('Erro no RPC do Supabase:', error.message);
        return res.status(500).json({ error: error.message });
      }
    }
    
    return res.status(200).send('OK');
  } catch (err) {
    console.error('Erro interno no webhook:', err.message);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
