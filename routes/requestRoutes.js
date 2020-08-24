const express = require('express');
const requestController = require('../controllers/requestController');
const authController = require('../controllers/authController');

const router = express.Router();

router.route('/').get(authController.protect, requestController.getRequests);
router.route('/:id').get(authController.protect, requestController.getRequest);

module.exports = router;
