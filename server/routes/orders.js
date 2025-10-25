const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const logger = require('../utils/logger');

// Get all orders
router.get('/', async (req, res) => {
  try {
    const { isSimulated, status, symbol } = req.query;
    
    const query = {};
    if (isSimulated !== undefined) {
      query.isSimulated = isSimulated === 'true';
    }
    if (status) {
      query.status = status;
    }
    if (symbol) {
      query.symbol = symbol;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(100);
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    logger.error('Error getting orders:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get single order
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Error getting order:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get order statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { isSimulated } = req.query;
    
    const query = {};
    if (isSimulated !== undefined) {
      query.isSimulated = isSimulated === 'true';
    }

    const orders = await Order.find(query);

    const totalOrders = orders.length;
    const filledOrders = orders.filter(o => o.status === 'FILLED').length;
    const totalProfit = orders.reduce((sum, o) => sum + (o.profit || 0), 0);
    const winningOrders = orders.filter(o => o.profit > 0).length;
    const losingOrders = orders.filter(o => o.profit < 0).length;
    const winRate = totalOrders > 0 ? (winningOrders / totalOrders) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalOrders,
        filledOrders,
        totalProfit,
        winningOrders,
        losingOrders,
        winRate
      }
    });
  } catch (error) {
    logger.error('Error getting order statistics:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;

