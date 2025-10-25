const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const logger = require('../utils/logger');

// 检查 AI 服务状态
router.get('/ai', async (req, res) => {
  try {
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    const isInitialized = !!aiService.ai;
    
    let status = 'disconnected';
    let message = 'AI 服务未配置';
    let model = null;
    
    if (!hasApiKey) {
      status = 'disconnected';
      message = '未配置 GEMINI_API_KEY';
    } else if (!isInitialized) {
      status = 'error';
      message = 'AI 客户端初始化失败';
    } else {
      // 尝试简单测试
      try {
        const testResponse = await aiService.ai.models.generateContent({
          model: 'gemini-2.0-flash-001',
          contents: 'test'
        });
        
        status = 'connected';
        message = 'AI 服务正常';
        model = 'gemini-2.0-flash-001';
      } catch (error) {
        if (error.message && error.message.includes('503')) {
          status = 'connected';
          message = 'AI 服务已连接（暂时过载）';
          model = 'gemini-2.0-flash-001';
        } else if (error.message && error.message.includes('401')) {
          status = 'error';
          message = 'API 密钥无效';
        } else {
          status = 'error';
          message = 'AI 服务连接失败';
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        status,
        message,
        model,
        hasApiKey,
        isInitialized,
        sdk: '@google/genai',
        version: '1.27.0'
      }
    });
  } catch (error) {
    logger.error('Error checking AI status:', error);
    res.json({
      success: true,
      data: {
        status: 'error',
        message: error.message,
        hasApiKey: !!process.env.GEMINI_API_KEY,
        isInitialized: false
      }
    });
  }
});

// 检查币安 API 状态
router.get('/binance', async (req, res) => {
  try {
    const hasApiKey = !!process.env.BINANCE_API_KEY;
    const hasSecret = !!process.env.BINANCE_API_SECRET;
    
    let status = 'disconnected';
    let message = '未配置 Binance API';
    
    if (hasApiKey && hasSecret) {
      status = 'connected';
      message = 'Binance API 已配置';
    } else if (hasApiKey || hasSecret) {
      status = 'error';
      message = 'Binance API 配置不完整';
    }
    
    res.json({
      success: true,
      data: {
        status,
        message,
        hasApiKey,
        hasSecret,
        testnet: process.env.BINANCE_TESTNET === 'true'
      }
    });
  } catch (error) {
    logger.error('Error checking Binance status:', error);
    res.json({
      success: true,
      data: {
        status: 'error',
        message: error.message
      }
    });
  }
});

// 检查代理配置状态
router.get('/proxy', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        configured: aiService.proxyConfigured || false,
        http: process.env.HTTP_PROXY || null,
        https: process.env.HTTPS_PROXY || null,
        isDev: process.env.NODE_ENV !== 'production' || process.env.IS_DEV === 'true',
        message: aiService.proxyConfigured 
          ? 'Proxy is configured and active' 
          : 'Proxy not configured or inactive'
      }
    });
  } catch (error) {
    logger.error('Error checking proxy status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 强制重新配置代理
router.post('/reconfigure-proxy', async (req, res) => {
  try {
    logger.info('Manually reconfiguring proxy...');
    aiService.ensureProxyConfigured();
    
    res.json({
      success: true,
      message: 'Proxy reconfigured successfully',
      data: {
        configured: aiService.proxyConfigured,
        http: process.env.HTTP_PROXY,
        https: process.env.HTTPS_PROXY
      }
    });
  } catch (error) {
    logger.error('Error reconfiguring proxy:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 检查所有服务状态
router.get('/all', async (req, res) => {
  try {
    // 检查 MongoDB
    const mongoose = require('mongoose');
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // 检查 AI
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    const aiStatus = hasGeminiKey ? 'connected' : 'disconnected';
    
    // 检查 Binance
    const hasBinanceKey = !!process.env.BINANCE_API_KEY && !!process.env.BINANCE_API_SECRET;
    const binanceStatus = hasBinanceKey ? 'connected' : 'disconnected';
    
    res.json({
      success: true,
      data: {
        mongodb: {
          status: mongoStatus,
          message: mongoStatus === 'connected' ? 'MongoDB 已连接' : 'MongoDB 未连接'
        },
        ai: {
          status: aiStatus,
          message: hasGeminiKey ? 'Gemini AI 已配置' : '未配置 GEMINI_API_KEY',
          sdk: '@google/genai'
        },
        binance: {
          status: binanceStatus,
          message: hasBinanceKey ? 'Binance API 已配置' : '未配置 Binance API',
          testnet: process.env.BINANCE_TESTNET === 'true'
        },
        server: {
          status: 'connected',
          uptime: process.uptime(),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development'
        }
      }
    });
  } catch (error) {
    logger.error('Error checking system status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

