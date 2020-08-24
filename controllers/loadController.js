const path = require('path');
const mongoose = require('mongoose');
const AWS = require('aws-sdk');
const { ObjectId } = mongoose.Types;
const Load = require('../models/loadModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const messages = require('../utils/messages');

// @route POST api/v1/load
// @desc Register a new load
// @access PUBLIC
exports.createLoad = catchAsync(async (req, res, next) => {
  const load = await Load.create({
    name: req.body.name,
    to: req.body.to,
    from: req.body.from,
    description: req.body.description,
    clientName: req.body.clientName,
    freight: req.body.freight,
    profit: req.body.profit,
    dispatcher: req.user,
  });
  res.status(201).json({
    status: 'success',
    data: {
      load,
    },
  });
});

// @route GET api/v1/load/:id
// @desc Get a load by ID
// @access PUBLIC
exports.getLoad = catchAsync(async (req, res, next) => {
  const load = await Load.findById(req.params.id);

  if (!load) {
    return next(new AppError(messages.LOAD_NOT_FOUND, 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      load,
    },
  });
});

// @route GET api/v1/load
// @desc GET all loads
// @access PUBLIC
exports.getAllLoads = catchAsync(async (req, res, next) => {
  const loads = await Load.find();

  res.status(200).json({
    status: 'success',
    results: loads.length,
    data: {
      loads,
    },
  });
});

// @route PATCH api/v1/load/:id
// @desc UPDATE load by ID
// @access PUBLIC
exports.updateLoad = catchAsync(async (req, res, next) => {
  const load = await Load.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!load) {
    return next(new AppError(messages.LOAD_NOT_FOUND, 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      load,
    },
  });
});

// @route DELETE api/v1/load/:id
// @desc Delete load by ID
// @access PUBLIC
exports.deleteLoad = catchAsync(async (req, res, next) => {
  const s3 = new AWS.S3({
    accessKeyId: process.env.accessKeyId,
    secretAccessKey: process.env.secretAccessKey,
    region: process.env.AWS_REGION,
  });

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

  const objects = [];
  getDocuments.map(async (_, i) => {
    objects.push({ Key: getDocuments[i].filename });
    await s3.deleteObjects(
      {
        Bucket: 'flextr-load-document',
        Delete: {
          Objects: objects,
        },
      },
      (err, data) => {
        if (err) return next(new AppError(SOMETHING_WENT_WRONG, 404));
      }
    );
  });

  const doc = await Load.findByIdAndDelete(req.params.id);

  if (!doc) {
    return next(new AppError(messages.LOAD_NOT_FOUND, 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
