const path = require('path');
const mongoose = require('mongoose');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { v1: uuid } = require('uuid');
const { ObjectId } = mongoose.Types;

const Load = require('../models/loadModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const messages = require('../utils/messages');

const s3 = new AWS.S3({
  accessKeyId: process.env.accessKeyId,
  secretAccessKey: process.env.secretAccessKey,
  region: process.env.AWS_REGION,
});

// SETTING UP STORAGE SETTINGS USING MULTERS3
const storage = multerS3({
  s3,
  bucket: 'flextr-load-document',
  key: (req, file, cb) => {
    let ext = path.extname(file.originalname);
    let basename = path.basename(
      file.originalname,
      path.extname(file.originalname)
    );
    cb(null, `Load-${basename}-${uuid()}-${Date.now()}${ext}`);
  },
  ContentType: (req, file, cb) => {
    cb(null, file.mimetype);
  },
  ACL: 'public-read',
});

// SETTING MULTER FILTERING FOR UPLOADING ONLY FILTERED FILE TYPES
const multerFilter = async (req, file, next) => {
  const load = await Load.findById(req.params.id);

  if (!req.files || load == null) return next();
  // if (!req.files) return next();
  let ext = path.extname(file.originalname);
  if (
    ext !== '.png' &&
    ext !== '.jpg' &&
    ext !== '.jpeg' &&
    ext !== '.pdf' &&
    ext !== '.docx' &&
    ext !== '.doc' &&
    ext !== '.xls' &&
    ext !== '.xlsx'
  ) {
    return next(new AppError(messages.WRONG_FILE_TYPE, 404));
  }
  next(null, true);
};

//
const upload = multer({
  storage,
  fileFilter: multerFilter,
});

// EXPORTING UPLOAD FUNCTION SETTING MAXIMUM 10 UPLOADS AT ONCE
exports.uploadLoadDoc = upload.array('documents', 10);

// SAVING UPLOADED DOCUMENT TO THE AMAZON S3 AND MONGODB COLLECTIONS
exports.saveLoadDocument = catchAsync(async (req, res, next) => {
  // SETTING WHERE TO UPLOAD USING MONGODB AGGREGATION
  req.body.documents = await Load.aggregate([
    {
      $match: { _id: ObjectId(req.params.id) },
    },
    {
      $unwind: '$documents',
    },
    {
      $project: {
        filename: '$documents.filename',
        fileLink: '$documents.fileLink',
        s3_Key: '$documents.s3_Key',
        _id: '$documents._id',
      },
    },
  ]);

  // SAVING ALL MULTIPLE FILES TO THE DOCUMENTS FIELD
  await Promise.all(
    req.files.map(async (_, i) => {
      var params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: req.files[i].originalname,
        Body: req.files[i].buffer,
        ContentType: req.files[i].mimetype,
        ACL: 'public-read',
      };

      const documents = {
        filename: req.files[i].key,
        fileLink: req.files[i].location,
        s3_key: params.Key,
        _id: mongoose.Types.ObjectId(),
      };

      // PUSHING EVERY UPLOADED FILE TO THE DOCUMENTS FIELD IN ITERATION
      req.body.documents.push(documents);
    })
  );

  next();
});

////////////////////////////////////////////////////////////////////
// GET ALL DOCUMENTS BY ID OF A LOAD
// @route GET api/v1/load/:id/documents
// @desc Get Document by ID
// @access PUBLIC
exports.getAllDocuments = catchAsync(async (req, res, next) => {
  const getDocuments = await Load.aggregate([
    {
      $match: { _id: ObjectId(req.params.id) },
    },
    {
      $unwind: '$documents',
    },
    {
      $group: {
        _id: {
          filename: '$documents.filename',
          fileLink: '$documents.fileLink',
        },
      },
    },
    {
      $project: {
        filename: '$_id.filename',
        fileLink: '$_id.fileLink',
        _id: 0,
      },
    },
  ]);

  if (!getDocuments) {
    return next(new AppError(messages.DOCUMENT_NOT_FOUND, 404));
  }

  res.status(200).json({
    status: 'success',
    results: getDocuments.length,
    data: {
      getDocuments,
    },
  });
});

////////////////////////////////////////////////////////////////////
// GET SELECTED DOCUMENT BY ID DOCUMENT PROPERTY
// @route GET api/v1/load/:id/:docId
// @desc Get Document by ID
// @access PUBLIC
exports.getLoadDocument = catchAsync(async (req, res, next) => {
  // GETTING FILENAME FROM DATABASE OF REQUESTED FILE FROM AWS S3 USING MONGODB AGGREGATION METHOD
  const getDocument = await Load.aggregate([
    {
      $match: { _id: ObjectId(req.params.id) },
    },
    {
      $unwind: '$documents',
    },
    {
      $group: {
        _id: {
          filename: '$documents.filename',
        },
      },
    },
    {
      $project: {
        filename: '$_id.filename',
        _id: 0,
      },
    },
  ]);

  if (!getDocument) {
    return next(new AppError(messages.DOCUMENT_NOT_FOUND, 404));
  }

  // SETTING AWS S3 BUCKET AND KEY PARAMS
  var params = await {
    Bucket: 'flextr-load-document',
    Key: getDocument[0].filename,
  };

  // GETTING FILE FROM AWS S3
  s3.getObject(params, (err, data) => {
    res.writeHead(200);
    res.write(data.Body, 'binary');
    res.end(null, 'binary');
  });
});

////////////////////////////////////////////////////////////////////
// DELETE SELECTED DOCUMENT BY ID DOCUMENT PROPERTY
// @route GET api/v1/load/:id/:docId
// @desc Get Document by ID
// @access PUBLIC
exports.deleteLoadDocument = catchAsync(async (req, res, next) => {
  // GET FILENAME FROM DATABASE USING MONGODB AGGREGATION
  const deleteDocument = await Load.aggregate([
    {
      $match: { _id: ObjectId(req.params.id) },
    },
    {
      $unwind: '$documents',
    },
    {
      $group: {
        _id: {
          filename: '$documents.filename',
        },
      },
    },
    {
      $project: {
        filename: '$_id.filename',
        _id: 0,
      },
    },
  ]);

  // DELETE FILENAME FROM COLLECTION
  const doc = await Load.findOneAndUpdate(
    {
      _id: req.params.id,
    },
    { $pull: { documents: { _id: req.params.docId } } },
    { new: true }
  );

  if (!doc) {
    return next(new AppError('No document found with that ID', 404));
  }

  // SETTING PARAMS TO DELETE FILE FROM AWS S3
  const params = {
    Bucket: 'flextr-load-document',
    Key: deleteDocument[0].filename,
  };

  // DELETE REQUESTED FILE FROM AWS S3
  s3.deleteObject(params, (err, data) => {
    if (err) return next(new AppError(SOMETHING_WENT_WRONG, 404));
    else {
      res.send({
        data: null,
      });
    }
  });
});
