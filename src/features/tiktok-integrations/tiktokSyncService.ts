import fetch from 'node-fetch';
import { Pool } from 'pg';
import { TikTokIntegration, TikTokOrdersResponse, TikTokFinancialResponse, TikTokErrorResponse,} from './tiktok_types';
import { tiktokAuthService } from './tiktokAuthService';

// Classe responsável pela sincronização de dados do TikTok Shop
// Namoral parece muito que eu to fazendo codigo em java sabo muito

export class TikTokSyncService {
  private db: Pool;
  private apiBaseUrl: string = 'https://open-api.tiktokshop.com';

  /**
   * Construtor do serviço
   * @param db - Pool de conexões do PostgreSQL
   */
  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Sincroniza todos os dados de uma integração do TikTok Shop
   * Busca pedidos e transações financeiras
   * @param integration - Dados da integração do TikTok
   */
  public async syncAllData(integration: TikTokIntegration): Promise<void> {
    try {
      console.log(`Iniciando sincronização para shop_id: ${integration.shop_id}`);

      // Verificar se o token está expirado e renovar se necessário
      if (tiktokAuthService.isTokenExpired(integration.token_expires_at)) {
        console.log(`Token expirado para ${integration.shop_id}, renovando...`);
        const newTokenResponse = await tiktokAuthService.refreshAccessToken(integration.refresh_token);
        const newTokenExpiresAt = tiktokAuthService.calculateExpirationDate(newTokenResponse.expires_in);

        // Atualizar o token no banco de dados
        await this.updateTokenInDatabase(integration.shop_id, newTokenResponse.access_token, newTokenExpiresAt);
        integration.access_token = newTokenResponse.access_token;
      }

      // Sincronizar pedidos
      await this.syncOrders(integration);

      // Sincronizar transações financeiras
      await this.syncFinancialTransactions(integration);

      // Atualizar a data da última sincronização
      await this.updateLastSyncDate(integration.shop_id);

      console.log(`Sincronização concluída para shop_id: ${integration.shop_id}`);
    } catch (error) {
      console.error(`Erro ao sincronizar dados para ${integration.shop_id}:`, error);
      throw error;
    }
  }

  /**
   * Busca os pedidos do TikTok Shop e os salva no banco de dados
   * @param integration - Dados da integração do TikTok
   */
  private async syncOrders(integration: TikTokIntegration): Promise<void> {
    try {
      console.log(`Buscando pedidos para shop_id: ${integration.shop_id}`);

      // Fazer requisição à API do TikTok para obter os pedidos
      const ordersResponse = await this.fetchOrdersFromTikTok(integration.access_token, integration.shop_id);

      // Iterar sobre os pedidos e salvá-los no banco de dados
      for (const order of ordersResponse.data.orders) {
        await this.saveOrderToDatabase(integration.shop_id, order);
      }

      console.log(`${ordersResponse.data.orders.length} pedidos sincronizados para shop_id: ${integration.shop_id}`);
    } catch (error) {
      console.error(`Erro ao sincronizar pedidos para ${integration.shop_id}:`, error);
      throw error;
    }
  }

  /**
   * Busca as transações financeiras do TikTok Shop e as salva no banco de dados
   * @param integration - Dados da integração do TikTok
   */
  private async syncFinancialTransactions(integration: TikTokIntegration): Promise<void> {
    try {
      console.log(`Buscando transações financeiras para shop_id: ${integration.shop_id}`);

      // Fazer requisição à API do TikTok para obter as transações financeiras
      const financialResponse = await this.fetchFinancialTransactionsFromTikTok(
        integration.access_token,
        integration.shop_id
      );

      // Iterar sobre as transações e salvá-las no banco de dados
      for (const transaction of financialResponse.data.transactions) {
        await this.saveFinancialTransactionToDatabase(integration.shop_id, transaction);
      }

      console.log(
        `${financialResponse.data.transactions.length} transações sincronizadas para shop_id: ${integration.shop_id}`
      );
    } catch (error) {
      console.error(`Erro ao sincronizar transações financeiras para ${integration.shop_id}:`, error);
      throw error;
    }
  }

  /**
   * Faz requisição à API do TikTok para obter os pedidos
   * @param accessToken - Token de acesso do TikTok
   * @param shopId - ID da loja no TikTok
   * @returns Resposta contendo os pedidos
   */
  private async fetchOrdersFromTikTok(accessToken: string, shopId: string): Promise<TikTokOrdersResponse> {
    try {
      // Construir a URL da API
      const url = `${this.apiBaseUrl}/v2/orders/search`;

      // Fazer requisição GET com o token de acesso
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Verificar se a resposta foi bem-sucedida
      if (!response.ok) {
        const errorData = (await response.json()) as TikTokErrorResponse;
        throw new Error(`Erro ao buscar pedidos: ${errorData.message}`);
      }

      // Parsear e retornar a resposta
      return (await response.json()) as TikTokOrdersResponse;
    } catch (error) {
      console.error('Erro ao buscar pedidos do TikTok:', error);
      throw error;
    }
  }

