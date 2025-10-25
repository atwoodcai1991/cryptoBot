const binanceService = require('./binanceService');
const strategyService = require('./strategyService');
const aiService = require('./aiService');
const Backtest = require('../models/Backtest');
const Strategy = require('../models/Strategy');
const logger = require('../utils/logger');

class BacktestService {
  // Run backtest for a strategy
  async runBacktest(strategyId, startDate, endDate, initialBalance = 10000) {
    try {
      const strategy = await Strategy.findById(strategyId);
      if (!strategy) {
        throw new Error('Strategy not found');
      }

      // Create backtest record
      const backtest = new Backtest({
        name: `${strategy.name} - ${new Date().toISOString()}`,
        strategyId,
        symbol: strategy.symbol,
        interval: strategy.interval,
        startDate,
        endDate,
        initialBalance
      });

      await backtest.save();

      logger.info(`Starting backtest for ${strategy.name} from ${startDate} to ${endDate}`);

      // Get historical data
      const historicalData = await this.getHistoricalData(
        strategy.symbol,
        strategy.interval,
        startDate,
        endDate
      );

      if (historicalData.length === 0) {
        throw new Error('No historical data available for the specified period');
      }

      // Run simulation
      let balance = initialBalance;
      let position = null;
      const trades = [];
      const equityCurve = [];
      let maxBalance = initialBalance;
      let maxDrawdown = 0;

      // Process each candle
      for (let i = 100; i < historicalData.length; i++) {
        const currentCandles = historicalData.slice(0, i + 1);
        const currentPrice = currentCandles[currentCandles.length - 1].close;
        const currentDate = new Date(currentCandles[currentCandles.length - 1].closeTime);

        // Record equity
        const equity = position 
          ? balance + (position.side === 'BUY' 
              ? (currentPrice - position.entryPrice) * position.quantity
              : (position.entryPrice - currentPrice) * position.quantity)
          : balance;

        equityCurve.push({
          date: currentDate,
          balance: equity
        });

        // Update max balance and drawdown
        if (equity > maxBalance) {
          maxBalance = equity;
        }
        const currentDrawdown = ((maxBalance - equity) / maxBalance) * 100;
        if (currentDrawdown > maxDrawdown) {
          maxDrawdown = currentDrawdown;
        }

        // If we have an open position, check stop loss / take profit
        if (position) {
          let shouldClose = false;
          let closeReason = '';

          // Check stop loss
          if (position.side === 'BUY' && currentPrice <= position.stopLoss) {
            shouldClose = true;
            closeReason = 'Stop Loss';
          } else if (position.side === 'SELL' && currentPrice >= position.stopLoss) {
            shouldClose = true;
            closeReason = 'Stop Loss';
          }

          // Check take profit
          if (!shouldClose) {
            if (position.side === 'BUY' && currentPrice >= position.takeProfit) {
              shouldClose = true;
              closeReason = 'Take Profit';
            } else if (position.side === 'SELL' && currentPrice <= position.takeProfit) {
              shouldClose = true;
              closeReason = 'Take Profit';
            }
          }

          if (shouldClose) {
            const profit = position.side === 'BUY'
              ? (currentPrice - position.entryPrice) * position.quantity
              : (position.entryPrice - currentPrice) * position.quantity;

            balance += (position.entryPrice * position.quantity) + profit;

            trades.push({
              date: currentDate,
              side: position.side === 'BUY' ? 'SELL' : 'BUY',
              price: currentPrice,
              quantity: position.quantity,
              profit,
              balance,
              reason: closeReason
            });

            logger.info(`Closed ${position.side} position at ${currentPrice} (${closeReason}): ${profit > 0 ? '+' : ''}$${profit.toFixed(2)}`);
            position = null;
          }
        }

        // If no position, check for entry signals
        if (!position && i >= 100) {
          const signals = strategyService.analyzeStrategy(currentCandles, strategy);

          // Optionally use AI analysis (simplified for backtest)
          let finalAction = signals.action;
          if (strategy.useAI && signals.confidence > strategy.aiConfidenceThreshold) {
            finalAction = signals.action;
          }

          if (finalAction === 'BUY' || finalAction === 'SELL') {
            // Calculate position size
            const riskLevels = strategyService.calculateRiskLevels(
              currentPrice,
              finalAction,
              strategy.riskManagement
            );

            const positionSize = strategyService.calculatePositionSize(
              balance,
              strategy.riskManagement.riskPercentage,
              currentPrice,
              riskLevels.stopLoss
            );

            const positionValue = positionSize * currentPrice;

            // Check if we have enough balance
            if (positionValue <= balance && positionValue <= strategy.riskManagement.maxPositionSize) {
              balance -= positionValue;

              position = {
                side: finalAction,
                entryPrice: currentPrice,
                quantity: positionSize,
                stopLoss: riskLevels.stopLoss,
                takeProfit: riskLevels.takeProfit,
                entryDate: currentDate
              };

              trades.push({
                date: currentDate,
                side: finalAction,
                price: currentPrice,
                quantity: positionSize,
                profit: 0,
                balance
              });

              logger.info(`Opened ${finalAction} position: ${positionSize} at ${currentPrice}`);
            }
          }
        }
      }

      // Close any remaining position
      if (position) {
        const finalPrice = historicalData[historicalData.length - 1].close;
        const profit = position.side === 'BUY'
          ? (finalPrice - position.entryPrice) * position.quantity
          : (position.entryPrice - finalPrice) * position.quantity;

        balance += (position.entryPrice * position.quantity) + profit;

        trades.push({
          date: endDate,
          side: position.side === 'BUY' ? 'SELL' : 'BUY',
          price: finalPrice,
          quantity: position.quantity,
          profit,
          balance,
          reason: 'Backtest End'
        });
      }

      // Calculate results
      const winningTrades = trades.filter(t => t.profit && t.profit > 0).length;
      const losingTrades = trades.filter(t => t.profit && t.profit < 0).length;
      const totalProfit = trades.reduce((sum, t) => sum + (t.profit > 0 ? t.profit : 0), 0);
      const totalLoss = Math.abs(trades.reduce((sum, t) => sum + (t.profit < 0 ? t.profit : 0), 0));

      // Calculate Sharpe Ratio (simplified)
      const returns = equityCurve.slice(1).map((e, i) => 
        (e.balance - equityCurve[i].balance) / equityCurve[i].balance
      );
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const stdDev = Math.sqrt(
        returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
      );
      const sharpeRatio = stdDev !== 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

      // Update backtest record
      backtest.finalBalance = balance;
      backtest.totalTrades = trades.filter(t => t.side === 'BUY' || t.side === 'SELL').length / 2;
      backtest.winningTrades = winningTrades;
      backtest.losingTrades = losingTrades;
      backtest.winRate = backtest.totalTrades > 0 
        ? (winningTrades / backtest.totalTrades) * 100 
        : 0;
      backtest.totalProfit = totalProfit;
      backtest.totalLoss = totalLoss;
      backtest.netProfit = balance - initialBalance;
      backtest.profitPercentage = ((balance - initialBalance) / initialBalance) * 100;
      backtest.maxDrawdown = maxDrawdown;
      backtest.sharpeRatio = sharpeRatio;
      backtest.trades = trades;
      backtest.equityCurve = equityCurve;
      backtest.status = 'COMPLETED';
      backtest.completedAt = new Date();

      await backtest.save();

      logger.info(`Backtest completed for ${strategy.name}`);
      logger.info(`Final Balance: $${balance.toFixed(2)} (${backtest.profitPercentage.toFixed(2)}%)`);
      logger.info(`Total Trades: ${backtest.totalTrades}`);
      logger.info(`Win Rate: ${backtest.winRate.toFixed(2)}%`);
      logger.info(`Max Drawdown: ${maxDrawdown.toFixed(2)}%`);
      logger.info(`Sharpe Ratio: ${sharpeRatio.toFixed(2)}`);

      return backtest;
    } catch (error) {
      logger.error('Error running backtest:', error);
      throw error;
    }
  }

