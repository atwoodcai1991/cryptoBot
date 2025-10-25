const binanceService = require('./binanceService');
const strategyService = require('./strategyService');
const aiService = require('./aiService');
const Order = require('../models/Order');
const Account = require('../models/Account');
const Strategy = require('../models/Strategy');
const logger = require('../utils/logger');

class TradingService {
  constructor() {
    this.activePositions = new Map();
    this.runningStrategies = new Map();
  }

  // Execute a trade based on strategy analysis
  async executeTrade(strategyId, isSimulated = false) {
    try {
      const strategy = await Strategy.findById(strategyId);
      if (!strategy) {
        throw new Error('Strategy not found');
      }

      if (!strategy.isActive) {
        throw new Error('Strategy is not active');
      }

      // Get market data
      const klines = await binanceService.getKlines(
        strategy.symbol,
        strategy.interval,
        500
      );

      // Analyze with technical indicators
      const technicalSignals = strategyService.analyzeStrategy(klines, strategy);

      logger.info(`Technical signals for ${strategy.symbol}:`, technicalSignals);

      // Get AI analysis if enabled
      let aiAnalysis = null;
      if (strategy.useAI) {
        aiAnalysis = await aiService.analyzeMarket(
          klines,
          technicalSignals,
          strategy.symbol
        );

        logger.info(`AI analysis for ${strategy.symbol}:`, aiAnalysis);

        // Check if AI confidence meets threshold
        if (aiAnalysis.confidence < strategy.aiConfidenceThreshold) {
          logger.info(`AI confidence ${aiAnalysis.confidence} below threshold ${strategy.aiConfidenceThreshold}. Skipping trade.`);
          return {
            executed: false,
            reason: 'AI confidence below threshold',
            aiAnalysis
          };
        }
      }

      // Determine final action
      let finalAction = technicalSignals.action;
      if (strategy.useAI && aiAnalysis) {
        finalAction = aiAnalysis.recommendation;
      }

      // Don't trade on HOLD signal
      if (finalAction === 'HOLD') {
        logger.info('Signal is HOLD. No trade executed.');
        return {
          executed: false,
          reason: 'HOLD signal',
          technicalSignals,
          aiAnalysis
        };
      }

      // Get current price
      const currentPrice = await binanceService.getCurrentPrice(strategy.symbol);

      // Calculate risk levels
      const riskLevels = strategyService.calculateRiskLevels(
        currentPrice,
        finalAction,
        strategy.riskManagement
      );

      // Get account
      let account = await Account.findOne({ 
        accountType: isSimulated ? 'SIMULATED' : 'REAL' 
      });

      if (!account) {
        // Create default account
        account = new Account({
          accountType: isSimulated ? 'SIMULATED' : 'REAL',
          balance: isSimulated ? 10000 : await binanceService.getBalance(),
          initialBalance: isSimulated ? 10000 : await binanceService.getBalance()
        });
        await account.save();
      }

      // Calculate position size (now includes maxPositionSize check)
      const positionSize = strategyService.calculatePositionSize(
        account.balance,
        strategy.riskManagement.riskPercentage,
        currentPrice,
        riskLevels.stopLoss,
        strategy.riskManagement.maxPositionSize
      );

      // Check if position size is valid
      if (positionSize === 0) {
        logger.warn('Position size is zero or invalid');
        return {
          executed: false,
          reason: 'Position size exceeds maximum',
          positionSize
        };
      }

      // Execute the trade
      let orderResult;
      if (isSimulated) {
        orderResult = await this.executeSimulatedTrade(
          strategy.symbol,
          finalAction,
          positionSize,
          currentPrice
        );
      } else {
        orderResult = await this.executeRealTrade(
          strategy.symbol,
          finalAction,
          positionSize
        );
      }

      // Save order to database
      const order = new Order({
        orderId: orderResult.orderId || `SIM_${Date.now()}`,
        symbol: strategy.symbol,
        side: finalAction,
        type: 'MARKET',
        quantity: positionSize,
        price: currentPrice,
        executedPrice: orderResult.executedPrice || currentPrice,
        status: 'FILLED',
        isSimulated: isSimulated,
        strategyName: strategy.name,
        aiAnalysis: aiAnalysis ? {
          recommendation: aiAnalysis.recommendation,
          confidence: aiAnalysis.confidence,
          reasoning: aiAnalysis.reasoning
        } : null,
        stopLoss: riskLevels.stopLoss,
        takeProfit: riskLevels.takeProfit,
        binanceOrderId: orderResult.binanceOrderId,
        executedAt: new Date()
      });

      await order.save();

      // Update strategy performance
      strategy.lastExecuted = new Date();
      await strategy.save();

      logger.info(`Trade executed successfully: ${finalAction} ${positionSize} ${strategy.symbol} at ${currentPrice}`);

      return {
        executed: true,
        order: order.toObject(),
        technicalSignals,
        aiAnalysis,
        riskLevels
      };
    } catch (error) {
      logger.error('Error executing trade:', error);
      throw error;
    }
  }

