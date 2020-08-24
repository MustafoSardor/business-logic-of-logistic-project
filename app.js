const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./utils/errorHandler');

const app = express();
const loadRoutes = require('./routes/loadRoutes');
const requestRoutes = require('./routes/requestRoutes');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================= SECURITY ===================================

// Set Security HTTP headers
app.use(helmet());

// Limit excessive incoming requests
const limiter = rateLimit({
  max: 50,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message:
    'Too many requests from this IP address. Please try again after 15 minutes',
});

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use('/api', limiter);

// Read data from req.body: Body-Parser
app.use(express.json({ limit: '10kb' }));

// Sanitize Data against NOSQL query injection
app.use(mongoSanitize());

// Sanitize Data
app.use(xss());

// Prevent parameter pollution in URLs
app.use(hpp()); // options are subject to change overtime

// enabling cross-site cors
app.use(cors());

// ======================== END OF SECURITY ===========================

// Routes (https://www.flextr.uz/api/v1/load)
app.use('/api/v1/load', loadRoutes);

// Routes (https://www.flextr.uz/api/v1/request)
app.use('/api/v1/request', requestRoutes);

// Routes for invalid URL
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
