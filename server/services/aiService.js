const { GoogleGenAI } = require('@google/genai');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.ai = null;
    this.initialize();
  }

  initialize() {
    try {
      if (!process.env.GEMINI_API_KEY) {
        logger.warn('Gemini API key not found. AI analysis will be disabled.');
        return;
      }

      // 开发环境检测
      const isDev = process.env.NODE_ENV !== 'production' || process.env.IS_DEV === 'true';

      logger.info(`[DEV] Gemini AI using proxy222: ${process.env.IS_DEV} ${isDev}  ${process.env.HTTP_PROXY}`);
      // 配置代理支持（仅在开发环境且设置了代理）
      this.proxyConfigured = false;
      if (isDev && (process.env.HTTP_PROXY || process.env.HTTPS_PROXY)) {
        try {
          const { ProxyAgent, setGlobalDispatcher } = require('undici');
          const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
          const dispatcher = new ProxyAgent(proxyUrl);
          setGlobalDispatcher(dispatcher);
          this.proxyConfigured = true;
          logger.info(`[DEV] Gemini AI using proxy: ${proxyUrl}`);
          
          // 同时设置全局代理环境变量（确保所有 fetch 调用都使用代理）
          if (!global.fetch) {
            // 使用 undici 的 fetch
            const { fetch } = require('undici');
            global.fetch = fetch;
            logger.info('[DEV] Global fetch configured with proxy');
          }
        } catch (error) {
          logger.warn('Proxy configuration failed, continuing without proxy:', error.message);
        }
      } else if (!isDev) {
        logger.info('Production mode: proxy disabled');
      }

      // 使用官方推荐的 @google/genai SDK
      this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      logger.info(`Gemini AI client initialized successfully (using @google/genai v1.27.0) [${isDev ? 'DEV' : 'PROD'} mode]`);
    } catch (error) {
      logger.error('Error initializing Gemini AI client:', error);
    }
  }
  
  // Ensure proxy is configured before AI calls
  ensureProxyConfigured() {
    const isDev = process.env.NODE_ENV !== 'production' || process.env.IS_DEV === 'true';
    if (isDev && (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) && !this.proxyConfigured) {
      try {
        const { ProxyAgent, setGlobalDispatcher } = require('undici');
        const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
        const dispatcher = new ProxyAgent(proxyUrl);
        setGlobalDispatcher(dispatcher);
        this.proxyConfigured = true;
        logger.info(`[DEV] Re-configured proxy: ${proxyUrl}`);
      } catch (error) {
        logger.warn('Proxy re-configuration failed:', error.message);
      }
    }
  }

  // 健康检查
  async healthCheck() {
    if (!this.ai) {
      return { healthy: false, message: 'AI client not initialized' };
    }
    
    try {
      // 发送简单的测试请求
      await this.ai.models.generateContent({
        model: 'gemini-2.0-flash-001',
        contents: 'test'
      });
      return { healthy: true, message: 'AI service is working' };
    } catch (error) {
      if (error.message && error.message.includes('503')) {
        return { healthy: true, message: 'AI service connected (temporarily overloaded)' };
      }
      return { healthy: false, message: error.message };
    }
  }

  // Analyze market data and provide trading recommendation
  async analyzeMarket(klines, technicalSignals, symbol) {
    try {
      if (!this.ai) {
        logger.warn('Gemini AI client not initialized. Skipping AI analysis.');
        return {
          recommendation: technicalSignals.action,
          confidence: technicalSignals.confidence,
          reasoning: 'AI analysis disabled - using technical signals only',
          enabled: false
        };
      }

      // Prepare market data summary
      const recentCandles = klines.slice(-10);
      const currentPrice = klines[klines.length - 1].close;
      const priceChange = ((currentPrice - klines[klines.length - 20].close) / klines[klines.length - 20].close) * 100;

      const marketContext = `
Symbol: ${symbol}
Current Price: $${currentPrice}
Price Change (20 periods): ${priceChange.toFixed(2)}%

Recent Price Action:
${recentCandles.map((k, i) => 
  `${i + 1}. Open: $${k.open}, High: $${k.high}, Low: $${k.low}, Close: $${k.close}, Volume: ${k.volume}`
).join('\n')}

Technical Indicators Analysis:
- Action: ${technicalSignals.action}
- Confidence: ${(technicalSignals.confidence * 100).toFixed(2)}%
- Buy Signals: ${JSON.stringify(technicalSignals.buy, null, 2)}
- Sell Signals: ${JSON.stringify(technicalSignals.sell, null, 2)}
`;

      const prompt = `You are an expert cryptocurrency trading analyst. Based on the following market data and technical analysis, provide a trading recommendation.

${marketContext}

Please analyze this data and provide:
1. Your recommendation (BUY, SELL, or HOLD)
2. Confidence level (0-1)
3. Brief reasoning for your recommendation
4. Key risk factors to consider

Respond ONLY with a valid JSON object in this exact format (no markdown, no code blocks, just the JSON):
{
  "recommendation": "BUY|SELL|HOLD",
  "confidence": 0.0-1.0,
  "reasoning": "Your analysis here",
  "riskFactors": ["risk1", "risk2"]
}`;

      // 使用新的 @google/genai API
      // 使用 gemini-2.0-flash-001 (最新免费模型)
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',  // 使用 Gemini 2.0 最新模型
        contents: prompt
      });

      let text = response.text;

      // 清理响应文本（移除可能的 markdown 代码块标记）
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // 解析 JSON
      const analysis = JSON.parse(text);

      logger.info(`AI Analysis for ${symbol}:`, {
        recommendation: analysis.recommendation,
        confidence: analysis.confidence
      });

      return {
        ...analysis,
        enabled: true,
        model: "gemini-2.0-flash-exp",
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error in AI analysis:', error);
      
      // Fallback to technical signals
      return {
        recommendation: technicalSignals.action,
        confidence: technicalSignals.confidence,
        reasoning: `AI analysis failed: ${error.message}. Using technical signals only.`,
        riskFactors: ['AI analysis unavailable'],
        enabled: false,
        error: error.message
      };
    }
  }

  // Get trading recommendation (wrapper for analyzeMarket with consistent interface)
  async getTradeRecommendation(marketData, technicalSignals, strategy) {
    try {
      // Ensure proxy is configured (important for backtest environment)
      this.ensureProxyConfigured();
      
      if (!this.ai) {
        logger.warn('Gemini AI client not initialized. Skipping AI analysis.');
        return {
          action: technicalSignals.action,
          confidence: technicalSignals.confidence,
          reasoning: 'AI analysis disabled - using technical signals only',
          enabled: false
        };
      }

      // Prepare comprehensive market analysis prompt
      const marketContext = `
Symbol: ${marketData.symbol}
Current Price: $${marketData.currentPrice}
24h Price Change: ${marketData.priceChange24h?.toFixed(2) || 'N/A'}%
24h High: $${marketData.high24h || 'N/A'}
24h Low: $${marketData.low24h || 'N/A'}
24h Volume: ${marketData.volume24h || 'N/A'}

Technical Indicators Signal:
- Action: ${technicalSignals.action}
- Confidence: ${(technicalSignals.confidence * 100).toFixed(2)}%
- Buy Signals (${technicalSignals.buy.length}): ${technicalSignals.buy.map(s => s.indicator).join(', ')}
- Sell Signals (${technicalSignals.sell.length}): ${technicalSignals.sell.map(s => s.indicator).join(', ')}

Strategy Settings:
- Risk per trade: ${strategy.riskManagement.riskPercentage}%
- Stop Loss: ${strategy.riskManagement.stopLossPercentage}%
- Take Profit: ${strategy.riskManagement.takeProfitPercentage}%
`;

      const prompt = `You are an expert cryptocurrency trading AI. Analyze the following market data and technical signals to provide a trading recommendation.

${marketContext}

Consider:
1. Technical indicator signals and their reliability
2. Market momentum and price action
3. Risk/reward ratio
4. Current market conditions

Respond ONLY with a valid JSON object (no markdown, no code blocks, just the JSON):
{
  "action": "BUY|SELL|HOLD",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of your recommendation (max 200 chars)"
}`;

      // Call Gemini API with retry logic
      let response;
      let retries = 2;
      let lastError;
      
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          response = await this.ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: prompt
          });
          break; // Success, exit retry loop
        } catch (err) {
          lastError = err;
          if (attempt < retries) {
            logger.warn(`AI API call failed (attempt ${attempt + 1}/${retries + 1}), retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      }
      
      if (!response) {
        throw lastError || new Error('Failed to get AI response after retries');
      }

      let text = response.text;

      // Clean response text
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Parse JSON
      const analysis = JSON.parse(text);

      logger.info(`AI Trade Recommendation for ${marketData.symbol}:`, {
        action: analysis.action,
        confidence: analysis.confidence
      });

      return {
        action: analysis.action,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        enabled: true,
        model: "gemini-2.0-flash-exp",
        timestamp: new Date()
      };
    } catch (error) {
      // Check for specific error types
      const errorMsg = error.message || '';
      const isFetchError = errorMsg.includes('fetch failed') || errorMsg.includes('ECONNREFUSED');
      const isTimeoutError = errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT');
      
      if (isFetchError || isTimeoutError) {
        logger.error(`AI API connection error (${isFetchError ? 'fetch failed' : 'timeout'}). Please check:`);
        logger.error('1. Network connection');
        logger.error('2. Proxy settings (HTTP_PROXY/HTTPS_PROXY)');
        logger.error('3. Gemini API accessibility');
      } else {
        logger.error('Error getting AI trade recommendation:', error);
      }
      
      // Fallback to technical signals
      return {
        action: technicalSignals.action,
        confidence: technicalSignals.confidence,
        reasoning: `AI analysis unavailable (${isFetchError ? 'network error' : isTimeoutError ? 'timeout' : 'error'}). Using technical signals.`,
        enabled: false,
        error: errorMsg
      };
    }
  }

  // Get sentiment analysis for a specific cryptocurrency
  async getSentimentAnalysis(symbol, newsData = []) {
    try {
      if (!this.ai) {
        return {
          sentiment: 'neutral',
          score: 0,
          reasoning: 'AI analysis disabled'
        };
      }

      const prompt = `You are a cryptocurrency market sentiment analyst. Analyze the overall market sentiment for ${symbol} cryptocurrency.
${newsData.length > 0 ? `\nRecent news:\n${newsData.join('\n')}` : ''}

Provide sentiment analysis. Respond ONLY with a valid JSON object (no markdown, no code blocks):
{
  "sentiment": "bullish|bearish|neutral",
  "score": -1.0 to 1.0,
  "reasoning": "Brief explanation"
}`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt
      });

      let text = response.text;
      
      // 清理响应文本
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      return JSON.parse(text);
    } catch (error) {
      logger.error('Error in sentiment analysis:', error);
      return {
        sentiment: 'neutral',
        score: 0,
        reasoning: `Error: ${error.message}`,
        error: error.message
      };
    }
  }

  // Analyze a completed trade and provide insights
  async analyzeTrade(trade, marketContext) {
    try {
      if (!this.ai) {
        return {
          analysis: 'AI analysis disabled',
          lessons: []
        };
      }

      const prompt = `You are a trading performance analyst. Analyze this completed trade and provide constructive feedback.

Trade Details:
- Symbol: ${trade.symbol}
- Side: ${trade.side}
- Entry Price: $${trade.price}
- Exit Price: $${trade.executedPrice}
- Profit/Loss: ${trade.profit > 0 ? '+' : ''}$${trade.profit} (${trade.profitPercentage.toFixed(2)}%)
- Strategy: ${trade.strategyName}

Market Context:
${JSON.stringify(marketContext, null, 2)}

Provide analysis. Respond ONLY with a valid JSON object (no markdown, no code blocks):
{
  "analysis": "Overall trade analysis",
  "lessons": ["lesson1", "lesson2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt
      });

      let text = response.text;
      
      // 清理响应文本
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      return JSON.parse(text);
    } catch (error) {
      logger.error('Error analyzing trade:', error);
      return {
        analysis: `Error: ${error.message}`,
        lessons: [],
        suggestions: []
      };
    }
  }
}

module.exports = new AIService();

