const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const binanceService = require('../services/binanceService');
const strategyService = require('../services/strategyService');
const Strategy = require('../models/Strategy');
const logger = require('../utils/logger');

// Get AI analysis for a symbol
router.post('/analyze', async (req, res) => {
  try {
    const { symbol, strategyId } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    let strategy;
    if (strategyId) {
      strategy = await Strategy.findById(strategyId);
      if (!strategy) {
        return res.status(404).json({ error: 'Strategy not found' });
      }
    } else {
      // Use default strategy settings
      strategy = {
        interval: '5m',
        indicators: {
          rsi: { enabled: true, period: 14, overbought: 70, oversold: 30 },
          macd: { enabled: true, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
          ma: { enabled: true, shortPeriod: 9, longPeriod: 21 },
          bollingerBands: { enabled: true, period: 20, stdDev: 2 },
          volume: { enabled: true, threshold: 1.5 }
        }
      };
    }

    // Get market data
    const klines = await binanceService.getKlines(symbol, strategy.interval, 500);

    // Get technical signals
    const technicalSignals = strategyService.analyzeStrategy(klines, strategy);

    // Get AI analysis
    const aiAnalysis = await aiService.analyzeMarket(klines, technicalSignals, symbol);

    res.json({
      success: true,
      data: {
        symbol,
        technicalSignals,
        aiAnalysis,
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('Error getting AI analysis:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get sentiment analysis
router.post('/sentiment', async (req, res) => {
  try {
    const { symbol, newsData } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const sentiment = await aiService.getSentimentAnalysis(symbol, newsData || []);

    res.json({
      success: true,
      data: sentiment
    });
  } catch (error) {
    logger.error('Error getting sentiment analysis:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;