  /**
   * Faz requisição à API do TikTok para obter as transações financeiras
   * @param accessToken - Token de acesso do TikTok
   * @param shopId - ID da loja no TikTok
   * @returns Resposta contendo as transações financeiras
   */
  private async fetchFinancialTransactionsFromTikTok(
    accessToken: string,
    shopId: string
  ): Promise<TikTokFinancialResponse> {
    try {
      // Construir a URL da API
      const url = `${this.apiBaseUrl}/v2/financial/transactions`;

      // Fazer requisição GET com o token de acesso
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Verificar se a resposta foi bem-sucedida
      if (!response.ok) {
        const errorData = (await response.json()) as TikTokErrorResponse;
        throw new Error(`Erro ao buscar transações financeiras: ${errorData.message}`);
      }

      // Parsear e retornar a resposta
      return (await response.json()) as TikTokFinancialResponse;
    } catch (error) {
      console.error('Erro ao buscar transações financeiras do TikTok:', error);
      throw error;
    }
  }

  /**
   * Salva um pedido no banco de dados
   * @param shopId - ID da loja no TikTok
   * @param order - Dados do pedido
   */
  private async saveOrderToDatabase(shopId: string, order: any): Promise<void> {
    try {
      // Query para inserir ou atualizar o pedido (UPSERT)
      const query = `
        INSERT INTO tiktok_orders (
          shop_id, tiktok_order_id, order_status, total_amount, currency,
          created_time, update_time, buyer_user_id, raw_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (tiktok_order_id) DO UPDATE SET
          order_status = $3,
          total_amount = $4,
          currency = $5,
          update_time = $7,
          raw_data = $9,
          updated_at = NOW();
      `;

      // Extrair os valores do pedido
      const orderAmount = order.order_amount || {};
      const values = [
        shopId,
        order.order_id,
        order.order_status,
        parseFloat(orderAmount.amount || 0),
        orderAmount.currency || 'BRL',
        new Date(order.create_time * 1000), // Converter timestamp para Date
        new Date(order.update_time * 1000),
        order.buyer_user_id,
        JSON.stringify(order), // Armazenar o JSON completo
      ];

      // Executar a query
      await this.db.query(query, values);
    } catch (error) {
      console.error(`Erro ao salvar pedido ${order.order_id}:`, error);
      throw error;
    }
  }

  /**
   * Salva uma transação financeira no banco de dados
   * @param shopId - ID da loja no TikTok
   * @param transaction - Dados da transação
   */
  private async saveFinancialTransactionToDatabase(shopId: string, transaction: any): Promise<void> {
    try {
      // Query para inserir ou atualizar a transação (UPSERT)
      const query = `
        INSERT INTO tiktok_financial_transactions (
          shop_id, transaction_id, transaction_type, amount, currency,
          transaction_time, description, raw_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (transaction_id) DO UPDATE SET
          transaction_type = $3,
          amount = $4,
          currency = $5,
          transaction_time = $6,
          description = $7,
          raw_data = $8,
          updated_at = NOW();
      `;

      // Extrair os valores da transação
      const values = [
        shopId,
        transaction.transaction_id,
        transaction.transaction_type,
        parseFloat(transaction.amount || 0),
        transaction.currency || 'BRL',
        new Date(transaction.transaction_time * 1000), // Converter timestamp para Date
        transaction.description,
        JSON.stringify(transaction), // Armazenar o JSON completo
      ];

      // Executar a query
      await this.db.query(query, values);
    } catch (error) {
      console.error(`Erro ao salvar transação ${transaction.transaction_id}:`, error);
      throw error;
    }
  }

  /**
   * Atualiza o token de acesso no banco de dados
   * @param shopId - ID da loja no TikTok
   * @param newAccessToken - Novo token de acesso
   * @param newTokenExpiresAt - Nova data de expiração
   */
  private async updateTokenInDatabase(shopId: string, newAccessToken: string, newTokenExpiresAt: Date): Promise<void> {
    try {
      const query = `
        UPDATE tiktok_integrations
        SET access_token = $1, token_expires_at = $2, updated_at = NOW()
        WHERE shop_id = $3;
      `;

      await this.db.query(query, [newAccessToken, newTokenExpiresAt, shopId]);
    } catch (error) {
      console.error(`Erro ao atualizar token para ${shopId}:`, error);
      throw error;
    }
  }

  /**
   * Atualiza a data da última sincronização no banco de dados
   * @param shopId - ID da loja no TikTok
   */
  private async updateLastSyncDate(shopId: string): Promise<void> {
    try {
      const query = `
        UPDATE tiktok_integrations
        SET last_sync_at = NOW(), updated_at = NOW()
        WHERE shop_id = $1;
      `;

      await this.db.query(query, [shopId]);
    } catch (error) {
      console.error(`Erro ao atualizar data de sincronização para ${shopId}:`, error);
      throw error;
    }
  }

  /**
   * Obtém todos os pedidos de uma loja
   * @param shopId - ID da loja no TikTok
   * @returns Array de pedidos
   */
  public async getOrdersByShop(shopId: string): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM tiktok_orders
        WHERE shop_id = $1
        ORDER BY created_time DESC;
      `;

      const result = await this.db.query(query, [shopId]);
      return result.rows;
    } catch (error) {
      console.error(`Erro ao obter pedidos para ${shopId}:`, error);
      throw error;
    }
  }

  /**
   * Obtém todas as transações financeiras de uma loja
   * @param shopId - ID da loja no TikTok
   * @returns Array de transações
   */
  public async getFinancialTransactionsByShop(shopId: string): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM tiktok_financial_transactions
        WHERE shop_id = $1
        ORDER BY transaction_time DESC;
      `;

      const result = await this.db.query(query, [shopId]);
      return result.rows;
    } catch (error) {
      console.error(`Erro ao obter transações financeiras para ${shopId}:`, error);
      throw error;
    }
  }
}
