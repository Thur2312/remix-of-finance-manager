import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { UnauthorizedError } from '../errors/errors';

export interface AuthenticatedRequest extends Request {
  userId: string;
  headers: {
    authorization?: string;
  };

}

export interface AuthenticatedResponse extends Response {
  status (code: number): AuthenticatedResponse;
  json: (body: { status: string; message: string }) => AuthenticatedResponse; 
}

export async function authMiddleware(
  req: Response,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader =(<AuthenticatedRequest> req).headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const supabaseUrl = process.env.SUPABASE_URL ?? '';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    (req as AuthenticatedRequest).userId = data.user.id;
    next();
  } catch (error) {
    next(error);
  }
}
