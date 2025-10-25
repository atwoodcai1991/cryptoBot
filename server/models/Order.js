const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  symbol: {
    type: String,
    required: true
  },
  side: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  type: {
    type: String,
    enum: ['MARKET', 'LIMIT', 'STOP_LOSS', 'TAKE_PROFIT'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number
  },
  executedPrice: {
    type: Number
  },
  status: {
    type: String,
    enum: ['NEW', 'FILLED', 'PARTIALLY_FILLED', 'CANCELED', 'REJECTED'],
    default: 'NEW'
  },
  isSimulated: {
    type: Boolean,
    default: false
  },
  strategyName: {
    type: String
  },
  aiAnalysis: {
    recommendation: String,
    confidence: Number,
    reasoning: String
  },
  profit: {
    type: Number,
    default: 0
  },
  profitPercentage: {
    type: Number,
    default: 0
  },
  stopLoss: {
    type: Number
  },
  takeProfit: {
    type: Number
  },
  binanceOrderId: {
    type: String
  },
  executedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
orderSchema.index({ symbol: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ isSimulated: 1 });

module.exports = mongoose.model('Order', orderSchema);

