const mongoose = require('mongoose');

const candleSchema = new mongoose.Schema({
  openTime: { type: Number, required: true },
  open: { type: Number, required: true },
  high: { type: Number, required: true },
  low: { type: Number, required: true },
  close: { type: Number, required: true },
  volume: { type: Number, required: true },
  closeTime: { type: Number, required: true }
}, { _id: false });

const historicalDataSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  interval: {
    type: String,
    required: true,
    enum: ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w']
  },
  candles: [candleSchema],
  dataStartTime: {
    type: Number,
    required: true
  },
  dataEndTime: {
    type: Number,
    required: true
  },
  lastUpdateTime: {
    type: Date,
    default: Date.now
  },
  candleCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'UPDATING', 'ERROR'],
    default: 'ACTIVE'
  },
  errorMessage: String
}, {
  timestamps: true
});

// 复合索引，确保 symbol + interval 的唯一性和查询性能
historicalDataSchema.index({ symbol: 1, interval: 1 }, { unique: true });
historicalDataSchema.index({ lastUpdateTime: 1 });
historicalDataSchema.index({ dataStartTime: 1, dataEndTime: 1 });

// 方法：获取指定时间范围的K线数据
historicalDataSchema.methods.getCandlesInRange = function(startTime, endTime) {
  return this.candles.filter(candle => 
    candle.closeTime >= startTime && candle.closeTime <= endTime
  );
};

// 方法：添加新的K线数据（自动去重和排序）
historicalDataSchema.methods.addCandles = function(newCandles) {
  if (!newCandles || newCandles.length === 0) return;

  // 创建一个Map用于去重（使用openTime作为key）
  const candleMap = new Map();
  
  // 先添加现有数据
  this.candles.forEach(candle => {
    candleMap.set(candle.openTime, candle);
  });
  
  // 添加新数据（会覆盖重复的）
  newCandles.forEach(candle => {
    candleMap.set(candle.openTime, candle);
  });
  
  // 转换回数组并按时间排序
  this.candles = Array.from(candleMap.values()).sort((a, b) => a.openTime - b.openTime);
  
  // 更新统计信息
  if (this.candles.length > 0) {
    this.dataStartTime = this.candles[0].openTime;
    this.dataEndTime = this.candles[this.candles.length - 1].closeTime;
    this.candleCount = this.candles.length;
  }
  
  this.lastUpdateTime = new Date();
};

// 方法：检查数据是否需要更新（超过一个时间周期）
historicalDataSchema.methods.needsUpdate = function() {
  const now = Date.now();
  const lastUpdate = this.lastUpdateTime.getTime();
  
  // 根据不同时间周期设置不同的更新间隔
  const updateIntervals = {
    '1m': 1 * 60 * 1000,      // 1分钟
    '3m': 3 * 60 * 1000,      // 3分钟
    '5m': 5 * 60 * 1000,      // 5分钟
    '15m': 15 * 60 * 1000,    // 15分钟
    '30m': 30 * 60 * 1000,    // 30分钟
    '1h': 60 * 60 * 1000,     // 1小时
    '2h': 2 * 60 * 60 * 1000, // 2小时
    '4h': 4 * 60 * 60 * 1000, // 4小时
    '6h': 6 * 60 * 60 * 1000, // 6小时
    '8h': 8 * 60 * 60 * 1000, // 8小时
    '12h': 12 * 60 * 60 * 1000, // 12小时
    '1d': 24 * 60 * 60 * 1000,  // 1天
    '3d': 3 * 24 * 60 * 60 * 1000, // 3天
    '1w': 7 * 24 * 60 * 60 * 1000  // 1周
  };
  
  const interval = updateIntervals[this.interval] || 60 * 60 * 1000; // 默认1小时
  
  return (now - lastUpdate) > interval;
};

// 静态方法：查找或创建历史数据记录
historicalDataSchema.statics.findOrCreate = async function(symbol, interval) {
  let data = await this.findOne({ symbol, interval });
  
  if (!data) {
    data = await this.create({
      symbol,
      interval,
      candles: [],
      dataStartTime: Date.now(),
      dataEndTime: Date.now(),
      candleCount: 0
    });
  }
  
  return data;
};

// 静态方法：获取缓存统计信息
historicalDataSchema.statics.getCacheStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        totalCandles: { $sum: '$candleCount' },
        symbols: { $addToSet: '$symbol' },
        intervals: { $addToSet: '$interval' }
      }
    }
  ]);
  
  if (stats.length === 0) {
    return {
      totalRecords: 0,
      totalCandles: 0,
      uniqueSymbols: 0,
      uniqueIntervals: 0,
      symbols: [],
      intervals: []
    };
  }
  
  return {
    totalRecords: stats[0].totalRecords,
    totalCandles: stats[0].totalCandles,
    uniqueSymbols: stats[0].symbols.length,
    uniqueIntervals: stats[0].intervals.length,
    symbols: stats[0].symbols,
    intervals: stats[0].intervals
  };
};

// 静态方法：清理过期数据（可选，保留最近N天的数据）
historicalDataSchema.statics.cleanupOldData = async function(symbol, interval, keepDays = 730) {
  const cutoffTime = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
  
  const data = await this.findOne({ symbol, interval });
  if (!data) return null;
  
  const filteredCandles = data.candles.filter(candle => candle.closeTime >= cutoffTime);
  
  if (filteredCandles.length < data.candles.length) {
    data.candles = filteredCandles;
    if (data.candles.length > 0) {
      data.dataStartTime = data.candles[0].openTime;
      data.candleCount = data.candles.length;
    }
    await data.save();
    
    return {
      removed: data.candles.length - filteredCandles.length,
      remaining: filteredCandles.length
    };
  }
  
  return { removed: 0, remaining: filteredCandles.length };
};

module.exports = mongoose.model('HistoricalData', historicalDataSchema);

