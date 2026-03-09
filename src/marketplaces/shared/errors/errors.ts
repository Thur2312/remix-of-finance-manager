export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class MarketplaceApiError extends AppError {
  public readonly marketplace: string;
  public readonly apiErrorCode: string;

  constructor(marketplace: string, message: string, apiErrorCode: string) {
    super(`[${marketplace}] API Error: ${message}`, 502);
    this.marketplace = marketplace;
    this.apiErrorCode = apiErrorCode;
  }
}

export class IntegrationNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Integration', id);
  }
}

export class TokenExpiredError extends AppError {
  constructor(marketplace: string) {
    super(`${marketplace} refresh token has expired. Please reconnect your store.`, 401);
  }
}