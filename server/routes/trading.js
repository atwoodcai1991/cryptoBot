const express = require('express');
const router = express.Router();
const tradingService = require('../services/tradingService');
const logger = require('../utils/logger');

// Execute trade based on strategy
router.post('/execute', async (req, res) => {
  try {
    const { strategyId, isSimulated } = req.body;

    if (!strategyId) {
      return res.status(400).json({ error: 'Strategy ID is required' });
    }

    const result = await tradingService.executeTrade(strategyId, isSimulated);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error executing trade:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Close position
router.post('/close', async (req, res) => {
  try {
    const { orderId, isSimulated } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const result = await tradingService.closePosition(orderId, isSimulated);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error closing position:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Monitor positions (triggered manually or by cron)
router.post('/monitor', async (req, res) => {
  try {
    await tradingService.monitorPositions();
    
    res.json({
      success: true,
      message: 'Position monitoring completed'
    });
  } catch (error) {
    logger.error('Error monitoring positions:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;

