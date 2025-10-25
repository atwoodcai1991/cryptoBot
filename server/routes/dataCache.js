const express = require('express');
const router = express.Router();
const dataCacheService = require('../services/dataCacheService');
const HistoricalData = require('../models/HistoricalData');
const logger = require('../utils/logger');

// Get cache statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await dataCacheService.getCacheStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get specific cache details
router.get('/:symbol/:interval', async (req, res) => {
  try {
    const { symbol, interval } = req.params;
    
    const cacheData = await HistoricalData.findOne({ 
      symbol: symbol.toUpperCase(), 
      interval 
    });
    
    if (!cacheData) {
      return res.status(404).json({
        success: false,
        message: `No cache found for ${symbol} ${interval}`
      });
    }
    
    res.json({
      success: true,
      data: {
        symbol: cacheData.symbol,
        interval: cacheData.interval,
        candleCount: cacheData.candleCount,
        dataStartTime: cacheData.dataStartTime,
        dataEndTime: cacheData.dataEndTime,
        dataStartDate: new Date(cacheData.dataStartTime).toISOString(),
        dataEndDate: new Date(cacheData.dataEndTime).toISOString(),
        lastUpdateTime: cacheData.lastUpdateTime,
        status: cacheData.status,
        needsUpdate: cacheData.needsUpdate()
      }
    });
  } catch (error) {
    logger.error('Error getting cache details:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Warmup cache for specific pairs
router.post('/warmup', async (req, res) => {
  try {
    const { symbols, intervals, days } = req.body;
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'symbols array is required'
      });
    }
    
    logger.info(`[API] Cache warmup requested for ${symbols.join(', ')}`);
    
    // 异步执行预热，不阻塞响应
    const results = await dataCacheService.warmupCache(
      symbols,
      intervals || ['1h', '4h', '1d'],
      days || 365
    );
    
    res.json({
      success: true,
      data: results,
      message: `Cache warmup completed for ${symbols.length} symbols`
    });
  } catch (error) {
    logger.error('Error warming up cache:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update cache for specific symbol/interval
router.post('/update', async (req, res) => {
  try {
    const { symbol, interval } = req.body;
    
    if (!symbol || !interval) {
      return res.status(400).json({
        success: false,
        message: 'symbol and interval are required'
      });
    }
    
    logger.info(`[API] Cache update requested for ${symbol} ${interval}`);
    
    await dataCacheService.updateCache(symbol.toUpperCase(), interval);
    
    res.json({
      success: true,
      message: `Cache updated for ${symbol} ${interval}`
    });
  } catch (error) {
    logger.error('Error updating cache:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Clear cache
router.delete('/clear', async (req, res) => {
  try {
    const { symbol, interval } = req.query;
    
    logger.info(`[API] Cache clear requested${symbol ? ` for ${symbol}` : ''}${interval ? ` ${interval}` : ''}`);
    
    const result = await dataCacheService.clearCache(
      symbol ? symbol.toUpperCase() : null,
      interval || null
    );
    
    res.json({
      success: true,
      data: result,
      message: `Cleared ${result.deletedCount} cache records`
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Force refresh cache for specific symbol/interval/date range
router.post('/refresh', async (req, res) => {
  try {
    const { symbol, interval, startDate, endDate, days } = req.body;
    
    if (!symbol || !interval) {
      return res.status(400).json({
        success: false,
        message: 'symbol and interval are required'
      });
    }
    
    const endTime = endDate ? new Date(endDate).getTime() : Date.now();
    const startTime = startDate 
      ? new Date(startDate).getTime() 
      : endTime - ((days || 365) * 24 * 60 * 60 * 1000);
    
    logger.info(`[API] Cache refresh requested for ${symbol} ${interval} from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
    
    const candles = await dataCacheService.getHistoricalData(
      symbol.toUpperCase(),
      interval,
      startTime,
      endTime,
      true // 强制刷新
    );
    
    res.json({
      success: true,
      data: {
        candleCount: candles.length,
        startDate: new Date(candles[0]?.openTime).toISOString(),
        endDate: new Date(candles[candles.length - 1]?.closeTime).toISOString()
      },
      message: `Cache refreshed with ${candles.length} candles`
    });
  } catch (error) {
    logger.error('Error refreshing cache:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

