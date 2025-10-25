const cron = require('node-cron');
const dataCacheService = require('../services/dataCacheService');
const HistoricalData = require('../models/HistoricalData');
const logger = require('../utils/logger');

class CacheScheduler {
  constructor() {
    this.tasks = [];
    this.isRunning = false;
  }

  /**
   * 启动定时任务
   */
  start() {
    if (this.isRunning) {
      logger.warn('[CacheScheduler] Scheduler is already running');
      return;
    }

    // 任务1: 每小时更新所有缓存
    const hourlyUpdateTask = cron.schedule('0 * * * *', async () => {
      logger.info('[CacheScheduler] Starting hourly cache update...');
      await this.updateAllCaches();
    }, {
      scheduled: false
    });

    // 任务2: 每天凌晨3点预热常用交易对缓存
    const dailyWarmupTask = cron.schedule('0 3 * * *', async () => {
      logger.info('[CacheScheduler] Starting daily cache warmup...');
      await this.warmupPopularPairs();
    }, {
      scheduled: false
    });

    // 任务3: 每周日凌晨4点清理超过2年的旧数据
    const weeklyCleanupTask = cron.schedule('0 4 * * 0', async () => {
      logger.info('[CacheScheduler] Starting weekly cache cleanup...');
      await this.cleanupOldData();
    }, {
      scheduled: false
    });

    // 启动所有任务
    hourlyUpdateTask.start();
    dailyWarmupTask.start();
    weeklyCleanupTask.start();

    this.tasks.push({
      name: 'Hourly Update',
      task: hourlyUpdateTask,
      schedule: 'Every hour'
    });

    this.tasks.push({
      name: 'Daily Warmup',
      task: dailyWarmupTask,
      schedule: 'Every day at 3:00 AM'
    });

    this.tasks.push({
      name: 'Weekly Cleanup',
      task: weeklyCleanupTask,
      schedule: 'Every Sunday at 4:00 AM'
    });

    this.isRunning = true;
    logger.info(`[CacheScheduler] Started ${this.tasks.length} scheduled tasks`);
  }

  /**
   * 停止所有定时任务
   */
  stop() {
    this.tasks.forEach(({ name, task }) => {
      task.stop();
      logger.info(`[CacheScheduler] Stopped task: ${name}`);
    });

    this.tasks = [];
    this.isRunning = false;
    logger.info('[CacheScheduler] All tasks stopped');
  }

  /**
   * 更新所有现有缓存
   */
  async updateAllCaches() {
    try {
      const allCaches = await HistoricalData.find({ status: 'ACTIVE' });
      
      logger.info(`[CacheScheduler] Found ${allCaches.length} caches to update`);

      let updated = 0;
      let skipped = 0;
      let failed = 0;

      for (const cache of allCaches) {
        try {
          // 只更新需要更新的缓存
          if (cache.needsUpdate()) {
            await dataCacheService.updateCache(cache.symbol, cache.interval);
            updated++;
            logger.info(`[CacheScheduler] Updated cache: ${cache.symbol} ${cache.interval}`);
          } else {
            skipped++;
          }

          // 限流，避免API请求过快
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          failed++;
          logger.error(`[CacheScheduler] Failed to update ${cache.symbol} ${cache.interval}:`, error.message);
        }
      }

      logger.info(`[CacheScheduler] Cache update completed: ${updated} updated, ${skipped} skipped, ${failed} failed`);
    } catch (error) {
      logger.error('[CacheScheduler] Error updating caches:', error);
    }
  }

  /**
   * 预热常用交易对的缓存
   */
  async warmupPopularPairs() {
    try {
      // 定义常用交易对和时间周期
      const popularPairs = [
        'BTCUSDT',
        'ETHUSDT',
        'BNBUSDT',
        'ADAUSDT',
        'SOLUSDT',
        'XRPUSDT',
        'DOGEUSDT',
        'DOTUSDT',
        'MATICUSDT',
        'LTCUSDT'
      ];

      const intervals = ['1h', '4h', '1d'];
      const days = 365; // 预加载1年数据

      logger.info(`[CacheScheduler] Warming up ${popularPairs.length} popular pairs...`);

      const results = await dataCacheService.warmupCache(popularPairs, intervals, days);

      const succeeded = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status === 'error').length;

      logger.info(`[CacheScheduler] Warmup completed: ${succeeded} succeeded, ${failed} failed`);
    } catch (error) {
      logger.error('[CacheScheduler] Error warming up caches:', error);
    }
  }

  /**
   * 清理超过指定天数的旧数据
   */
  async cleanupOldData(keepDays = 730) {
    try {
      logger.info(`[CacheScheduler] Cleaning up data older than ${keepDays} days...`);

      const allCaches = await HistoricalData.find({});
      let totalRemoved = 0;

      for (const cache of allCaches) {
        try {
          const result = await HistoricalData.cleanupOldData(
            cache.symbol,
            cache.interval,
            keepDays
          );

          if (result && result.removed > 0) {
            totalRemoved += result.removed;
            logger.info(`[CacheScheduler] Cleaned ${result.removed} old candles from ${cache.symbol} ${cache.interval}`);
          }
        } catch (error) {
          logger.error(`[CacheScheduler] Failed to cleanup ${cache.symbol} ${cache.interval}:`, error.message);
        }
      }

      logger.info(`[CacheScheduler] Cleanup completed: removed ${totalRemoved} old candles`);
    } catch (error) {
      logger.error('[CacheScheduler] Error cleaning up old data:', error);
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      tasks: this.tasks.map(({ name, schedule }) => ({
        name,
        schedule,
        running: true
      }))
    };
  }
}

module.exports = new CacheScheduler();

