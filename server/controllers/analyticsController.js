import { analyticsModel } from '../models/analyticsModel.js';

/**
 * POST /api/analytics/pageview
 * Public — records a page view (captures viewer IP from request).
 */
export const recordView = async (req, res, next) => {
  try {
    const { broker_id, property_id, path } = req.body;

    if (!broker_id || !path) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing required fields: broker_id, path',
      });
    }

    const viewer_ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.socket?.remoteAddress
      || null;

    const data = await analyticsModel.recordView({
      broker_id,
      property_id: property_id || null,
      path,
      viewer_ip,
    });

    res.status(201).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/views
 * Authenticated — daily view counts for charts + total lifetime views.
 * Query: ?days=30 (default 30)
 */
export const getViews = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const [data, total] = await Promise.all([
      analyticsModel.getDailyViewCounts(req.brokerId, days),
      analyticsModel.getTotalViews(req.brokerId),
    ]);

    res.json({ status: 'success', data, total });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/summary
 * Authenticated — views this month, last month, and total for dashboard cards.
 */
export const getSummary = async (req, res, next) => {
  try {
    const [viewsThisMonth, viewsLastMonth, total] = await Promise.all([
      analyticsModel.getViewsThisMonth(req.brokerId),
      analyticsModel.getViewsLastMonth(req.brokerId),
      analyticsModel.getTotalViews(req.brokerId),
    ]);

    const percentVsLastMonth =
      viewsLastMonth > 0
        ? Math.round(((viewsThisMonth - viewsLastMonth) / viewsLastMonth) * 100)
        : (viewsThisMonth > 0 ? 100 : 0);

    res.json({
      status: 'success',
      data: {
        viewsThisMonth,
        viewsLastMonth,
        total,
        percentVsLastMonth,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/top-properties
 * Authenticated — most-viewed properties.
 * Query: ?limit=10&days=30
 */
export const getTopProperties = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const days = parseInt(req.query.days, 10) || 30;
    const data = await analyticsModel.getTopProperties(req.brokerId, { limit, days });

    res.json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};
