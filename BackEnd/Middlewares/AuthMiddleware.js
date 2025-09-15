const jwt = require('jsonwebtoken');
const User = require('../Models/User');
const Building = require('../Models/Building');
const BuildingCoownerAssociation = require('../Models/building-coowner');

/**
 * protect middleware (JWT)
 * - Accepts token from:
 *    - Authorization: Bearer <token>
 *    - x-auth-token header
 *    - req.body.token
 *    - req.query.token
 *    - cookie 'token'
 *
 * - Attaches:
 *    - req.user         => user document (without password)
 *    - req.authToken    => raw token string
 *    - req.tokenDecoded => decoded jwt payload
 */
const protect = async (req, res, next) => {
  try {
    // gather token from multiple possible locations (header, custom header, body, query, cookie)
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    } else if (req.body && req.body.token) {
      token = req.body.token;
    } else if (req.query && req.query.token) {
      token = req.query.token;
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    // verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error('[auth] token verify failed:', err && err.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }

    // attach token info for controllers (useful for 2FA flows)
    req.authToken = token;
    req.tokenDecoded = decoded;

    // fetch user from DB and attach it (exclude password)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    // Account active check (keep existing behavior)
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account deactivated' });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error('[auth] protect middleware error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// checkBuildingAccess unchanged — re-export it
const checkBuildingAccess = async (req, res, next) => {
  try {
    // user must already be set by protect
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { buildingId } = req.params;

    // Super Admin / Admin
    if (req.user.role === 'SuperAdmin' || req.user.role === 'Admin') {
      return next();
    }

    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // syndic owner
    if (building.user && building.user.toString() === req.user._id.toString()) {
      return next();
    }

    // coowner association
    if (req.user.role === 'SyndicateCoowner') {
      const association = await BuildingCoownerAssociation.findOne({
        building: buildingId,
        coOwner: req.user._id
      });

      if (!association) {
        return res.status(403).json({ message: 'You do not have access to this building' });
      }

      if (!association.isActive) {
        return res.status(403).json({
          message: 'Your access to this building is inactive. Contact the building administrator.',
          pendingApproval: true
        });
      }

      return next();
    }

    return res.status(403).json({ message: 'Unauthorized to access this building' });
  } catch (error) {
    console.error('Error checking building access:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  protect,
  checkBuildingAccess
};
