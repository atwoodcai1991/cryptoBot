const mongoose = require('mongoose');

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
    maxPositionSize: { type: Number, default: 1000 },
    stopLossPercentage: { type: Number, default: 2 },
    takeProfitPercentage: { type: Number, default: 5 },
    riskPercentage: { type: Number, default: 2 }
  },
  useAI: {
    type: Boolean,
    default: true
  },
  aiConfidenceThreshold: {
    type: Number,
    default: 0.7
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