  // Get historical data for backtesting
  async getHistoricalData(symbol, interval, startDate, endDate) {
    try {
      const allCandles = [];
      const startTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();
      
      let currentStartTime = startTime;
      const limit = 1000; // Binance max limit

      while (currentStartTime < endTime) {
        const candles = await binanceService.getKlines(symbol, interval, limit);
        
        const filteredCandles = candles.filter(c => 
          c.closeTime >= currentStartTime && c.closeTime <= endTime
        );

        allCandles.push(...filteredCandles);

        if (filteredCandles.length < limit) {
          break;
        }

        currentStartTime = filteredCandles[filteredCandles.length - 1].closeTime + 1;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info(`Retrieved ${allCandles.length} historical candles for ${symbol}`);
      return allCandles;
    } catch (error) {
      logger.error('Error getting historical data:', error);
      throw error;
    }
  }

  // Get backtest results
  async getBacktestResults(backtestId) {
    try {
      const backtest = await Backtest.findById(backtestId).populate('strategyId');
      if (!backtest) {
        throw new Error('Backtest not found');
      }
      return backtest;
    } catch (error) {
      logger.error('Error getting backtest results:', error);
      throw error;
    }
  }

  // Get all backtests
  async getAllBacktests() {
    try {
      const backtests = await Backtest.find()
        .populate('strategyId')
        .sort({ createdAt: -1 });
      return backtests;
    } catch (error) {
      logger.error('Error getting all backtests:', error);
      throw error;
    }
  }

  // Delete backtest
  async deleteBacktest(backtestId) {
    try {
      await Backtest.findByIdAndDelete(backtestId);
      logger.info(`Backtest ${backtestId} deleted`);
    } catch (error) {
      logger.error('Error deleting backtest:', error);
      throw error;
    }
  }
}

module.exports = new BacktestService();

