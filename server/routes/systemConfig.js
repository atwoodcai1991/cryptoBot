const express = require('express');
const router = express.Router();
const SystemConfig = require('../models/SystemConfig');
const logger = require('../utils/logger');

// Get system configuration
router.get('/', async (req, res) => {
  try {
    const config = await SystemConfig.getConfig();
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Error getting system config:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update system configuration
router.put('/', async (req, res) => {
  try {
    const updates = req.body;
    
    // 验证数值范围
    if (updates.riskManagement) {
      const { riskManagement } = updates;
      
      if (riskManagement.defaultTradeAmount !== undefined) {
        if (riskManagement.defaultTradeAmount < 10 || riskManagement.defaultTradeAmount > 100000) {
          return res.status(400).json({
            success: false,
            message: '默认交易金额必须在 10-100000 之间'
          });
        }
      }
      
      if (riskManagement.maxPositionSize !== undefined) {
        if (riskManagement.maxPositionSize < 100 || riskManagement.maxPositionSize > 1000000) {
          return res.status(400).json({
            success: false,
            message: '最大仓位必须在 100-1000000 之间'
          });
        }
      }
      
      if (riskManagement.riskPercentage !== undefined) {
        if (riskManagement.riskPercentage < 0.1 || riskManagement.riskPercentage > 10) {
          return res.status(400).json({
            success: false,
            message: '风险比例必须在 0.1-10% 之间'
          });
        }
      }
      
      if (riskManagement.stopLossPercentage !== undefined) {
        if (riskManagement.stopLossPercentage < 0.5 || riskManagement.stopLossPercentage > 20) {
          return res.status(400).json({
            success: false,
            message: '止损比例必须在 0.5-20% 之间'
          });
        }
      }
      
      if (riskManagement.takeProfitPercentage !== undefined) {
        if (riskManagement.takeProfitPercentage < 1 || riskManagement.takeProfitPercentage > 50) {
          return res.status(400).json({
            success: false,
            message: '止盈比例必须在 1-50% 之间'
          });
        }
      }
    }
    
    if (updates.aiDefaults?.confidenceThreshold !== undefined) {
      if (updates.aiDefaults.confidenceThreshold < 0.1 || updates.aiDefaults.confidenceThreshold > 1.0) {
        return res.status(400).json({
          success: false,
          message: 'AI 信心阈值必须在 0.1-1.0 之间'
        });
      }
    }
    
    const config = await SystemConfig.updateConfig(updates);
    
    logger.info('System config updated successfully');
    
    res.json({
      success: true,
      data: config,
      message: '系统配置更新成功'
    });
  } catch (error) {
    logger.error('Error updating system config:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Reset to default configuration
router.post('/reset', async (req, res) => {
  try {
    await SystemConfig.deleteMany({ configType: 'system' });
    const config = await SystemConfig.getConfig();
    
    logger.info('System config reset to defaults');
    
    res.json({
      success: true,
      data: config,
      message: '系统配置已重置为默认值'
    });
  } catch (error) {
    logger.error('Error resetting system config:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

