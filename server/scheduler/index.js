const cron = require('node-cron');
const Strategy = require('../models/Strategy');
const tradingService = require('../services/tradingService');
const logger = require('../utils/logger');

class Scheduler {
  constructor() {
    this.jobs = new Map();
  }

  // Start monitoring positions every minute
  startPositionMonitoring() {
    const job = cron.schedule('* * * * *', async () => {
      try {
        await tradingService.monitorPositions();
      } catch (error) {
        logger.error('Error in position monitoring:', error);
      }
    });

    this.jobs.set('positionMonitoring', job);
    logger.info('Position monitoring scheduler started');
  }

  // Start strategy execution based on interval
  async startStrategyExecution() {
    try {
      const activeStrategies = await Strategy.find({ isActive: true });

      for (const strategy of activeStrategies) {
        const cronExpression = this.getCronExpression(strategy.interval);
        
        const job = cron.schedule(cronExpression, async () => {
          try {
            logger.info(`Executing strategy: ${strategy.name}`);
            const result = await tradingService.executeTrade(strategy._id, false);
            
            if (result.executed) {
              logger.info(`Trade executed for strategy ${strategy.name}`);
            } else {
              logger.info(`No trade executed for strategy ${strategy.name}: ${result.reason}`);
            }
          } catch (error) {
            logger.error(`Error executing strategy ${strategy.name}:`, error);
          }
        });

        this.jobs.set(`strategy_${strategy._id}`, job);
        logger.info(`Scheduler started for strategy: ${strategy.name} (${strategy.interval})`);
      }
    } catch (error) {
      logger.error('Error starting strategy execution:', error);
    }
  }

  // Stop a specific job
  stopJob(jobId) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.stop();
      this.jobs.delete(jobId);
      logger.info(`Job ${jobId} stopped`);
    }
  }

  // Stop all jobs
  stopAll() {
    this.jobs.forEach((job, jobId) => {
      job.stop();
      logger.info(`Job ${jobId} stopped`);
    });
    this.jobs.clear();
    logger.info('All schedulers stopped');
  }

  // Get cron expression from interval
  getCronExpression(interval) {
    const intervalMap = {
      '1m': '* * * * *',
      '3m': '*/3 * * * *',
      '5m': '*/5 * * * *',
      '15m': '*/15 * * * *',
      '30m': '*/30 * * * *',
      '1h': '0 * * * *',
      '2h': '0 */2 * * *',
      '4h': '0 */4 * * *',
      '6h': '0 */6 * * *',
      '8h': '0 */8 * * *',
      '12h': '0 */12 * * *',
      '1d': '0 0 * * *'
    };

    return intervalMap[interval] || '*/5 * * * *'; // Default to 5 minutes
  }

  // Restart strategy schedulers
  async restartStrategySchedulers() {
    // Stop all strategy jobs
    const strategyJobs = Array.from(this.jobs.keys()).filter(key => key.startsWith('strategy_'));
    strategyJobs.forEach(jobId => this.stopJob(jobId));

    // Start new strategy jobs
    await this.startStrategyExecution();
  }
}

// Export singleton instance
const scheduler = new Scheduler();

// Initialize schedulers
const initializeSchedulers = async () => {
  try {
    logger.info('Initializing schedulers...');
    
    // Start position monitoring
    scheduler.startPositionMonitoring();
    
    // Start strategy execution
    await scheduler.startStrategyExecution();
    
    logger.info('All schedulers initialized successfully');
  } catch (error) {
    logger.error('Error initializing schedulers:', error);
  }
};

// Graceful shutdown
const shutdownSchedulers = () => {
  logger.info('Shutting down schedulers...');
  scheduler.stopAll();
};

module.exports = {
  scheduler,
  initializeSchedulers,
  shutdownSchedulers
};

