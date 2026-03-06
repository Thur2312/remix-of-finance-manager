import axios from 'axios';
import { TikTokAuthResponse, TikTokRefreshTokenResponse, TikTokErrorResponse, TikTokConfig, TikTokTokenRequest,} from './tiktok_types';

// Classe responsável por gerenciar a autenticação com o TikTok Shop
 
export class TikTokAuthService {
  private config: TikTokConfig;
  private tokenEndpoint: string = 'https://auth.tiktok-shops.com/api/v2/token/create';

  /**
   * Construtor do serviço
   * @param config - Configurações do TikTok (client_id, client_secret, redirect_uri, api_base_url)
   */
  constructor(config: TikTokConfig) {
    this.config = config;
  }

  /**
   * Gera a URL de autorização do TikTok para o usuário fazer login
   * @returns URL de redirecionamento para o TikTok
   */
  public generateAuthorizationUrl(): string {
    // Parâmetros necessários para a autorização
    const params = new URLSearchParams({
      client_key: this.config.client_key,
      response_type: 'code', // Sempre 'code' para o fluxo de autorização
      scope: 'shop.orders:read shop.financial:read', // Escopos necessários para ler pedidos e dados financeiros
      redirect_uri: this.config.redirect_uri,
      state: this.generateRandomState(), // Estado aleatório para segurança (CSRF protection)
    });

    return `https://auth.tiktok-shops.com/api/v2/oauth/authorize?${params.toString()}`;
  }

  /**
   * Troca o authorization_code por um access_token
   * @param authorizationCode - Código de autorização retornado pelo TikTok
   * @returns Resposta contendo access_token, refresh_token e datas de expiração
   */
  public async exchangeCodeForToken(authorizationCode: string): Promise<TikTokAuthResponse> {
    // Payload da requisição
    const payload: TikTokTokenRequest = {
      grant_type: 'authorization_code',
      client_key: this.config.client_key,
      client_secret: this.config.client_secret,
      code: authorizationCode,
      redirect_uri: this.config.redirect_uri,
    };

    try {
      // Fazer requisição POST para obter o token
      const response = await axios.post(this.tokenEndpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Parsear a resposta JSON
      const data = response.data as TikTokAuthResponse;

      // Validar se a resposta contém os campos necessários
      if (!data.access_token || !data.refresh_token) {
        throw new Error('Resposta do TikTok não contém access_token ou refresh_token');
      }

      return data;
    } catch (error) {
      console.error('Erro ao trocar código por token:', error);
      throw error;
    }
  }

  /**
   * Renova o access_token usando o refresh_token
   * @param refreshToken - Token de renovação obtido anteriormente
   * @returns Resposta contendo novo access_token e datas de expiração
   */
  public async refreshAccessToken(refreshToken: string): Promise<TikTokRefreshTokenResponse> {
    // Payload da requisição
    const payload: TikTokTokenRequest = {
      grant_type: 'refresh_token',
      client_key: this.config.client_key,
      client_secret: this.config.client_secret,
      refresh_token: refreshToken,
    };

    try {
      // Fazer requisição POST para renovar o token
      const response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Verificar se a resposta foi bem-sucedida
      if (!response.ok) {
        const errorData = (await response.json()) as TikTokErrorResponse;
        throw new Error(`Erro ao renovar token: ${errorData.message}`);
      }

      // Parsear a resposta JSON
      const data = (await response.json()) as TikTokRefreshTokenResponse;

      // Validar se a resposta contém o novo access_token
      if (!data.access_token) {
        throw new Error('Resposta do TikTok não contém access_token renovado');
      }

      return data;
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      throw error;
    }
  }

  /**
   * Verifica se o access_token está expirado
   * @param expiresAt - Data de expiração do token
   * @returns true se o token está expirado, false caso contrário
   */
  public isTokenExpired(expiresAt: Date): boolean {
    // Comparar a data de expiração com o horário atual
    return new Date() > expiresAt;
  }

  /**
   * Calcula a data de expiração do token baseado no tempo em segundos
   * @param expiresIn - Tempo de expiração em segundos
   * @returns Data de expiração
   */
  public calculateExpirationDate(expiresIn: number): Date {
    // Criar uma data futura adicionando os segundos
    const expirationDate = new Date();
    expirationDate.setSeconds(expirationDate.getSeconds() + expiresIn);
    return expirationDate;
  }

  /**
   * Gera um estado aleatório para proteção contra CSRF
   * @returns String aleatória
   */
  private generateRandomState(): string {
    // Gerar uma string aleatória de 32 caracteres
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

/**
 * Exportar uma instância singleton do serviço
 * Certifique-se de configurar as variáveis de ambiente antes de usar
 */
export const tiktokAuthService = new TikTokAuthService({
  client_key: import.meta.env.VITE_TIKTOK_APP_KEY || '',
  client_secret: import.meta.env.VITE_TIKTOK_CLIENT_SECRET || '',
  redirect_uri: import.meta.env.VITE_TIKTOK_REDIRECT_URI || '',
  api_base_url: import.meta.env.VITE_TIKTOK_API_BASE_URL || 'https://open-api.tiktokshop.com',
});

/**
 * Gera a URL de autorização OAuth do TikTok Shop
 * e redireciona o usuário
 */
export function getAuthorizationUrl(): string {
  const state = crypto.randomUUID(); // proteção CSRF
  sessionStorage.setItem('tiktok_oauth_state', state);

  const params = new URLSearchParams({
    app_key: import.meta.env.VITE_TIKTOK_APP_KEY || '6j9urmh6tjl14',
    state,
  });

  return `https://auth.tiktok-shops.com/oauth/authorize?${params.toString()}`;
}

/**
 * Redireciona o navegador para o TikTok OAuth
 */
export function authorize(): void {
  const url = getAuthorizationUrl();
  window.location.href = url;
}

/**
 * Valida o state retornado no callback
 */
export function validateState(returnedState: string): boolean {
  const savedState = sessionStorage.getItem('tiktok_oauth_state');
  sessionStorage.removeItem('tiktok_oauth_state');
  return savedState === returnedState;
}
