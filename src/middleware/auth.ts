import { request, Response, NextFunction } from 'express';
import { supabase } from '@/integrations/supabase/client';

export async function authenticate(
    req: request,
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
