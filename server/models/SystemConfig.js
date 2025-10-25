const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  // 配置类型（确保只有一个系统配置文档）
  configType: {
    type: String,
    default: 'system',
    unique: true
  },
  
  // 风险管理默认值
  riskManagement: {
    defaultTradeAmount: {
      type: Number,
      default: 100,
      min: 10,
      max: 100000
    },
    maxPositionSize: {
      type: Number,
      default: 5000,
      min: 100,
      max: 1000000
    },
    riskPercentage: {
      type: Number,
      default: 2,
      min: 0.1,
      max: 10
    },
    stopLossPercentage: {
      type: Number,
      default: 2,
      min: 0.5,
      max: 20
    },
    takeProfitPercentage: {
      type: Number,
      default: 5,
      min: 1,
      max: 50
    }
  },
  
  // AI 配置默认值
  aiDefaults: {
    useAI: {
      type: Boolean,
      default: true
    },
    confidenceThreshold: {
      type: Number,
      default: 0.7,
      min: 0.1,
      max: 1.0
    }
  },
  
  // 交易默认值
  tradingDefaults: {
    interval: {
      type: String,
      enum: ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d'],
      default: '1h'
    }
  },
  
  // 回测默认值
  backtestDefaults: {
    initialBalance: {
      type: Number,
      default: 10000,
      min: 1000,
      max: 1000000
    },
    defaultPeriodDays: {
      type: Number,
      default: 90,
      min: 7,
      max: 730
    }
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 更新时间戳
systemConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 获取或创建系统配置（单例模式）
systemConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne({ configType: 'system' });
  
  if (!config) {
    config = await this.create({ configType: 'system' });
  }
  
  return config;
};

// 更新系统配置
systemConfigSchema.statics.updateConfig = async function(updates) {
  let config = await this.getConfig();
  
  // 更新各个配置项
  if (updates.riskManagement) {
    Object.assign(config.riskManagement, updates.riskManagement);
  }
  if (updates.aiDefaults) {
    Object.assign(config.aiDefaults, updates.aiDefaults);
  }
  if (updates.tradingDefaults) {
    Object.assign(config.tradingDefaults, updates.tradingDefaults);
  }
  if (updates.backtestDefaults) {
    Object.assign(config.backtestDefaults, updates.backtestDefaults);
  }
  
  await config.save();
  return config;
};

module.exports = mongoose.model('SystemConfig', systemConfigSchema);

