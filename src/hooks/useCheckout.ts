import { createClient } from '@supabase/supabase-js';
import { SubscriptionStatus } from '../controller/types';
import  dotenv  from 'dotenv';
dotenv.config();


const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/**
 * Inicia o processo de checkout registrando a intenção no Supabase
 */
export async function initCheckout(userId: string, planId: string, userEmail: string) {
    // 1. Registrar intenção de compra (Escalabilidade: Rastreia abandonos)
    const { data: subscription, error } = await supabase
        .from('subscriptions')
        .insert({
            user_id: userId,
            plan_id: planId,
            status: 'pending' as SubscriptionStatus
        })
        .select()
        .single();

    if (error) throw new Error(`Erro ao criar assinatura: ${error.message}`);

    // 2. Gerar link da Green com o ID da assinatura como external_id
    const greenBaseUrl = "https://payfast.greenn.com.br/m56nu2k";
    const checkoutUrl = `${greenBaseUrl}?external_id=${subscription.id}&email=${encodeURIComponent(userEmail )}`;

    return { checkoutUrl, subscriptionId: subscription.id };
}
