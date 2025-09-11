const jwt = require('jsonwebtoken');
const User = require ('../Models/User');
const Building = require('../Models/Building');
const BuildingCoownerAssociation = require('../Models/building-coowner');

const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token =  req.headers.authorization.split(' ')[1];
      decoded = await jwt.verify(token, process.env.JWT_SECRET);    
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user.isActive) {
        return res.status(401).json({ message: 'Account deactivated' });
      }    
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};


// Ajouter une fonction pour vérifier l'accès à un immeuble spécifique
const checkBuildingAccess = async (req, res, next) => {
  try {
    // L'utilisateur doit déjà être authentifié (via protect middleware)
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { buildingId } = req.params;
    
    // Si l'utilisateur est un SuperAdmin ou un Admin, il a accès à tous les immeubles
    if (req.user.role === 'SuperAdmin' || req.user.role === 'Admin') {
      return next();
    }

    // Si l'utilisateur est le syndic de cet immeuble, il a accès
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    if (building.user.toString() === req.user._id.toString()) {
      return next();
    }

    // Si l'utilisateur est un copropriétaire, vérifier s'il a un accès actif à cet immeuble
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

    // Par défaut, refuser l'accès
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