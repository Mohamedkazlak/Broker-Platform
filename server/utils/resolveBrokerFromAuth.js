import { supabaseAdmin } from "../config/supabase.js";
import { profileModel } from "../models/profileModel.js";

/**
 * Resolves the broker tied to an optional `Authorization: Bearer <jwt>`
 * header, without requiring one. Endpoints that serve both an authenticated
 * "existing broker" caller and an anonymous "draft signup" caller (Instapay,
 * Reachi checkout) use this to dispatch between the two without two routes.
 * Returns null (never throws) when there's no valid session.
 */
export async function resolveBrokerIdFromAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  const row = await profileModel.findBrokerIdByUserId(user.id);
  return row?.broker_id ?? null;
}
