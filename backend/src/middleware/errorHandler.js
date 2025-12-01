export const errorHandler = async (c, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Error occurred:', error);

    // Handle specific error types
    if (error.message.includes('UNIQUE constraint failed')) {
      return c.json({
        error: true,
        message: 'Resource already exists'
      }, 400);
    }

    if (error.message.includes('NOT NULL constraint failed')) {
      return c.json({
        error: true,
        message: 'Missing required field'
      }, 400);
    }

    if (error.message.includes('no such table')) {
      return c.json({
        error: true,
        message: 'Database not initialized. Please run migrations.'
      }, 500);
    }

    // Default error response
    return c.json({
      error: true,
      message: process.env.NODE_ENV === 'development'
        ? error.message
        : 'Internal server error'
    }, 500);
  }
};