// Not Found Middleware
// Handles 404 errors for undefined routes

const notFound = (req, res, next) => {
  const err = new Error(`Not Found - ${req.originalUrl}`);
  err.statusCode = 404;
  err.status = 'fail';
  next(err);
};

module.exports = notFound;
