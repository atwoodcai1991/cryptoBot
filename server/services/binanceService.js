const Binance = require('binance-api-node').default;
const logger = require('../utils/logger');

class BinanceService {
  constructor() {
    this.client = null;
    this.isTestnet = process.env.BINANCE_TESTNET === 'true';
    this.initialize();
  }

  initialize() {
    try {
      const config = {
        apiKey: process.env.BINANCE_API_KEY,
        apiSecret: process.env.BINANCE_API_SECRET
      };

      if (this.isTestnet) {
        config.httpBase = 'https://testnet.binance.vision';
        config.wsBase = 'wss://testnet.binance.vision/ws';
      }

      this.client = Binance(config);
      logger.info(`Binance client initialized (Testnet: ${this.isTestnet})`);
    } catch (error) {
      logger.error('Error initializing Binance client:', error);
      throw error;
    }
  }

  // Get account information
  async getAccountInfo() {
    try {
      const accountInfo = await this.client.accountInfo();
      return accountInfo;
    } catch (error) {
      logger.error('Error getting account info:', error);
      throw error;
    }
  }

  // Get account balance
  async getBalance(asset = 'USDT') {
    try {
      const accountInfo = await this.getAccountInfo();
      const balance = accountInfo.balances.find(b => b.asset === asset);
      return balance ? parseFloat(balance.free) : 0;
    } catch (error) {
      logger.error('Error getting balance:', error);
      throw error;
    }
  }

  // Get current price
  async getCurrentPrice(symbol) {
    try {
      const ticker = await this.client.prices({ symbol });
      return parseFloat(ticker[symbol]);
    } catch (error) {
      logger.error(`Error getting price for ${symbol}:`, error);
      throw error;
    }
  }

  // Get historical candles/klines
  async getKlines(symbol, interval, limit = 500) {
    try {
      const candles = await this.client.candles({
        symbol,
        interval,
        limit
      });

      return candles.map(candle => ({
        openTime: candle.openTime,
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume),
        closeTime: candle.closeTime
      }));
    } catch (error) {
      logger.error(`Error getting klines for ${symbol}:`, error);
      throw error;
    }
  }

  // Place market order
  async placeMarketOrder(symbol, side, quantity) {
    try {
      logger.info(`Placing ${side} market order: ${quantity} ${symbol}`);
      
      const order = await this.client.order({
        symbol,
        side,
        type: 'MARKET',
        quantity: quantity.toString()
      });

      logger.info(`Order placed successfully: ${order.orderId}`);
      return order;
    } catch (error) {
      logger.error('Error placing market order:', error);
      throw error;
    }
  }

  // Place limit order
  async placeLimitOrder(symbol, side, quantity, price) {
    try {
      logger.info(`Placing ${side} limit order: ${quantity} ${symbol} at ${price}`);
      
      const order = await this.client.order({
        symbol,
        side,
        type: 'LIMIT',
        quantity: quantity.toString(),
        price: price.toString(),
        timeInForce: 'GTC'
      });

      logger.info(`Limit order placed successfully: ${order.orderId}`);
      return order;
    } catch (error) {
      logger.error('Error placing limit order:', error);
      throw error;
    }
  }

  // Place stop loss order
  async placeStopLossOrder(symbol, side, quantity, stopPrice) {
    try {
      logger.info(`Placing stop loss order: ${side} ${quantity} ${symbol} at ${stopPrice}`);
      
      const order = await this.client.order({
        symbol,
        side,
        type: 'STOP_LOSS_LIMIT',
        quantity: quantity.toString(),
        stopPrice: stopPrice.toString(),
        price: stopPrice.toString(),
        timeInForce: 'GTC'
      });

      logger.info(`Stop loss order placed successfully: ${order.orderId}`);
      return order;
    } catch (error) {
      logger.error('Error placing stop loss order:', error);
      throw error;
    }
  }

  // Cancel order
  async cancelOrder(symbol, orderId) {
    try {
      const result = await this.client.cancelOrder({
        symbol,
        orderId
      });
      logger.info(`Order ${orderId} cancelled successfully`);
      return result;
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  // Get order status
  async getOrderStatus(symbol, orderId) {
    try {
      const order = await this.client.getOrder({
        symbol,
        orderId
      });
      return order;
    } catch (error) {
      logger.error('Error getting order status:', error);
      throw error;
    }
  }

  // Get open orders
  async getOpenOrders(symbol) {
    try {
      const orders = await this.client.openOrders({ symbol });
      return orders;
    } catch (error) {
      logger.error('Error getting open orders:', error);
      throw error;
    }
  }

  // Get all orders
  async getAllOrders(symbol, limit = 500) {
    try {
      const orders = await this.client.allOrders({ symbol, limit });
      return orders;
    } catch (error) {
      logger.error('Error getting all orders:', error);
      throw error;
    }
  }

  // Subscribe to price updates via websocket
  subscribeToPriceUpdates(symbol, callback) {
    try {
      const clean = this.client.ws.ticker(symbol, ticker => {
        callback({
          symbol: ticker.symbol,
          price: parseFloat(ticker.curDayClose),
          priceChange: parseFloat(ticker.priceChange),
          priceChangePercent: parseFloat(ticker.priceChangePercent),
          volume: parseFloat(ticker.volume)
        });
      });

      logger.info(`Subscribed to price updates for ${symbol}`);
      return clean;
    } catch (error) {
      logger.error('Error subscribing to price updates:', error);
      throw error;
    }
  }

  // Get exchange info
  async getExchangeInfo() {
    try {
      const info = await this.client.exchangeInfo();
      return info;
    } catch (error) {
      logger.error('Error getting exchange info:', error);
      throw error;
    }
  }

  // Get symbol info
  async getSymbolInfo(symbol) {
    try {
      const exchangeInfo = await this.getExchangeInfo();
      const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol);
      return symbolInfo;
    } catch (error) {
      logger.error('Error getting symbol info:', error);
      throw error;
    }
  }
}

module.exports = new BinanceService();

