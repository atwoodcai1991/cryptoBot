const express = require('express');
const router = express.Router();
const Strategy = require('../models/Strategy');
const logger = require('../utils/logger');

// Get all strategies
router.get('/', async (req, res) => {
  try {
    const strategies = await Strategy.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: strategies
    });
  } catch (error) {
    logger.error('Error getting strategies:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get single strategy
router.get('/:id', async (req, res) => {
  try {
    const strategy = await Strategy.findById(req.params.id);
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }
    res.json({
      success: true,
      data: strategy
    });
  } catch (error) {
    logger.error('Error getting strategy:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Create strategy
router.post('/', async (req, res) => {
  try {
    const strategy = new Strategy(req.body);
    await strategy.save();
    
    logger.info(`Strategy created: ${strategy.name}`);
    
    res.status(201).json({
      success: true,
      data: strategy
    });
  } catch (error) {
    logger.error('Error creating strategy:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Update strategy
router.put('/:id', async (req, res) => {
  try {
    const strategy = await Strategy.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    logger.info(`Strategy updated: ${strategy.name}`);

    res.json({
      success: true,
      data: strategy
    });
  } catch (error) {
    logger.error('Error updating strategy:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Delete strategy
router.delete('/:id', async (req, res) => {
  try {
    const strategy = await Strategy.findByIdAndDelete(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    logger.info(`Strategy deleted: ${strategy.name}`);

    res.json({
      success: true,
      message: 'Strategy deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting strategy:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Toggle strategy active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const strategy = await Strategy.findById(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    strategy.isActive = !strategy.isActive;
    await strategy.save();

    logger.info(`Strategy ${strategy.name} ${strategy.isActive ? 'activated' : 'deactivated'}`);

    res.json({
      success: true,
      data: strategy
    });
  } catch (error) {
    logger.error('Error toggling strategy:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;

