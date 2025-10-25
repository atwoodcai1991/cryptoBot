/**
 * 多数据源服务 - 支持从不同来源获取历史数据
 */
const logger = require('../utils/logger');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

class DataSourceService {
  constructor() {
    this.proxyAgent = null;
    this.setupProxy();
  }

  setupProxy() {
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (proxyUrl) {
      this.proxyAgent = new HttpsProxyAgent(proxyUrl);
      logger.info(`Data source proxy configured: ${proxyUrl}`);
    }
  }

  /**
   * 使用 axios 直接访问 Binance API（支持代理）
   */
  async fetchFromBinanceREST(symbol, interval, limit, startTime = null, endTime = null) {
    try {
      const url = 'https://api.binance.com/api/v3/klines';
      const params = {
        symbol,
        interval,
        limit: Math.min(limit, 1000)
      };

      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;

      const config = {
        timeout: 15000,
        params
      };

      // 如果有代理，使用代理
      if (this.proxyAgent) {
        config.httpsAgent = this.proxyAgent;
        config.proxy = false; // 禁用 axios 自动代理检测
      }

      logger.info(`Fetching from Binance REST API: ${symbol} ${interval} (${limit} candles)`);
      const response = await axios.get(url, config);

      // 转换为标准格式
      const candles = response.data.map(candle => ({
        openTime: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
        closeTime: candle[6]
      }));

      logger.info(`✅ Fetched ${candles.length} candles from Binance REST API`);
      return candles;
    } catch (error) {
      if (error.response) {
        logger.error(`Binance API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        logger.error(`Error fetching from Binance REST API: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 批量获取历史数据（循环调用以突破1000条限制）
   */
  async fetchHistoricalDataInBatches(symbol, interval, startTime, endTime) {
    const allCandles = [];
    let currentStartTime = startTime;
    const limit = 1000;
    let fetchCount = 0;
    const maxFetches = 100; // 最多100次请求，可获取约100,000条数据

    logger.info(`Starting batch fetch for ${symbol} ${interval} from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);

    while (currentStartTime < endTime && fetchCount < maxFetches) {
      fetchCount++;

      try {
        const candles = await this.fetchFromBinanceREST(
          symbol,
          interval,
          limit,
          currentStartTime,
          null
        );

        if (candles.length === 0) {
          logger.info(`No more data available at ${new Date(currentStartTime).toISOString()}`);
          break;
        }

        // 过滤在请求范围内的数据
        const filteredCandles = candles.filter(c =>
          c.closeTime >= startTime && c.closeTime <= endTime
        );

        if (filteredCandles.length > 0) {
          allCandles.push(...filteredCandles);
          logger.info(`Batch ${fetchCount}: Fetched ${filteredCandles.length} candles, total: ${allCandles.length}`);
        }

        // 如果返回的数据少于请求的limit，说明已经到头了
        if (candles.length < limit || candles[candles.length - 1].closeTime >= endTime) {
          break;
        }

        // 更新下一次的起始时间
        currentStartTime = candles[candles.length - 1].closeTime + 1;

        // 避免频率限制
        await new Promise(resolve => setTimeout(resolve, 250));

      } catch (error) {
        logger.error(`Error in batch ${fetchCount}: ${error.message}`);
        
        // 如果是网络错误，尝试重试
        if (fetchCount <= 3) {
          logger.info(`Retrying batch ${fetchCount} in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          currentStartTime = allCandles.length > 0 
            ? allCandles[allCandles.length - 1].closeTime + 1 
            : currentStartTime;
        } else {
          throw error;
        }
      }
    }

    logger.info(`✅ Completed batch fetch: ${allCandles.length} total candles`);
    return allCandles;
  }

  /**
   * 从 Binance 公开数据仓库下载（备用方案）
   * https://data.binance.vision/
   */
  async downloadFromBinanceVision(symbol, interval, date) {
    try {
      // Binance Vision 数据格式: https://data.binance.vision/data/spot/daily/klines/BTCUSDT/1h/BTCUSDT-1h-2024-01-01.zip
      const dateStr = date.toISOString().split('T')[0];
      const url = `https://data.binance.vision/data/spot/daily/klines/${symbol}/${interval}/${symbol}-${interval}-${dateStr}.zip`;

      logger.info(`Attempting to download from Binance Vision: ${url}`);
      
      // 这需要额外的 ZIP 解压缩和 CSV 解析逻辑
      // 留作未来扩展
      
      throw new Error('Binance Vision download not yet implemented');
    } catch (error) {
      logger.error(`Error downloading from Binance Vision: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new DataSourceService();

