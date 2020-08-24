const express = require('express');

const loadController = require('../controllers/loadController');
const uploadsController = require('../controllers/uploadsController');
const authController = require('../controllers/authController');

const router = express.Router();
// router.use(authController.protect);
// router.use(authController.restrictTo('superAdmin', 'admin', 'dispatch'));

// 1.) GET ALL  AND CREATE PARENT Loads
router
  .route('/')
  .get(loadController.getAllLoads)
  .post(loadController.createLoad);

// 2.) GET, UPDATE, DELETE PARENT Loads
router
  .route('/:id')
  .get(loadController.getLoad)
  .patch(
    uploadsController.uploadLoadDoc,
    uploadsController.saveLoadDocument,
    loadController.updateLoad
  )
  .delete(loadController.deleteLoad);

// 3.) GET and DELETE methods for load documents
router.route('/:id/documents').get(uploadsController.getAllDocuments);

router
  .route('/:id/:docId')
  .get(uploadsController.getLoadDocument)
  .delete(uploadsController.deleteLoadDocument);

module.exports = router;
