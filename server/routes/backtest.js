const express = require('express');
const router = express.Router();
const backtestService = require('../services/backtestService');
const logger = require('../utils/logger');

// Run backtest
router.post('/run', async (req, res) => {
  try {
    const { strategyId, startDate, endDate, initialBalance } = req.body;

    if (!strategyId || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Strategy ID, start date, and end date are required' 
      });
    }

    const backtest = await backtestService.runBacktest(
      strategyId,
      new Date(startDate),
      new Date(endDate),
      initialBalance || 10000
    );

    res.json({
      success: true,
      data: backtest
    });
  } catch (error) {
    logger.error('Error running backtest:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get all backtests
router.get('/', async (req, res) => {
  try {
    const backtests = await backtestService.getAllBacktests();
    res.json({
      success: true,
      data: backtests
    });
  } catch (error) {
    logger.error('Error getting backtests:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get backtest results
router.get('/:id', async (req, res) => {
  try {
    const backtest = await backtestService.getBacktestResults(req.params.id);
    res.json({
      success: true,
      data: backtest
    });
  } catch (error) {
    logger.error('Error getting backtest results:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Delete backtest
router.delete('/:id', async (req, res) => {
  try {
    await backtestService.deleteBacktest(req.params.id);
    res.json({
      success: true,
      message: 'Backtest deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting backtest:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;