  // Execute real trade on Binance
  async executeRealTrade(symbol, side, quantity) {
    try {
      const order = await binanceService.placeMarketOrder(symbol, side, quantity);
      
      return {
        orderId: order.orderId.toString(),
        binanceOrderId: order.orderId.toString(),
        executedPrice: parseFloat(order.fills[0].price),
        status: order.status
      };
    } catch (error) {
      logger.error('Error executing real trade:', error);
      throw error;
    }
  }

  // Execute simulated trade
  async executeSimulatedTrade(symbol, side, quantity, price) {
    try {
      const orderId = `SIM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info(`Simulated ${side} order: ${quantity} ${symbol} at $${price}`);

      return {
        orderId,
        executedPrice: price,
        status: 'FILLED'
      };
    } catch (error) {
      logger.error('Error executing simulated trade:', error);
      throw error;
    }
  }

  // Close a position
  async closePosition(orderId, isSimulated = false) {
    try {
      const order = await Order.findOne({ orderId });
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status === 'FILLED') {
        throw new Error('Position already closed');
      }

      const currentPrice = await binanceService.getCurrentPrice(order.symbol);
      const oppositeSide = order.side === 'BUY' ? 'SELL' : 'BUY';

      let closeResult;
      if (isSimulated || order.isSimulated) {
        closeResult = await this.executeSimulatedTrade(
          order.symbol,
          oppositeSide,
          order.quantity,
          currentPrice
        );
      } else {
        closeResult = await this.executeRealTrade(
          order.symbol,
          oppositeSide,
          order.quantity
        );
      }

      // Calculate profit/loss
      const profit = order.side === 'BUY' 
        ? (currentPrice - order.executedPrice) * order.quantity
        : (order.executedPrice - currentPrice) * order.quantity;

      const profitPercentage = (profit / (order.executedPrice * order.quantity)) * 100;

      // Create close order
      const closeOrder = new Order({
        orderId: closeResult.orderId,
        symbol: order.symbol,
        side: oppositeSide,
        type: 'MARKET',
        quantity: order.quantity,
        price: currentPrice,
        executedPrice: closeResult.executedPrice,
        status: 'FILLED',
        isSimulated: order.isSimulated,
        strategyName: order.strategyName,
        profit,
        profitPercentage,
        binanceOrderId: closeResult.binanceOrderId,
        executedAt: new Date()
      });

      await closeOrder.save();

      // Update original order
      order.status = 'CLOSED';
      order.profit = profit;
      order.profitPercentage = profitPercentage;
      await order.save();

      // Update account
      const account = await Account.findOne({ 
        accountType: order.isSimulated ? 'SIMULATED' : 'REAL' 
      });

      if (account) {
        account.addTrade(profit);
        await account.save();
      }

      // Update strategy performance
      const strategy = await Strategy.findOne({ name: order.strategyName });
      if (strategy) {
        strategy.updatePerformance({ profit });
        await strategy.save();
      }

      logger.info(`Position closed: ${profit > 0 ? 'Profit' : 'Loss'} $${Math.abs(profit)} (${profitPercentage.toFixed(2)}%)`);

      return {
        closeOrder: closeOrder.toObject(),
        profit,
        profitPercentage
      };
    } catch (error) {
      logger.error('Error closing position:', error);
      throw error;
    }
  }

  // Monitor open positions and execute stop loss / take profit
  async monitorPositions() {
    try {
      const openOrders = await Order.find({ 
        status: { $in: ['NEW', 'PARTIALLY_FILLED'] }
      });

      for (const order of openOrders) {
        const currentPrice = await binanceService.getCurrentPrice(order.symbol);

        let shouldClose = false;
        let reason = '';

        // Check stop loss
        if (order.stopLoss) {
          if (order.side === 'BUY' && currentPrice <= order.stopLoss) {
            shouldClose = true;
            reason = 'Stop loss triggered';
          } else if (order.side === 'SELL' && currentPrice >= order.stopLoss) {
            shouldClose = true;
            reason = 'Stop loss triggered';
          }
        }

        // Check take profit
        if (order.takeProfit && !shouldClose) {
          if (order.side === 'BUY' && currentPrice >= order.takeProfit) {
            shouldClose = true;
            reason = 'Take profit triggered';
          } else if (order.side === 'SELL' && currentPrice <= order.takeProfit) {
            shouldClose = true;
            reason = 'Take profit triggered';
          }
        }

        if (shouldClose) {
          logger.info(`${reason} for ${order.symbol}. Closing position...`);
          await this.closePosition(order.orderId, order.isSimulated);
        }
      }
    } catch (error) {
      logger.error('Error monitoring positions:', error);
    }
  }
}

module.exports = new TradingService();

