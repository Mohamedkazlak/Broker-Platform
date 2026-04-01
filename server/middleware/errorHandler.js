/**
 * Global error handler middleware.
 * Must have 4 parameters to be recognized by Express as an error handler.
 */
const errorHandler = (err, req, res, _next) => {
  console.error('❌ Server Error:', err.message);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    error: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal Server Error'
      : message,
  });
};

export default errorHandler;
