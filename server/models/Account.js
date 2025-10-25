const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  accountType: {
    type: String,
    enum: ['REAL', 'SIMULATED'],
    required: true
  },
  balance: {
    type: Number,
    required: true,
    default: 10000 // Default simulated balance
  },
  initialBalance: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USDT'
  },
  positions: [{
    symbol: String,
    quantity: Number,
    averagePrice: Number,
    currentPrice: Number,
    unrealizedPnL: Number,
    realizedPnL: Number
  }],
  totalProfit: {
    type: Number,
    default: 0
  },
  totalLoss: {
    type: Number,
    default: 0
  },
  netProfit: {
    type: Number,
    default: 0
  },
  profitPercentage: {
    type: Number,
    default: 0
  },
  totalTrades: {
    type: Number,
    default: 0
  },
  winningTrades: {
    type: Number,
    default: 0
  },
  losingTrades: {
    type: Number,
    default: 0
  },
  winRate: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

accountSchema.methods.updateBalance = function(amount) {
  this.balance += amount;
  this.netProfit = this.balance - this.initialBalance;
  this.profitPercentage = ((this.balance - this.initialBalance) / this.initialBalance) * 100;
  this.lastUpdated = new Date();
};

accountSchema.methods.addTrade = function(profit) {
  this.totalTrades += 1;
  if (profit > 0) {
    this.winningTrades += 1;
    this.totalProfit += profit;
  } else if (profit < 0) {
    this.losingTrades += 1;
    this.totalLoss += Math.abs(profit);
  }
  this.winRate = (this.winningTrades / this.totalTrades) * 100;
  this.updateBalance(profit);
};

module.exports = mongoose.model('Account', accountSchema);

