const technicalIndicators = require('technicalindicators');
const logger = require('../utils/logger');

class StrategyService {
  // Calculate RSI (Relative Strength Index)
  calculateRSI(closePrices, period = 14) {
    try {
      const rsiInput = {
        values: closePrices,
        period: period
      };
      const rsi = technicalIndicators.RSI.calculate(rsiInput);
      return rsi;
    } catch (error) {
      logger.error('Error calculating RSI:', error);
      throw error;
    }
  }

  // Calculate MACD (Moving Average Convergence Divergence)
  calculateMACD(closePrices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    try {
      const macdInput = {
        values: closePrices,
        fastPeriod,
        slowPeriod,
        signalPeriod,
        SimpleMAOscillator: false,
        SimpleMASignal: false
      };
      const macd = technicalIndicators.MACD.calculate(macdInput);
      return macd;
    } catch (error) {
      logger.error('Error calculating MACD:', error);
      throw error;
    }
  }

  // Calculate Moving Averages
  calculateSMA(closePrices, period) {
    try {
      const smaInput = {
        values: closePrices,
        period: period
      };
      const sma = technicalIndicators.SMA.calculate(smaInput);
      return sma;
    } catch (error) {
      logger.error('Error calculating SMA:', error);
      throw error;
    }
  }

  calculateEMA(closePrices, period) {
    try {
      const emaInput = {
        values: closePrices,
        period: period
      };
      const ema = technicalIndicators.EMA.calculate(emaInput);
      return ema;
    } catch (error) {
      logger.error('Error calculating EMA:', error);
      throw error;
    }
  }

  // Calculate Bollinger Bands
  calculateBollingerBands(closePrices, period = 20, stdDev = 2) {
    try {
      const bbInput = {
        values: closePrices,
        period: period,
        stdDev: stdDev
      };
      const bb = technicalIndicators.BollingerBands.calculate(bbInput);
      return bb;
    } catch (error) {
      logger.error('Error calculating Bollinger Bands:', error);
      throw error;
    }
  }

  // Calculate Stochastic Oscillator
  calculateStochastic(high, low, close, period = 14, signalPeriod = 3) {
    try {
      const stochInput = {
        high,
        low,
        close,
        period,
        signalPeriod
      };
      const stoch = technicalIndicators.Stochastic.calculate(stochInput);
      return stoch;
    } catch (error) {
      logger.error('Error calculating Stochastic:', error);
      throw error;
    }
  }

  // Calculate ATR (Average True Range)
  calculateATR(high, low, close, period = 14) {
    try {
      const atrInput = {
        high,
        low,
        close,
        period
      };
      const atr = technicalIndicators.ATR.calculate(atrInput);
      return atr;
    } catch (error) {
      logger.error('Error calculating ATR:', error);
      throw error;
    }
  }

