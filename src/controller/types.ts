
export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'canceled';

export interface GreenWebhookBody {
    status: 'paid' | 'waiting_payment' | 'refunded' | 'chargeback';
    external_id: string; // ID da assinatura no seu banco
    transaction_id: string;
    client: {
        email: string;
        name: string;
    };
    product: {
        id: string;
        name: string;
    };
}