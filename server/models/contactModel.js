import { supabaseAdmin } from "../config/supabase.js";

/**
 * Contact message database operations.
 *
 * The public Contact Us form writes platform-level rows (no broker_id).
 * Admin list/read/delete uses the service role and is not broker-scoped.
 */

const ADMIN_COLUMNS =
  "id, name, email, phone, subject, message, read, created_at";

export const contactModel = {
  async findAll(brokerId) {
    const { data, error } = await supabaseAdmin
      .from("contact_messages")
      .select(
        "id,broker_id,property_id,name,email,phone,subject,message,read,created_at",
      )
      .eq("broker_id", brokerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(messageData) {
    const { data, error } = await supabaseAdmin
      .from("contact_messages")
      .insert(messageData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markAsRead(id, brokerId) {
    const { data, error } = await supabaseAdmin
      .from("contact_messages")
      .update({ read: true })
      .eq("id", id)
      .eq("broker_id", brokerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id, brokerId) {
    const { error } = await supabaseAdmin
      .from("contact_messages")
      .delete()
      .eq("id", id)
      .eq("broker_id", brokerId);

    if (error) throw error;
  },

  async countUnread(brokerId) {
    const { count, error } = await supabaseAdmin
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .eq("read", false)
      .eq("broker_id", brokerId);

    if (error) throw error;
    return count;
  },

  /**
   * Paginated inbox for platform admins. Optional `read` is a boolean filter;
   * omit it to return every message. Search matches name, email, or subject.
   */
  async listForAdmin({ search, read, limit = 20, offset = 0 } = {}) {
    let query = supabaseAdmin
      .from("contact_messages")
      .select(ADMIN_COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false });

    if (typeof read === "boolean") {
      query = query.eq("read", read);
    }

    if (search) {
      const term = String(search).trim();
      if (term) {
        query = query.or(
          [
            `name.ilike.%${term}%`,
            `email.ilike.%${term}%`,
            `subject.ilike.%${term}%`,
          ].join(","),
        );
      }
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: data ?? [], total: count ?? 0 };
  },

  async setRead(id, read) {
    const { data, error } = await supabaseAdmin
      .from("contact_messages")
      .update({ read })
      .eq("id", id)
      .select(ADMIN_COLUMNS)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async deleteById(id) {
    const { data, error } = await supabaseAdmin
      .from("contact_messages")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async countUnreadAll() {
    const { count, error } = await supabaseAdmin
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("read", false);

    if (error) throw error;
    return count ?? 0;
  },
};
