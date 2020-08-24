const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const messages = require('../utils/messages');

exports.protect = catchAsync(async (req, res, next) => {
  let userToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    userToken = req.headers.authorization.split(' ')[1];
  }

  if (!userToken) return next(new AppError(messages.NOT_LOGGED_IN, 401));

  const decoded = await promisify(jwt.verify)(
    userToken,
    process.env.JWT_SECRET
  );

  const response = await axios.post(
    'http://localhost:8000/api/v1/users/tokenCheck',
    {
      params: {
        token: userToken,
      },
    }
  );

  if (!response.data.token) return next(new AppError(messages.NOT_LOGGED_IN));

  req.user = decoded;

  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(messages.NO_PERMISSION, 403));
    }
    next();
  };
};
