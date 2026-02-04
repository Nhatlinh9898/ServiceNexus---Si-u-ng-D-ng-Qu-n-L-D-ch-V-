// Error Handler Middleware
// Centralized error handling for the API

const logger = require('../utils/logger');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Database error handler
const handleDatabaseError = (err) => {
  let error = { ...err };
  error.message = err.message;

  // Duplicate key error
  if (err.code === '23505') {
    const field = err.detail.match(/Key \((.*?)\)/)?.[1] || 'field';
    const message = `Duplicate ${field}. Please use another value.`;
    return new AppError(message, 400);
  }

  // Foreign key constraint violation
  if (err.code === '23503') {
    const message = 'Invalid reference. Related record not found.';
    return new AppError(message, 400);
  }

  // Not null violation
  if (err.code === '23502') {
    const field = err.column || 'field';
    const message = `${field} is required.`;
    return new AppError(message, 400);
  }

  // Invalid input syntax
  if (err.code === '22P02') {
    const message = 'Invalid data format.';
    return new AppError(message, 400);
  }

  return new AppError('Database operation failed.', 500);
};

// JWT error handler
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired. Please log in again.', 401);

// Validation error handler
const handleValidationError = (err) => {
  const errors = err.details?.map(el => el.message) || [err.message];
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Development error response
const sendErrorDev = (err, req, res) => {
  // API error
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // Rendered error (for future web interface)
  console.error('ERROR 💥', err);
  return res.status(err.statusCode).json({
    title: 'Something went wrong!',
    message: err.message
  });
};

// Production error response
const sendErrorProd = (err, req, res) => {
  // API error
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }

    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }

  // Rendered error (for future web interface)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      title: 'Something went wrong!',
      message: err.message
    });
  }

  // Programming or other unknown error: don't leak error details
  console.error('ERROR 💥', err);
  return res.status(err.statusCode).json({
    title: 'Something went wrong!',
    message: 'Please try again later.'
  });
};

// Global error handler middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.id
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.code?.startsWith('23')) error = handleDatabaseError(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.name === 'ValidationError') error = handleValidationError(error);
    if (error.name === 'CastError') {
      error = new AppError(`Invalid ${error.path}: ${error.value}.`, 400);
    }

    sendErrorProd(error, req, res);
  }
};

module.exports = {
  AppError,
  globalErrorHandler
};
