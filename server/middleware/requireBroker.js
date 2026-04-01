import { profileModel } from '../models/profileModel.js';

/**
 * Runs after requireAuth. Loads broker_id once per request (minimal DB read)
 * and sets req.brokerId for controllers.
 */
export const requireBroker = async (req, res, next) => {
  try {
    const row = await profileModel.findBrokerIdByUserId(req.user.id);
    if (!row?.broker_id) {
      return res.status(403).json({
        status: 'error',
        error: 'No broker associated with this user',
      });
    }
    req.brokerId = row.broker_id;
    next();
  } catch (error) {
    next(error);
  }
};
