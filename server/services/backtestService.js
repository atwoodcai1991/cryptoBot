const binanceService = require('./binanceService');
const dataCacheService = require('./dataCacheService');
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

      logger.info(`Processing ${historicalData.length} candles for backtest`);

      if (historicalData.length < 100) {
        throw new Error(`Insufficient historical data. Got ${historicalData.length} candles, need at least 100 for technical indicators.`);
      }

      // Run simulation
      let balance = initialBalance;
      let position = null;
      const trades = [];
      const equityCurve = [];
      let maxBalance = initialBalance;
      let maxDrawdown = 0;
      
      // Debug counters
      let totalBuySignals = 0;
      let totalSellSignals = 0;
      let totalHoldSignals = 0;
      let lowConfidenceSignals = 0;
      let aiCallsAttempted = 0;
      let aiCallsSucceeded = 0;
      let aiAgreements = 0;
      let aiDisagreements = 0;

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
          balance: equity,
          price: currentPrice
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

          // Log first few signals for debugging
          if (i === 100 || i === 200 || i === 500 || i === 1000) {
            logger.info(`Signal at candle ${i}: ${signals.action} (confidence: ${signals.confidence.toFixed(2)}), AI threshold: ${strategy.aiConfidenceThreshold}`);
            logger.info(`Buy signals: ${signals.buy.length}, Sell signals: ${signals.sell.length}`);
            if (signals.buy.length > 0) {
              logger.info(`Buy reasons: ${signals.buy.map(s => s.indicator).join(', ')}`);
            }
            if (signals.sell.length > 0) {
              logger.info(`Sell reasons: ${signals.sell.map(s => s.indicator).join(', ')}`);
            }
          }

          // Determine final action based on AI settings
          let finalAction = signals.action;
          let aiRecommendation = null;
          
          // Track signal statistics
          if (signals.action === 'BUY') totalBuySignals++;
          else if (signals.action === 'SELL') totalSellSignals++;
          else totalHoldSignals++;
          
          // If AI is enabled, call AI service for analysis
          if (strategy.useAI && signals.action !== 'HOLD' && signals.confidence >= strategy.aiConfidenceThreshold) {
            try {
              // Only call AI for promising signals (not every candle to save API calls)
              // Sample: call AI for 1 in every 10 signals to reduce costs in backtest
              const shouldCallAI = Math.random() < 0.1 || i === 100; // 10% sampling or first signal
              
              if (shouldCallAI) {
                aiCallsAttempted++;
                
                const marketData = {
                  symbol: strategy.symbol,
                  currentPrice,
                  priceChange24h: ((currentPrice - currentCandles[currentCandles.length - 24]?.close || currentPrice) / (currentCandles[currentCandles.length - 24]?.close || currentPrice)) * 100,
                  volume24h: currentCandles.slice(-24).reduce((sum, c) => sum + c.volume, 0),
                  high24h: Math.max(...currentCandles.slice(-24).map(c => c.high)),
                  low24h: Math.min(...currentCandles.slice(-24).map(c => c.low))
                };

                aiRecommendation = await aiService.getTradeRecommendation(
                  marketData,
                  signals,
                  strategy
                );
                
                aiCallsSucceeded++;

                if (i === 100 || (aiRecommendation && aiRecommendation.action !== signals.action)) {
                  logger.info(`AI recommendation: ${aiRecommendation?.action || 'N/A'} (confidence: ${aiRecommendation?.confidence?.toFixed(2) || 'N/A'})`);
                  if (aiRecommendation?.reasoning) {
                    logger.info(`AI reasoning: ${aiRecommendation.reasoning.substring(0, 100)}...`);
                  }
                }

                // Track agreements/disagreements
                if (aiRecommendation) {
                  if (aiRecommendation.action === signals.action) {
                    aiAgreements++;
                  } else {
                    aiDisagreements++;
                    logger.info(`AI disagrees: Technical=${signals.action}, AI=${aiRecommendation.action}`);
                  }
                }

                // Use AI recommendation if confidence is high enough
                if (aiRecommendation && aiRecommendation.confidence >= strategy.aiConfidenceThreshold) {
                  finalAction = aiRecommendation.action;
                } else if (aiRecommendation) {
                  logger.info(`AI confidence too low (${aiRecommendation.confidence.toFixed(2)} < ${strategy.aiConfidenceThreshold}), using technical signals`);
                }
              }
            } catch (error) {
              logger.warn(`AI analysis failed in backtest: ${error.message}, using technical signals only`);
            }
          } else if (strategy.useAI && signals.confidence < strategy.aiConfidenceThreshold) {
            // Technical signal confidence too low
            if (signals.action !== 'HOLD') {
              lowConfidenceSignals++;
            }
            finalAction = 'HOLD';
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
              riskLevels.stopLoss,
              strategy.riskManagement.maxPositionSize
            );

            const positionValue = positionSize * currentPrice;

            // Debug: Log first trade attempt
            if (i === 100 || trades.length === 0) {
              logger.info(`Trade attempt - Action: ${finalAction}, Price: ${currentPrice.toFixed(2)}`);
              logger.info(`Position size: ${positionSize.toFixed(8)}, Position value: $${positionValue.toFixed(2)}`);
              logger.info(`Balance: $${balance.toFixed(2)}, Max position: $${strategy.riskManagement.maxPositionSize}`);
              logger.info(`Risk: ${strategy.riskManagement.riskPercentage}%, Stop loss: ${riskLevels.stopLoss.toFixed(2)}`);
              logger.info(`Checks - Balance OK: ${positionValue <= balance}, Size OK: ${positionValue <= strategy.riskManagement.maxPositionSize}`);
            }

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
            } else {
              // Log why trade was rejected
              if (i === 100 || trades.length === 0) {
                if (positionValue > balance) {
                  logger.warn(`Trade rejected: Position value ($${positionValue.toFixed(2)}) exceeds balance ($${balance.toFixed(2)})`);
                }
                if (positionValue > strategy.riskManagement.maxPositionSize) {
                  logger.warn(`Trade rejected: Position value ($${positionValue.toFixed(2)}) exceeds max position size ($${strategy.riskManagement.maxPositionSize})`);
                }
              }
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
      logger.info(`Signal Statistics - BUY: ${totalBuySignals}, SELL: ${totalSellSignals}, HOLD: ${totalHoldSignals}`);
      logger.info(`Low confidence signals filtered: ${lowConfidenceSignals}`);
      logger.info(`AI enabled: ${strategy.useAI}, Confidence threshold: ${strategy.aiConfidenceThreshold}`);
      if (strategy.useAI) {
        logger.info(`AI Statistics - Calls attempted: ${aiCallsAttempted}, Succeeded: ${aiCallsSucceeded}`);
        logger.info(`AI vs Technical - Agreements: ${aiAgreements}, Disagreements: ${aiDisagreements}`);
        if (aiCallsAttempted > 0) {
          logger.info(`AI success rate: ${((aiCallsSucceeded / aiCallsAttempted) * 100).toFixed(1)}%`);
        }
      }

      return backtest;
    } catch (error) {
      logger.error('Error running backtest:', error);
      throw error;
    }
  }

  // Get historical data for backtesting (使用缓存系统)
  async getHistoricalData(symbol, interval, startDate, endDate) {
    try {
      const startTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();
      
      logger.info(`Fetching historical data for ${symbol} (${interval}) from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
      logger.info(`Requested period: ${((endTime - startTime) / (1000 * 60 * 60 * 24)).toFixed(1)} days`);

      // 使用数据缓存服务获取历史数据
      const candles = await dataCacheService.getHistoricalData(
        symbol,
        interval,
        startTime,
        endTime,
        false // 不强制刷新，优先使用缓存
      );

      logger.info(`✅ Retrieved ${candles.length} historical candles for ${symbol} (from cache or API)`);
      
      if (candles.length > 0) {
        const actualStartDate = new Date(candles[0].closeTime).toISOString().split('T')[0];
        const actualEndDate = new Date(candles[candles.length - 1].closeTime).toISOString().split('T')[0];
        const actualPeriod = ((candles[candles.length - 1].closeTime - candles[0].closeTime) / (1000 * 60 * 60 * 24)).toFixed(1);
        
        logger.info(`📅 Actual data range: ${actualStartDate} to ${actualEndDate} (${actualPeriod} days)`);
        
        // Warn if actual range is significantly shorter than requested
        const requestedPeriod = (endTime - startTime) / (1000 * 60 * 60 * 24);
        if (parseFloat(actualPeriod) < requestedPeriod * 0.8) {
          logger.warn(`⚠️  Retrieved data covers ${((parseFloat(actualPeriod) / requestedPeriod) * 100).toFixed(0)}% of requested period`);
          logger.warn(`⚠️  Binance may not have historical ${interval} data going back to ${new Date(startTime).toISOString()}`);
        }
      } else {
        logger.warn('❌ No historical data retrieved - this will cause a flat backtest curve');
      }

      return candles;
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

