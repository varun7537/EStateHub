// backend/src/routes/savedListingRoutes.js
const express = require('express');
const router = express.Router();
const savedListingController = require('../controllers/savedListingController');
const { authenticate } = require('../middlewares/authMiddleware');

// All routes here require login
router.get('/', authenticate, savedListingController.getSavedListings);
router.post('/', authenticate, savedListingController.saveListing);
router.delete('/:propertyId', authenticate, savedListingController.unsaveListing);

module.exports = router;