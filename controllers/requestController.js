const Request = require('../models/requestModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const messages = require('../utils/messages');

// @route Get /api/v1/request
// @desc Get all requests
// @access PUBLIC
exports.getRequests = catchAsync(async (req, res, next) => {
  const requests = await Request.find();

  res.status(200).json({
    status: 'success',
    result: requests.length,
    requests,
  });
});

// @route Get /api/v1/requests
// @desc Get  request by ID
// @access PUBLIC
exports.getRequest = catchAsync(async (req, res, next) => {
  const request = await Request.findById(req.params.id);

  if (!request) return next(new AppError(messages.REQUEST_NOT_FOUND, 404));

  res.status(200).json({
    status: 'success',
    data: { request },
  });
});

exports.getRequestsIO = async (io) => {
  const allrequests = await Request.find();
  let clients = io.sockets.clients().connected;
  let sockets = Object.values(clients);
  sockets.map((s) => s.request);
  return allrequests;
};

exports.create = catchAsync(async (io, newReq) => {
  const request = await Request.create(newReq);
  io.sockets.req = request;
  io.emit('RequestAdded', request);
});

exports.update = catchAsync(async (io, Req) => {
  const request = await Request.findByIdAndUpdate({ _id: Req.id }, Req, {
    new: true,
  });

  if (!request) return new AppError('Request not found', 404);
  io.sockets.req = request;
  io.emit('RequestUpdated', request);
});

exports.delete = catchAsync(async (io, Req) => {
  const request = await Request.findByIdAndDelete({ _id: Req.id });
  if (!request) return new AppError('Request not found', 404);
  io.sockets.req = request;
  io.emit('RequestDeleted');
});
