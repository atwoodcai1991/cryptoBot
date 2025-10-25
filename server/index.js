const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const logger = require('./utils/logger');

// Load environment variables
dotenv.config();

// Import routes
const tradingRoutes = require('./routes/trading');
const strategyRoutes = require('./routes/strategy');
const backtestRoutes = require('./routes/backtest');
const aiAnalysisRoutes = require('./routes/aiAnalysis');
const orderRoutes = require('./routes/orders');
const accountRoutes = require('./routes/account');
const statusRoutes = require('./routes/status');
const systemConfigRoutes = require('./routes/systemConfig');
const dataCacheRoutes = require('./routes/dataCache');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  logger.info('MongoDB connected successfully');
  
  // Initialize system configuration if not exists
  const SystemConfig = require('./models/SystemConfig');
  await SystemConfig.getConfig();
  logger.info('System configuration initialized');
  
  // Start cache update scheduler
  const cacheScheduler = require('./scheduler/cacheScheduler');
  cacheScheduler.start();
  logger.info('Cache update scheduler started');
})
.catch((err) => {
  logger.error('MongoDB connection error:', err);
  process.exit(1);
});

// Routes
app.use('/api/trading', tradingRoutes);
app.use('/api/strategy', strategyRoutes);
app.use('/api/backtest', backtestRoutes);
app.use('/api/ai-analysis', aiAnalysisRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/system-config', systemConfigRoutes);
app.use('/api/data-cache', dataCacheRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    environment: process.env.NODE_ENV 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  mongoose.connection.close(() => {
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
});

module.exports = app;

