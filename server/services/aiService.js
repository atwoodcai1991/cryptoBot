const OpenAI = require('openai');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.openai = null;
    this.initialize();
  }

  initialize() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        logger.warn('OpenAI API key not found. AI analysis will be disabled.');
        return;
      }

      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      logger.info('OpenAI client initialized successfully');
    } catch (error) {
      logger.error('Error initializing OpenAI client:', error);
    }
  }

  // Analyze market data and provide trading recommendation
  async analyzeMarket(klines, technicalSignals, symbol) {
    try {
      if (!this.openai) {
        logger.warn('OpenAI client not initialized. Skipping AI analysis.');
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

Respond in JSON format:
{
  "recommendation": "BUY|SELL|HOLD",
  "confidence": 0.0-1.0,
  "reasoning": "Your analysis here",
  "riskFactors": ["risk1", "risk2", ...]
}`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert cryptocurrency trading analyst. Provide concise, actionable trading recommendations based on technical analysis and market data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      const response = JSON.parse(completion.choices[0].message.content);

      logger.info(`AI Analysis for ${symbol}:`, {
        recommendation: response.recommendation,
        confidence: response.confidence
      });

      return {
        ...response,
        enabled: true,
        model: "gpt-4-turbo-preview",
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

  // Get sentiment analysis for a specific cryptocurrency
  async getSentimentAnalysis(symbol, newsData = []) {
    try {
      if (!this.openai) {
        return {
          sentiment: 'neutral',
          score: 0,
          reasoning: 'AI analysis disabled'
        };
      }

      const prompt = `Analyze the overall market sentiment for ${symbol} cryptocurrency.
${newsData.length > 0 ? `\nRecent news:\n${newsData.join('\n')}` : ''}

Provide sentiment analysis in JSON format:
{
  "sentiment": "bullish|bearish|neutral",
  "score": -1.0 to 1.0,
  "reasoning": "Brief explanation"
}`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a cryptocurrency market sentiment analyst."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 300,
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content);
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
      if (!this.openai) {
        return {
          analysis: 'AI analysis disabled',
          lessons: []
        };
      }

      const prompt = `Analyze this completed trade and provide insights:

Trade Details:
- Symbol: ${trade.symbol}
- Side: ${trade.side}
- Entry Price: $${trade.price}
- Exit Price: $${trade.executedPrice}
- Profit/Loss: ${trade.profit > 0 ? '+' : ''}$${trade.profit} (${trade.profitPercentage.toFixed(2)}%)
- Strategy: ${trade.strategyName}

Market Context:
${JSON.stringify(marketContext, null, 2)}

Provide analysis in JSON format:
{
  "analysis": "Overall trade analysis",
  "lessons": ["lesson1", "lesson2", ...],
  "suggestions": ["suggestion1", "suggestion2", ...]
}`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a trading performance analyst. Analyze trades and provide constructive feedback."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 400,
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content);
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

