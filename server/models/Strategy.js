const mongoose = require('mongoose');

// 获取系统配置的默认值
async function getDefaultValue(path, fallback) {
  try {
    const SystemConfig = mongoose.model('SystemConfig');
    const config = await SystemConfig.getConfig();
    
    // 根据路径获取值
    const pathParts = path.split('.');
    let value = config;
    for (const part of pathParts) {
      value = value?.[part];
    }
    
    return value !== undefined ? value : fallback;
  } catch (error) {
    return fallback;
  }
}

const strategySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: false
  },
  symbol: {
    type: String,
    required: true
  },
  interval: {
    type: String,
    enum: ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d'],
    default: '5m'
  },
  indicators: {
    rsi: {
      enabled: { type: Boolean, default: true },
      period: { type: Number, default: 14 },
      overbought: { type: Number, default: 70 },
      oversold: { type: Number, default: 30 }
    },
    macd: {
      enabled: { type: Boolean, default: true },
      fastPeriod: { type: Number, default: 12 },
      slowPeriod: { type: Number, default: 26 },
      signalPeriod: { type: Number, default: 9 }
    },
    ma: {
      enabled: { type: Boolean, default: true },
      shortPeriod: { type: Number, default: 9 },
      longPeriod: { type: Number, default: 21 }
    },
    bollingerBands: {
      enabled: { type: Boolean, default: true },
      period: { type: Number, default: 20 },
      stdDev: { type: Number, default: 2 }
    },
    volume: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 1.5 }
    }
  },
  riskManagement: {
    maxPositionSize: { 
      type: Number, 
      default: async function() {
        return await getDefaultValue('riskManagement.maxPositionSize', 5000);
      }
    },
    stopLossPercentage: { 
      type: Number, 
      default: async function() {
        return await getDefaultValue('riskManagement.stopLossPercentage', 2);
      }
    },
    takeProfitPercentage: { 
      type: Number, 
      default: async function() {
        return await getDefaultValue('riskManagement.takeProfitPercentage', 5);
      }
    },
    riskPercentage: { 
      type: Number, 
      default: async function() {
        return await getDefaultValue('riskManagement.riskPercentage', 2);
      }
    }
  },
  useAI: {
    type: Boolean,
    default: async function() {
      return await getDefaultValue('aiDefaults.useAI', true);
    }
  },
  aiConfidenceThreshold: {
    type: Number,
    default: async function() {
      return await getDefaultValue('aiDefaults.confidenceThreshold', 0.7);
    }
  },
  performance: {
    totalTrades: { type: Number, default: 0 },
    winningTrades: { type: Number, default: 0 },
    losingTrades: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 }
  },
  lastExecuted: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

strategySchema.methods.updatePerformance = function(trade) {
  this.performance.totalTrades += 1;
  if (trade.profit > 0) {
    this.performance.winningTrades += 1;
  } else if (trade.profit < 0) {
    this.performance.losingTrades += 1;
  }
  this.performance.totalProfit += trade.profit;
  this.performance.winRate = (this.performance.winningTrades / this.performance.totalTrades) * 100;
};

module.exports = mongoose.model('Strategy', strategySchema);

