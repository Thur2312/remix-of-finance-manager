import { Request, Response, NextFunction } from 'express';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}


export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado.' });
    }
    
    const user = await supabase.auth.getUser(userId);
    
    if (!user.data.user) {
        return res.status(401).json({ message: 'Usuário não autenticado.' });
    }
    
    req.user = user.data.user;
    next();

}