  // Analyze strategy signals
  analyzeStrategy(klines, strategy) {
    try {
      const closePrices = klines.map(k => k.close);
      const highPrices = klines.map(k => k.high);
      const lowPrices = klines.map(k => k.low);
      const volumes = klines.map(k => k.volume);

      const signals = {
        buy: [],
        sell: [],
        confidence: 0
      };

      let totalSignals = 0;
      let buySignals = 0;
      let sellSignals = 0;

      // RSI Analysis
      if (strategy.indicators.rsi.enabled) {
        const rsi = this.calculateRSI(closePrices, strategy.indicators.rsi.period);
        const currentRSI = rsi[rsi.length - 1];

        if (currentRSI < strategy.indicators.rsi.oversold) {
          signals.buy.push({ indicator: 'RSI', value: currentRSI, reason: 'Oversold' });
          buySignals++;
        } else if (currentRSI > strategy.indicators.rsi.overbought) {
          signals.sell.push({ indicator: 'RSI', value: currentRSI, reason: 'Overbought' });
          sellSignals++;
        }
        totalSignals++;
      }

      // MACD Analysis
      if (strategy.indicators.macd.enabled) {
        const macd = this.calculateMACD(
          closePrices,
          strategy.indicators.macd.fastPeriod,
          strategy.indicators.macd.slowPeriod,
          strategy.indicators.macd.signalPeriod
        );
        
        if (macd.length >= 2) {
          const current = macd[macd.length - 1];
          const previous = macd[macd.length - 2];

          // Bullish crossover
          if (previous.MACD < previous.signal && current.MACD > current.signal) {
            signals.buy.push({ 
              indicator: 'MACD', 
              value: current.MACD, 
              reason: 'Bullish crossover' 
            });
            buySignals++;
          }
          // Bearish crossover
          else if (previous.MACD > previous.signal && current.MACD < current.signal) {
            signals.sell.push({ 
              indicator: 'MACD', 
              value: current.MACD, 
              reason: 'Bearish crossover' 
            });
            sellSignals++;
          }
          totalSignals++;
        }
      }

      // Moving Average Analysis
      if (strategy.indicators.ma.enabled) {
        const shortMA = this.calculateSMA(closePrices, strategy.indicators.ma.shortPeriod);
        const longMA = this.calculateSMA(closePrices, strategy.indicators.ma.longPeriod);

        if (shortMA.length > 0 && longMA.length > 0) {
          const currentShortMA = shortMA[shortMA.length - 1];
          const currentLongMA = longMA[longMA.length - 1];
          const currentPrice = closePrices[closePrices.length - 1];

          // Golden cross
          if (currentShortMA > currentLongMA && currentPrice > currentShortMA) {
            signals.buy.push({ 
              indicator: 'MA', 
              value: { short: currentShortMA, long: currentLongMA }, 
              reason: 'Golden cross & price above MA' 
            });
            buySignals++;
          }
          // Death cross
          else if (currentShortMA < currentLongMA && currentPrice < currentShortMA) {
            signals.sell.push({ 
              indicator: 'MA', 
              value: { short: currentShortMA, long: currentLongMA }, 
              reason: 'Death cross & price below MA' 
            });
            sellSignals++;
          }
          totalSignals++;
        }
      }

      // Bollinger Bands Analysis
      if (strategy.indicators.bollingerBands.enabled) {
        const bb = this.calculateBollingerBands(
          closePrices,
          strategy.indicators.bollingerBands.period,
          strategy.indicators.bollingerBands.stdDev
        );

        if (bb.length > 0) {
          const currentBB = bb[bb.length - 1];
          const currentPrice = closePrices[closePrices.length - 1];

          // Price near lower band - potential buy
          if (currentPrice <= currentBB.lower) {
            signals.buy.push({ 
              indicator: 'BollingerBands', 
              value: currentBB, 
              reason: 'Price at lower band' 
            });
            buySignals++;
          }
          // Price near upper band - potential sell
          else if (currentPrice >= currentBB.upper) {
            signals.sell.push({ 
              indicator: 'BollingerBands', 
              value: currentBB, 
              reason: 'Price at upper band' 
            });
            sellSignals++;
          }
          totalSignals++;
        }
      }

      // Volume Analysis
      if (strategy.indicators.volume.enabled) {
        const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const currentVolume = volumes[volumes.length - 1];

        if (currentVolume > avgVolume * strategy.indicators.volume.threshold) {
          const priceChange = closePrices[closePrices.length - 1] - closePrices[closePrices.length - 2];
          
          if (priceChange > 0) {
            signals.buy.push({ 
              indicator: 'Volume', 
              value: currentVolume, 
              reason: 'High volume with price increase' 
            });
            buySignals++;
          } else if (priceChange < 0) {
            signals.sell.push({ 
              indicator: 'Volume', 
              value: currentVolume, 
              reason: 'High volume with price decrease' 
            });
            sellSignals++;
          }
          totalSignals++;
        }
      }

      // Calculate overall signal
      if (totalSignals > 0) {
        const buyConfidence = buySignals / totalSignals;
        const sellConfidence = sellSignals / totalSignals;

        if (buyConfidence > sellConfidence) {
          signals.action = 'BUY';
          signals.confidence = buyConfidence;
        } else if (sellConfidence > buyConfidence) {
          signals.action = 'SELL';
          signals.confidence = sellConfidence;
        } else {
          signals.action = 'HOLD';
          signals.confidence = 0.5;
        }
      } else {
        signals.action = 'HOLD';
        signals.confidence = 0;
      }

      signals.currentPrice = closePrices[closePrices.length - 1];
      signals.timestamp = new Date();

      return signals;
    } catch (error) {
      logger.error('Error analyzing strategy:', error);
      throw error;
    }
  }

  // Calculate stop loss and take profit levels
  calculateRiskLevels(entryPrice, side, riskManagement) {
    const { stopLossPercentage, takeProfitPercentage } = riskManagement;

    let stopLoss, takeProfit;

    if (side === 'BUY') {
      stopLoss = entryPrice * (1 - stopLossPercentage / 100);
      takeProfit = entryPrice * (1 + takeProfitPercentage / 100);
    } else {
      stopLoss = entryPrice * (1 + stopLossPercentage / 100);
      takeProfit = entryPrice * (1 - takeProfitPercentage / 100);
    }

    return {
      stopLoss: parseFloat(stopLoss.toFixed(8)),
      takeProfit: parseFloat(takeProfit.toFixed(8))
    };
  }

  // Calculate position size based on risk management
  calculatePositionSize(accountBalance, riskPercentage, entryPrice, stopLossPrice, maxPositionSize = null) {
    const riskAmount = accountBalance * (riskPercentage / 100);
    const priceRisk = Math.abs(entryPrice - stopLossPrice);
    
    // Avoid division by zero
    if (priceRisk === 0) {
      logger.warn('Price risk is zero, cannot calculate position size');
      return 0;
    }
    
    let positionSize = riskAmount / priceRisk;
    let positionValue = positionSize * entryPrice;
    
    // If maxPositionSize is set and position value exceeds it, reduce position size
    if (maxPositionSize && positionValue > maxPositionSize) {
      positionSize = maxPositionSize / entryPrice;
      positionValue = maxPositionSize;
      logger.info(`Position size reduced to fit maxPositionSize: ${maxPositionSize}`);
    }
    
    // Also ensure position value doesn't exceed account balance
    if (positionValue > accountBalance) {
      positionSize = accountBalance / entryPrice;
      logger.info(`Position size reduced to fit account balance: ${accountBalance}`);
    }
    
    return parseFloat(positionSize.toFixed(8));
  }
}

module.exports = new StrategyService();

