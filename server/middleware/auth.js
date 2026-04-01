import { supabaseAdmin } from '../config/supabase.js';

/**
 * Middleware to verify Supabase JWT from the Authorization header.
 * Attaches req.user (Supabase user object) on success.
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        error: 'Missing or invalid Authorization header',
      });
    }

    const token = authHeader.split(' ')[1];

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        status: 'error',
        error: 'Invalid or expired token',
      });
    }

    // Attach user and token to request for downstream use
    req.user = user;
    req.accessToken = token;
    next();
  } catch (error) {
    next(error);
  }
};
