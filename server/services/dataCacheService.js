const binanceService = require('./binanceService');
const dataSourceService = require('./dataSourceService');
const HistoricalData = require('../models/HistoricalData');
const logger = require('../utils/logger');

class DataCacheService {
  constructor() {
    this.isUpdating = new Map(); // 跟踪正在更新的数据，避免重复更新
  }

  /**
   * 获取历史数据（优先从缓存，缺失时从API获取）
   * @param {String} symbol - 交易对 (e.g., 'BTCUSDT')
   * @param {String} interval - 时间周期 (e.g., '1h', '4h', '1d')
   * @param {Number} startTime - 开始时间戳（毫秒）
   * @param {Number} endTime - 结束时间戳（毫秒）
   * @param {Boolean} forceRefresh - 是否强制刷新（忽略缓存）
   * @returns {Array} K线数据数组
   */
  async getHistoricalData(symbol, interval, startTime, endTime, forceRefresh = false) {
    try {
      logger.info(`[DataCache] Fetching ${symbol} ${interval} data from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);

      // 查找缓存
      let cachedData = await HistoricalData.findOne({ symbol, interval });

      // 如果缓存不存在或需要强制刷新，创建新记录
      if (!cachedData || forceRefresh) {
        logger.info(`[DataCache] ${forceRefresh ? 'Force refresh' : 'No cache found'}, fetching from Binance API...`);
        cachedData = await this.fetchAndCache(symbol, interval, startTime, endTime);
      } else {
        // 检查缓存是否覆盖所需的时间范围
        const cacheCoversRange = cachedData.dataStartTime <= startTime && cachedData.dataEndTime >= endTime;
        
        if (cacheCoversRange) {
          logger.info(`[DataCache] Cache hit! Using cached data (${cachedData.candleCount} candles)`);
          
          // 检查是否需要更新最新数据
          if (cachedData.needsUpdate()) {
            logger.info(`[DataCache] Cache needs update, updating in background...`);
            // 异步更新，不阻塞当前请求
            this.updateCache(symbol, interval).catch(err => {
              logger.error(`[DataCache] Background update failed:`, err);
            });
          }
        } else {
          // 缓存不完整，需要补充数据
          logger.info(`[DataCache] Cache incomplete, fetching missing data...`);
          logger.info(`[DataCache] Cache range: ${new Date(cachedData.dataStartTime).toISOString()} - ${new Date(cachedData.dataEndTime).toISOString()}`);
          logger.info(`[DataCache] Requested range: ${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`);
          
          await this.fillMissingData(cachedData, startTime, endTime);
        }
      }

      // 从缓存中提取所需时间范围的数据
      const candles = cachedData.getCandlesInRange(startTime, endTime);
      logger.info(`[DataCache] Returning ${candles.length} candles for requested range`);
      
      return candles;
    } catch (error) {
      logger.error('[DataCache] Error getting historical data:', error);
      throw error;
    }
  }

  /**
   * 从Binance API获取数据并缓存
   * @param {String} symbol - 交易对
   * @param {String} interval - 时间周期
   * @param {Number} startTime - 开始时间戳
   * @param {Number} endTime - 结束时间戳
   * @returns {Object} HistoricalData 文档
   */
  async fetchAndCache(symbol, interval, startTime, endTime) {
    const key = `${symbol}_${interval}`;
    
    // 防止重复获取
    if (this.isUpdating.get(key)) {
      logger.info(`[DataCache] Already fetching ${key}, waiting...`);
      await this.waitForUpdate(key);
      return await HistoricalData.findOne({ symbol, interval });
    }

    this.isUpdating.set(key, true);

    try {
      // 查找或创建缓存记录
      let cachedData = await HistoricalData.findOrCreate(symbol, interval);
      cachedData.status = 'UPDATING';
      await cachedData.save();

      const allCandles = [];
      let currentStartTime = startTime;
      const limit = 1000; // Binance max limit
      let fetchCount = 0;
      const maxFetches = 100;

      // 判断使用哪个数据源
      const useTestnet = process.env.BINANCE_TESTNET === 'true';
      
      if (useTestnet) {
        // 测试网使用 binanceService
        logger.info(`[DataCache] Fetching data from Binance API (Testnet)...`);

        while (currentStartTime < endTime && fetchCount < maxFetches) {
          fetchCount++;

          const candles = await binanceService.getKlines(
            symbol,
            interval,
            limit,
            currentStartTime,
            null
          );

          if (candles.length === 0) {
            logger.warn(`[DataCache] No more candles available from ${new Date(currentStartTime).toISOString()}`);
            break;
          }

          // 过滤在时间范围内的数据
          const filteredCandles = candles.filter(c =>
            c.closeTime >= startTime && c.closeTime <= endTime
          );

          if (filteredCandles.length > 0) {
            allCandles.push(...filteredCandles);
          }

          if (candles.length < limit) {
            logger.info(`[DataCache] Reached end of available data`);
            break;
          }

          const lastCandleTime = candles[candles.length - 1].closeTime;
          if (lastCandleTime >= endTime) {
            logger.info(`[DataCache] Reached requested end time`);
            break;
          }

          if (lastCandleTime === currentStartTime) {
            logger.error('[DataCache] Infinite loop detected');
            break;
          }

          currentStartTime = lastCandleTime + 1;

          // API限流
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      } else {
        // 正式网使用 dataSourceService（更好的代理支持）
        logger.info(`[DataCache] Fetching data from Binance REST API (Production with axios)...`);
        
        try {
          const candles = await dataSourceService.fetchHistoricalDataInBatches(
            symbol,
            interval,
            startTime,
            endTime
          );
          allCandles.push(...candles);
        } catch (error) {
          logger.error(`[DataCache] dataSourceService failed: ${error.message}`);
          logger.info(`[DataCache] Falling back to binanceService...`);
          
          // 降级到 binanceService
          while (currentStartTime < endTime && fetchCount < maxFetches) {
            fetchCount++;

            const candles = await binanceService.getKlines(
              symbol,
              interval,
              limit,
              currentStartTime,
              null
            );

            if (candles.length === 0) break;

            const filteredCandles = candles.filter(c =>
              c.closeTime >= startTime && c.closeTime <= endTime
            );

            if (filteredCandles.length > 0) {
              allCandles.push(...filteredCandles);
            }

            if (candles.length < limit) break;

            const lastCandleTime = candles[candles.length - 1].closeTime;
            if (lastCandleTime >= endTime) break;
            if (lastCandleTime === currentStartTime) break;

            currentStartTime = lastCandleTime + 1;
            await new Promise(resolve => setTimeout(resolve, 250));
          }
        }
      }

      logger.info(`[DataCache] Fetched ${allCandles.length} candles in ${fetchCount} API calls`);

      // 保存到缓存
      cachedData.addCandles(allCandles);
      cachedData.status = 'ACTIVE';
      cachedData.errorMessage = undefined;
      await cachedData.save();

      logger.info(`[DataCache] Cached ${cachedData.candleCount} candles for ${symbol} ${interval}`);
      logger.info(`[DataCache] Cache range: ${new Date(cachedData.dataStartTime).toISOString()} - ${new Date(cachedData.dataEndTime).toISOString()}`);

      return cachedData;
    } catch (error) {
      logger.error('[DataCache] Error fetching and caching data:', error);
      
      // 更新错误状态
      const cachedData = await HistoricalData.findOne({ symbol, interval });
      if (cachedData) {
        cachedData.status = 'ERROR';
        cachedData.errorMessage = error.message;
        await cachedData.save();
      }
      
      throw error;
    } finally {
      this.isUpdating.delete(key);
    }
  }

  /**
   * 补充缺失的数据
   * @param {Object} cachedData - HistoricalData 文档
   * @param {Number} requestedStart - 请求的开始时间
   * @param {Number} requestedEnd - 请求的结束时间
   */
  async fillMissingData(cachedData, requestedStart, requestedEnd) {
    try {
      const missingRanges = [];

      // 检查是否需要补充早期数据
      if (requestedStart < cachedData.dataStartTime) {
        missingRanges.push({
          start: requestedStart,
          end: Math.min(cachedData.dataStartTime - 1, requestedEnd)
        });
      }

      // 检查是否需要补充最新数据
      if (requestedEnd > cachedData.dataEndTime) {
        missingRanges.push({
          start: Math.max(cachedData.dataEndTime + 1, requestedStart),
          end: requestedEnd
        });
      }

      for (const range of missingRanges) {
        logger.info(`[DataCache] Filling missing data: ${new Date(range.start).toISOString()} to ${new Date(range.end).toISOString()}`);
        
        let newCandles = [];
        
        // 首先尝试使用 binanceService（如果是测试网模式）
        const useTestnet = process.env.BINANCE_TESTNET === 'true';
        
        if (useTestnet) {
          // 测试网使用原有的 binanceService
          let currentStartTime = range.start;
          const limit = 1000;
          let fetchCount = 0;

          while (currentStartTime < range.end && fetchCount < 50) {
            fetchCount++;

            const candles = await binanceService.getKlines(
              cachedData.symbol,
              cachedData.interval,
              limit,
              currentStartTime,
              null
            );

            if (candles.length === 0) break;

            const filteredCandles = candles.filter(c =>
              c.closeTime >= range.start && c.closeTime <= range.end
            );

            if (filteredCandles.length > 0) {
              newCandles.push(...filteredCandles);
            }

            if (candles.length < limit || candles[candles.length - 1].closeTime >= range.end) {
              break;
            }

            currentStartTime = candles[candles.length - 1].closeTime + 1;
            await new Promise(resolve => setTimeout(resolve, 250));
          }
        } else {
          // 正式网使用 dataSourceService（支持更好的代理和批量获取）
          try {
            newCandles = await dataSourceService.fetchHistoricalDataInBatches(
              cachedData.symbol,
              cachedData.interval,
              range.start,
              range.end
            );
          } catch (error) {
            logger.error(`[DataCache] dataSourceService failed, falling back to binanceService: ${error.message}`);
            
            // 降级方案：使用 binanceService
            let currentStartTime = range.start;
            const limit = 1000;
            let fetchCount = 0;

            while (currentStartTime < range.end && fetchCount < 50) {
              fetchCount++;

              const candles = await binanceService.getKlines(
                cachedData.symbol,
                cachedData.interval,
                limit,
                currentStartTime,
                null
              );

              if (candles.length === 0) break;

              const filteredCandles = candles.filter(c =>
                c.closeTime >= range.start && c.closeTime <= range.end
              );

              if (filteredCandles.length > 0) {
                newCandles.push(...filteredCandles);
              }

              if (candles.length < limit || candles[candles.length - 1].closeTime >= range.end) {
                break;
              }

              currentStartTime = candles[candles.length - 1].closeTime + 1;
              await new Promise(resolve => setTimeout(resolve, 250));
            }
          }
        }

        logger.info(`[DataCache] Filled ${newCandles.length} missing candles`);
        
        // 添加到缓存
        if (newCandles.length > 0) {
          cachedData.addCandles(newCandles);
        }
      }

      await cachedData.save();
      logger.info(`[DataCache] Cache updated, now contains ${cachedData.candleCount} candles`);
    } catch (error) {
      logger.error('[DataCache] Error filling missing data:', error);
      throw error;
    }
  }

  /**
   * 更新缓存的最新数据
   * @param {String} symbol - 交易对
   * @param {String} interval - 时间周期
   */
  async updateCache(symbol, interval) {
    const key = `${symbol}_${interval}`;
    
    if (this.isUpdating.get(key)) {
      logger.info(`[DataCache] Already updating ${key}`);
      return;
    }

    this.isUpdating.set(key, true);

    try {
      const cachedData = await HistoricalData.findOne({ symbol, interval });
      if (!cachedData) {
        logger.warn(`[DataCache] No cache found for ${key}`);
        return;
      }

      logger.info(`[DataCache] Updating cache for ${key}...`);

      // 获取最新数据（从缓存的最后时间开始）
      const startTime = cachedData.dataEndTime + 1;
      const endTime = Date.now();

      const newCandles = await binanceService.getKlines(
        symbol,
        interval,
        1000,
        startTime,
        null
      );

      if (newCandles.length > 0) {
        cachedData.addCandles(newCandles);
        await cachedData.save();
        logger.info(`[DataCache] Added ${newCandles.length} new candles to cache`);
      } else {
        logger.info(`[DataCache] No new candles available`);
        cachedData.lastUpdateTime = new Date();
        await cachedData.save();
      }
    } catch (error) {
      logger.error('[DataCache] Error updating cache:', error);
    } finally {
      this.isUpdating.delete(key);
    }
  }

  /**
   * 等待更新完成
   * @param {String} key - 缓存键
   */
  async waitForUpdate(key, maxWaitTime = 60000) {
    const startTime = Date.now();
    while (this.isUpdating.get(key) && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats() {
    try {
      const stats = await HistoricalData.getCacheStats();
      
      // 获取每个缓存的详细信息
      const cacheDetails = await HistoricalData.find({})
        .select('symbol interval candleCount dataStartTime dataEndTime lastUpdateTime status')
        .sort({ lastUpdateTime: -1 });

      return {
        ...stats,
        details: cacheDetails.map(d => ({
          symbol: d.symbol,
          interval: d.interval,
          candleCount: d.candleCount,
          dataStartDate: new Date(d.dataStartTime).toISOString(),
          dataEndDate: new Date(d.dataEndTime).toISOString(),
          lastUpdate: d.lastUpdateTime,
          status: d.status,
          needsUpdate: d.needsUpdate()
        }))
      };
    } catch (error) {
      logger.error('[DataCache] Error getting cache stats:', error);
      throw error;
    }
  }

  /**
   * 清除指定的缓存
   * @param {String} symbol - 交易对（可选，为空则清除所有）
   * @param {String} interval - 时间周期（可选）
   */
  async clearCache(symbol = null, interval = null) {
    try {
      const query = {};
      if (symbol) query.symbol = symbol;
      if (interval) query.interval = interval;

      const result = await HistoricalData.deleteMany(query);
      logger.info(`[DataCache] Cleared ${result.deletedCount} cache records`);
      
      return { deletedCount: result.deletedCount };
    } catch (error) {
      logger.error('[DataCache] Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * 预热常用交易对的缓存
   * @param {Array} symbols - 交易对数组
   * @param {Array} intervals - 时间周期数组
   * @param {Number} days - 预加载多少天的数据
   */
  async warmupCache(symbols = ['BTCUSDT', 'ETHUSDT'], intervals = ['1h', '4h', '1d'], days = 365) {
    logger.info(`[DataCache] Warming up cache for ${symbols.length} symbols...`);
    
    const endTime = Date.now();
    const startTime = endTime - (days * 24 * 60 * 60 * 1000);

    const results = [];

    for (const symbol of symbols) {
      for (const interval of intervals) {
        try {
          logger.info(`[DataCache] Preloading ${symbol} ${interval}...`);
          await this.getHistoricalData(symbol, interval, startTime, endTime);
          results.push({ symbol, interval, status: 'success' });
        } catch (error) {
          logger.error(`[DataCache] Failed to preload ${symbol} ${interval}:`, error.message);
          results.push({ symbol, interval, status: 'error', error: error.message });
        }
      }
    }

    logger.info(`[DataCache] Cache warmup completed`);
    return results;
  }
}

module.exports = new DataCacheService();

