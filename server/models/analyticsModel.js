import { supabaseAdmin } from '../config/supabase.js';

/**
 * Page view / analytics database operations.
 * Prefer Postgres RPCs for aggregates (less data over the wire than raw rows).
 * Falls back to JS aggregation if RPCs are not installed yet.
 */

function isRpcMissingError(error) {
  const msg = error?.message || '';
  const code = error?.code;
  return (
    code === 'PGRST202'
    || code === '42883'
    || /function .* does not exist/i.test(msg)
    || /schema cache/i.test(msg)
  );
}

async function aggregateViewsByDayFromRows(brokerId, days) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabaseAdmin
    .from('page_views')
    .select('viewed_at')
    .eq('broker_id', brokerId)
    .gte('viewed_at', since.toISOString());

  if (error) throw error;

  const byDay = {};
  (data || []).forEach((row) => {
    if (!row.viewed_at) return;
    const d = new Date(row.viewed_at);
    const key = d.toISOString().slice(0, 10);
    byDay[key] = (byDay[key] || 0) + 1;
  });

  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, views]) => ({ day, views }));
}

export const analyticsModel = {
  async recordView(viewData) {
    const { data, error } = await supabaseAdmin
      .from('page_views')
      .insert(viewData)
      .select('id')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Daily view counts for charts — one row per calendar day (UTC) with activity.
   * Install database/functions/analytics_views.sql for server-side aggregation.
   */
  async getDailyViewCounts(brokerId, days = 30) {
    try {
      const { data, error } = await supabaseAdmin.rpc('page_views_daily_counts', {
        p_broker_id: brokerId,
        p_days: days,
      });
      if (error) throw error;
      return (data || []).map((row) => ({
        day: typeof row.day === 'string' ? row.day.slice(0, 10) : row.day,
        views: Number(row.views),
      }));
    } catch (e) {
      if (!isRpcMissingError(e)) throw e;
      return aggregateViewsByDayFromRows(brokerId, days);
    }
  },

  /** Legacy: raw rows for date range (fallback path). */
  async getViewsByBroker(brokerId, { days = 30 } = {}) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from('page_views')
      .select('id, broker_id, property_id, path, viewer_ip, viewed_at')
      .eq('broker_id', brokerId)
      .gte('viewed_at', since.toISOString())
      .order('viewed_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getTopProperties(brokerId, { limit = 10, days = 30 } = {}) {
    try {
      const { data, error } = await supabaseAdmin.rpc('page_views_top_properties', {
        p_broker_id: brokerId,
        p_limit: limit,
        p_days: days,
      });
      if (error) throw error;
      return (data || []).map((row) => ({
        property_id: row.property_id,
        views: Number(row.views),
      }));
    } catch (e) {
      if (!isRpcMissingError(e)) throw e;
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from('page_views')
      .select('property_id')
      .eq('broker_id', brokerId)
      .not('property_id', 'is', null)
      .gte('viewed_at', since.toISOString());

    if (error) throw error;

    const counts = {};
    (data || []).forEach((row) => {
      counts[row.property_id] = (counts[row.property_id] || 0) + 1;
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([property_id, views]) => ({ property_id, views }));
  },

  async getTotalViews(brokerId) {
    const { count, error } = await supabaseAdmin
      .from('page_views')
      .select('id', { count: 'exact', head: true })
      .eq('broker_id', brokerId);

    if (error) throw error;
    return count;
  },

  async getViewsThisMonth(brokerId) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count, error } = await supabaseAdmin
      .from('page_views')
      .select('id', { count: 'exact', head: true })
      .eq('broker_id', brokerId)
      .gte('viewed_at', firstDay);

    if (error) throw error;
    return count ?? 0;
  },

  async getViewsLastMonth(brokerId) {
    const now = new Date();
    const firstDayLast = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastDayLast = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
    const { count, error } = await supabaseAdmin
      .from('page_views')
      .select('id', { count: 'exact', head: true })
      .eq('broker_id', brokerId)
      .gte('viewed_at', firstDayLast)
      .lte('viewed_at', lastDayLast);

    if (error) throw error;
    return count ?? 0;
  },
};
