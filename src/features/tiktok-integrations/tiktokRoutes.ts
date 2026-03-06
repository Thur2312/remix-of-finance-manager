import { Router } from 'express';
import { Pool } from 'pg';
import { tiktokAuthService } from './tiktokAuthService';
import { TikTokIntegration } from './tiktok_types';

interface AuthRequest extends Express.Request {
  user?: { id: string };
  query: Record<string, string | string[]>;
  params: Record<string, string>;
}

interface AuthResponse extends Express.Response {
  redirect(url: string): void;
  status(code: number): AuthResponse;
  json(body: any): void;
}

/**
 * Criar router para os endpoints do TikTok
 * @param db - Pool de conexões do PostgreSQL
 */
export function createTikTokRoutes(db: Pool): Router {
  const router = Router();

  /**
   * GET /api/tiktok/auth/authorize
   * Inicia o fluxo de autorização OAuth 2.0
   * Redireciona o usuário para o TikTok para fazer login e autorizar a integração
   */
  router.get('/auth/authorize', (req: AuthRequest, res: AuthResponse) => {
    try {
      // Gerar a URL de autorização
      const authorizationUrl = tiktokAuthService.generateAuthorizationUrl();

      // Redirecionar o usuário para o TikTok
      res.redirect(authorizationUrl);
    } catch (error) {
      console.error('Erro ao gerar URL de autorização:', error);
      res.status(500).json({ error: 'Erro ao iniciar autorização' });
    }
  });

  /**
   * GET /api/tiktok/auth/callback
   * Callback do TikTok após o usuário autorizar a integração
   * Recebe o authorization_code e o troca por um access_token
   */
  router.get('/auth/callback', async (req: AuthRequest, res: AuthResponse) => {
    try {
      // Extrair o código de autorização e o estado da query string
      const { code } = req.query;

      // Validar se o código foi recebido
      if (!code) {
        return res.status(400).json({ error: 'Código de autorização não fornecido' });
      }

      // Validar se o usuário está autenticado (você pode usar seu middleware de autenticação aqui)
      const userId = req.user?.id; // Assumindo que você tem um middleware que popula req.user
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Trocar o código por um access_token
      const tokenResponse = await tiktokAuthService.exchangeCodeForToken(code as string);

      // Calcular as datas de expiração
      const tokenExpiresAt = tiktokAuthService.calculateExpirationDate(tokenResponse.expires_in);
      const refreshTokenExpiresAt = tiktokAuthService.calculateExpirationDate(
        tokenResponse.refresh_expires_in
      );

      // Aqui você precisa obter o shop_id e seller_id do TikTok
      // Você pode fazer uma chamada à API do TikTok para obter essas informações
      // Por enquanto, vamos usar valores placeholder
      const shopId = `shop_${Date.now()}`; // Placeholder - substituir com valor real
      const sellerId = `seller_${Date.now()}`; // Placeholder - substituir com valor real

      // Salvar a integração no banco de dados
      const query = `
        INSERT INTO tiktok_integrations (user_id, shop_id, seller_id, access_token, refresh_token, token_expires_at, refresh_token_expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (shop_id) DO UPDATE SET
          access_token = $4,
          refresh_token = $5,
          token_expires_at = $6,
          refresh_token_expires_at = $7,
          updated_at = NOW()
        RETURNING *;
      `;

      const result = await db.query(query, [
        userId,
        shopId,
        sellerId,
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        tokenExpiresAt,
        refreshTokenExpiresAt,
      ]);

      const integration = result.rows[0] as TikTokIntegration;

      // Redirecionar o usuário para uma página de sucesso
      res.redirect(`/dashboard/tiktok?success=true&shop_id=${integration.shop_id}`);
    } catch (error) {
      console.error('Erro no callback de autorização:', error);
      res.redirect(`/dashboard/tiktok?error=authorization_failed`);
    }
  });

  /**
   * GET /api/tiktok/integrations/:userId
   * Obter todas as integrações do TikTok de um usuário
   */
  router.get('/integrations/:userId', async (req: AuthRequest, res: AuthResponse) => {
    try {
      const { userId } = req.params;

      // Validar se o usuário está autenticado e é o proprietário dos dados
      if (req.user?.id !== userId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Buscar as integrações do banco de dados
      const query = `
        SELECT id, shop_id, seller_id, token_expires_at, refresh_token_expires_at, last_sync_at, created_at
        FROM tiktok_integrations
        WHERE user_id = $1
        ORDER BY created_at DESC;
      `;

      const result = await db.query(query, [userId]);
      const integrations = result.rows;

      res.json(integrations);
    } catch (error) {
      console.error('Erro ao buscar integrações:', error);
      res.status(500).json({ error: 'Erro ao buscar integrações' });
    }
  });

  /**
   * DELETE /api/tiktok/integrations/:shopId
   * Remover uma integração do TikTok
   */
  router.delete('/integrations/:shopId', async (req: AuthRequest, res: AuthResponse) => {
    try {
      const { shopId } = req.params;

      // Validar se o usuário está autenticado
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Verificar se a integração pertence ao usuário
      const checkQuery = `
        SELECT id FROM tiktok_integrations
        WHERE shop_id = $1 AND user_id = $2;
      `;

      const checkResult = await db.query(checkQuery, [shopId, req.user.id]);

      if (checkResult.rows.length === 0) {
        return res.status(403).json({ error: 'Integração não encontrada ou acesso negado' });
      }

      // Deletar a integração (isso também deletará os pedidos e transações associadas por causa do ON DELETE CASCADE)
      const deleteQuery = `
        DELETE FROM tiktok_integrations
        WHERE shop_id = $1;
      `;

      await db.query(deleteQuery, [shopId]);

      res.json({ message: 'Integração removida com sucesso' });
    } catch (error) {
      console.error('Erro ao remover integração:', error);
      res.status(500).json({ error: 'Erro ao remover integração' });
    }
  });

  /**
   * POST /api/tiktok/integrations/:shopId/refresh-token
   * Renovar o access_token usando o refresh_token
   */
  router.post('/integrations/:shopId/refresh-token', async (req: AuthRequest, res: AuthResponse) => {
    try {
      const { shopId } = req.params;

      // Validar se o usuário está autenticado
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Buscar a integração do banco de dados
      const query = `
        SELECT refresh_token FROM tiktok_integrations
        WHERE shop_id = $1 AND user_id = $2;
      `;

      const result = await db.query(query, [shopId, req.user.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Integração não encontrada' });
      }

      const { refresh_token } = result.rows[0];

      // Renovar o token
      const newTokenResponse = await tiktokAuthService.refreshAccessToken(refresh_token);

      // Calcular a nova data de expiração
      const newTokenExpiresAt = tiktokAuthService.calculateExpirationDate(newTokenResponse.expires_in);

      // Atualizar o banco de dados com o novo token
      const updateQuery = `
        UPDATE tiktok_integrations
        SET access_token = $1, token_expires_at = $2, updated_at = NOW()
        WHERE shop_id = $3
        RETURNING *;
      `;

      const updateResult = await db.query(updateQuery, [
        newTokenResponse.access_token,
        newTokenExpiresAt,
        shopId,
      ]);

      const updatedIntegration = updateResult.rows[0];

      res.json({
        message: 'Token renovado com sucesso',
        integration: updatedIntegration,
      });
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      res.status(500).json({ error: 'Erro ao renovar token' });
    }
  });

  return router;
}