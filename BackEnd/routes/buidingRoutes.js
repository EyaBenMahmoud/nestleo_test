const express = require('express');
const router = express.Router();
const buildingController = require('../Controllers/BuildingController');
const { protect } = require('../Middlewares/AuthMiddleware'); // Middleware to verify syndicate admin
const { default: mongoose } = require('mongoose');
const Apartment = require('../Models/Appartement');
const User = require('../Models/User');
const Building = require('../Models/Building');
const Bloc = require('../Models/Bloc');
const BuildingCoownerAssociation = require('../Models/building-coowner');

// Public route for email confirmation (no auth required)
router.get('/confirm-transfer/:token', buildingController.confirmBuildingTransfer);
console.log('Building transfer confirmation route registered: GET /api/Building/confirm-transfer/:token');

// Protect all other routes
router.use(protect);

router.get('/apartments', buildingController.getallapartment);

router.get('/blocs', buildingController.fetchallBlocs);

router.get('/AllcoOwners', buildingController.getAllCoownersInAllBuildingsPerUser);
router.get('/my-apartments', protect, buildingController.getAllOwnerApartments);
router.post('/apartments',  buildingController.createApartment);

// Routes pour gérer les accès des copropriétaires
router.post('/join', protect, buildingController.joinBuilding);
router.post('/associations/:associationId/handle-request', protect, buildingController.handleBuildingAccessRequest);
router.patch('/associations/:associationId/toggle-access', protect, buildingController.toggleCoOwnerBuildingAccess);

// Add this route if it's not already there
router.get('/my-associations', protect, async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Find ALL associations for this user, both active and inactive
        const associations = await BuildingCoownerAssociation.find({
            coOwner: userId
        }).populate('building').populate('activatedBy');
        
        // Log for debugging
        console.log(`Found ${associations.length} associations for user ${userId}`);
        
        res.status(200).json(associations);
    } catch (error) {
        console.error('Error fetching building associations:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Route pour obtenir les immeubles auxquels un copropriétaire a accès
router.get('/my-buildings', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Trouver toutes les associations actives du copropriétaire
    const associations = await BuildingCoownerAssociation.find({
      coOwner: userId,
      isActive: true
    }).populate({
      path: 'building',
      populate: {
        path: 'blocs',
        model: 'Bloc'
      }
    });
    
    // Extraire les bâtiments des associations
    const buildings = associations.map(assoc => assoc.building);
    
    res.status(200).json(buildings);
  } catch (error) {
    console.error('Error fetching co-owner buildings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
router.get('/matricule/:matricule', buildingController.getBuildingByMatricule);

router.put('/apartments/:id',  buildingController.updateApartment);

router.delete('/apartments/:id',    buildingController.deleteApartment);

router.put('/apartment/:apartmentId/coowner-remove-from-apartment',buildingController.removeCoOwnerFromApartment);
router.post('/createBloc',buildingController.createBloc);
// Update route
router.put('/updateBloc/:id', buildingController.updateBloc);

// Delete route - Fixed version
router.delete('/deleteBloc/:id', buildingController.deleteBloc);
router.get('/:buildingId/apartments/all', buildingController.getallapartmentperBuilding);
// Route pour obtenir les associations d'un immeuble
router.get('/:buildingId/associations', protect, async (req, res) => {
  try {
    const { buildingId } = req.params;
    
    const associations = await BuildingCoownerAssociation.find({ building: buildingId })
      .populate('coOwner', 'firstName lastName email avatar')
      .populate('building', 'name matricule')
      .populate('apartments')
      .populate('activatedBy', 'firstName lastName');
      
    res.status(200).json(associations);
  } catch (error) {
    console.error('Error fetching building associations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:buildingId/blocs', buildingController.getblocperBuilding);

router.get('/:buildingId/apartments', buildingController.getOwnerApartments);

router.get('/:buildingId/co-owners', buildingController.getCoOwners);

router.patch('/:buildingId/remove-coowner', buildingController.deleteCoOwnerFromAbuilding);

router.put('/:id/assign-coowner', buildingController.assignCoOwnerToBuilding);


// Get apartments for a bloc
router.get('/bloc/:blocId/apartments', buildingController.getappartementforabloc);

//find multiple apartments in multiple blocs at the same time this function is used when i create recursive invoice
router.get('/blocsAppartments/:blocIds/apartments', async (req, res) => {
    try {
      const blocIds = req.params.blocIds.split(',');
      
      // Validate bloc IDs
      if (!blocIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
        return res.status(400).json({ error: 'Invalid bloc ID format' });
      }
  
      const apartments = await Apartment.find({ 
        bloc: { $in: blocIds } 
      }).populate('coOwner');
  
      res.json(apartments);
    } catch (error) {
      console.error('Error fetching bloc apartments:', error);
      res.status(500).json({ 
        error: 'Server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

// General building CRUD routes (keep dynamic ":id" routes at the bottom)
router.post('/', buildingController.createBuilding);
router.get('/', buildingController.getBuildings);
router.get('/:id', buildingController.getBuildingById);
router.put('/:id', buildingController.updateBuilding);
router.delete('/:id', buildingController.deleteBuilding);
router.patch('/:id/settings', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { gamificationEnabled } = req.body;
    
    console.log(`Updating settings for building ${id}:`, req.body);
    
    // Find the building
    const building = await Building.findById(id);
    
    if (!building) {
      console.log(`Building with ID ${id} not found`);
      return res.status(404).json({ 
        success: false,
        message: 'Building not found' 
      });
    }
    
    // Check if user is admin of this building
    if (building.admin && building.admin.toString() !== req.user.id) {
      console.log(`User ${req.user.id} is not authorized to update building ${id}`);
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to change building settings' 
      });
    }
    
    // Update settings
    building.gamificationEnabled = gamificationEnabled;
    
    // Save the updated building
    const updatedBuilding = await building.save();
    console.log(`Building ${id} settings updated successfully`);
    
    return res.status(200).json({
      success: true, 
      message: 'Building settings updated successfully',
      building: updatedBuilding
    });
  } catch (error) {
    console.error('Error updating building settings:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});
router.get('/:id/details', buildingController.getBuildingDetails);

// Building transfer routes
router.post('/:buildingId/check-transfer-eligibility', buildingController.checkTransferEligibility);
router.post('/:buildingId/transfer', buildingController.transferBuilding);
router.post('/:buildingId/finalize-transfer', buildingController.finalizeBuildingTransfer);
router.post('/:buildingId/cancel-transfer', buildingController.cancelBuildingTransfer);

module.exports = router;