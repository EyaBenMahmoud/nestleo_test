const express = require('express');
const router = express.Router();
const { createContract, getAllContract, getContractById, updateContract,getContractsByBuilding, deleteContract, archiveContract, getArchivedContracts, getContractsByUser } = require('../Controllers/contractController');
const { protect } = require('../Middlewares/AuthMiddleware');
const restrictTo = require('../Middlewares/CheckRole');
//router.use(protect);
router.post('/', createContract);
router.get('/', getAllContract);
router.get('/archived',  getArchivedContracts);
router.get('/user/:userId', getContractsByUser);
router.get('/:id',  getContractById);
router.put('/:id', updateContract);
router.delete('/:id', deleteContract);
router.put('/:id/archive', archiveContract);
router.get('/building/:buildingId', getContractsByBuilding);

module.exports = router;
