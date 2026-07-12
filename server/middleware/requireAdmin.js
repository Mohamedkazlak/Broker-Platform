import { adminModel } from "../models/adminModel.js";

/**
 * Runs after requireAuth. Verifies the authenticated user has a matching row in
 * admin_users (platform staff). Responds 403 otherwise. Sets req.isAdmin and
 * req.admin ({ id, email, full_name }) on success.
 *
 * Mirrors requireBroker: a single lightweight identity read per request.
 */
export const requireAdmin = async (req, res, next) => {
  try {
    const admin = await adminModel.findAdminById(req.user.id);
    if (!admin) {
      return res.status(403).json({
        status: "error",
        error: "Admin access required",
      });
    }
    req.isAdmin = true;
    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
};
