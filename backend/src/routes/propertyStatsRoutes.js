// backend/src/routes/propertyStatsRoutes.js
// NOTE: If you already have propertyRoutes.js, add this one line there instead:
//   router.get('/my', authenticate, propertyController.getMyProperties);
const express = require('express');
const router = express.Router();
const propertyStatsController = require('../controllers/propertyStatsController');
const { authenticate } = require('../middlewares/authMiddleware');

router.get('/my', authenticate, propertyStatsController.getMyProperties);

module.exports = router;