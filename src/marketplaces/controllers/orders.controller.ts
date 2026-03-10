import { Request, Response, NextFunction } from 'express';
import { OrdersRepository } from '../repositories/orders.repository';
import { PaymentsRepository } from '../repositories/payments.repository';
import { IntegrationRepository } from '../repositories/integration.repository';

interface AuthenticatedRequest extends Request {
  userId: string;
  params: {
    integrationId: string;
  };
  query: {
    from?: string;
    to?: string;
  };
  
}

interface AuthenticatedResponse extends Response {
  json: (body: unknown) => AuthenticatedResponse;
  status (code: number): AuthenticatedResponse; 
}

export class OrdersController {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly integrationRepository: IntegrationRepository,
  ) {}
 
  listOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).userId;
      const integrations = await this.integrationRepository.findByUserId(userId);
      const integrationIds = integrations.map((i) => i.id);
      const orders = await this.ordersRepository.findByUserId(userId, integrationIds);
      (res as AuthenticatedResponse).json(orders);
    } catch (error) {
      next(error);
    }
  };

  listOrdersByIntegration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { integrationId } = (req as AuthenticatedRequest).params;
      const orders = await this.ordersRepository.findByIntegrationId(integrationId);
      (res as AuthenticatedResponse).json(orders);
    } catch (error) {
      next(error);
    }
  };

  getFinanceSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).userId;
      const { from, to } = (req as AuthenticatedRequest).query;

      const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = to ? new Date(to) : new Date();

      const integrations = await this.integrationRepository.findByUserId(userId);
      const integrationIds = integrations.map((i) => i.id);

      const [summary, orders] = await Promise.all([
        this.paymentsRepository.getFinanceSummary(integrationIds, fromDate, toDate),
        this.ordersRepository.findByUserId(userId, integrationIds),
      ]);

      const ordersInPeriod = orders.filter(
        (o) => o.orderCreatedAt >= fromDate && o.orderCreatedAt <= toDate,
      );

      (res as AuthenticatedResponse).json({
        ...summary,
        totalOrders: ordersInPeriod.length,
        completedOrders: ordersInPeriod.filter((o) => o.status === 'COMPLETED').length,
        cancelledOrders: ordersInPeriod.filter((o) => o.status === 'CANCELLED').length,
      });
    } catch (error) {
      next(error);
    }
  };
}
