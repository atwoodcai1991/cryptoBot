# CryptoBot 系统架构文档

## 系统概览

CryptoBot是一个模块化的加密货币自动交易系统，采用前后端分离架构，集成了技术指标分析、AI智能分析、实盘交易和回测等功能。

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (React)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Dashboard│  │Strategies│  │ Trading  │  │ Backtest │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐                                │
│  │  Orders  │  │ Settings │                                │
│  └──────────┘  └──────────┘                                │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST API
┌─────────────────────────┴───────────────────────────────────┐
│                    API网关层 (Express)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Trading  │  │ Strategy │  │ Backtest │  │    AI    │   │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                      业务逻辑层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Trading    │  │   Strategy   │  │      AI      │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │   Binance    │  │   Backtest   │                        │
│  │   Service    │  │   Service    │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                      数据访问层                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Order   │  │ Strategy │  │ Account  │  │ Backtest │   │
│  │  Model   │  │  Model   │  │  Model   │  │  Model   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                      数据库层                                │
│                      MongoDB                                 │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                      外部服务                                │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │    Binance   │  │    OpenAI    │                         │
│  │      API     │  │      API     │                         │
│  └──────────────┘  └──────────────┘                         │
└──────────────────────────────────────────────────────────────┘
```

## 核心模块详解

### 1. 前端模块 (Client)

#### 页面组件
- **Dashboard**: 显示账户概览、策略表现、交易统计
- **Strategies**: 策略的CRUD操作，配置技术指标和风险管理参数
- **Trading**: 实时交易执行，AI分析展示
- **Backtest**: 历史数据回测，结果可视化
- **Orders**: 订单历史查询和统计
- **Settings**: 系统配置和账户管理

#### 核心功能
- 实时数据更新
- 响应式设计
- 数据可视化（Recharts）
- 路由管理（React Router）

### 2. 后端模块 (Server)

#### API路由层
负责HTTP请求处理和响应，包括：
- 参数验证
- 错误处理
- 日志记录

#### 服务层

##### TradingService（交易服务）
```javascript
主要功能：
- executeTrade(): 执行交易策略
- closePosition(): 关闭持仓
- monitorPositions(): 监控仓位，自动止损/止盈
- executeRealTrade(): 执行实盘交易
- executeSimulatedTrade(): 执行模拟交易
```

##### StrategyService（策略服务）
```javascript
主要功能：
- analyzeStrategy(): 综合技术指标分析
- calculateRSI(): 计算RSI指标
- calculateMACD(): 计算MACD指标
- calculateBollingerBands(): 计算布林带
- calculateRiskLevels(): 计算止损止盈位
- calculatePositionSize(): 计算仓位大小
```

##### BinanceService（币安服务）
```javascript
主要功能：
- getAccountInfo(): 获取账户信息
- getBalance(): 获取余额
- getCurrentPrice(): 获取当前价格
- getKlines(): 获取K线数据
- placeMarketOrder(): 下市价单
- placeLimitOrder(): 下限价单
- placeStopLossOrder(): 下止损单
- subscribeToPriceUpdates(): WebSocket订阅
```

##### AIService（AI服务）
```javascript
主要功能：
- analyzeMarket(): 综合市场分析
- getSentimentAnalysis(): 情绪分析
- analyzeTrade(): 交易复盘分析
```

##### BacktestService（回测服务）
```javascript
主要功能：
- runBacktest(): 运行策略回测
- getHistoricalData(): 获取历史数据
- calculatePerformanceMetrics(): 计算表现指标
```

### 3. 数据模型

#### Order（订单模型）
```javascript
{
  orderId: String,           // 订单ID
  symbol: String,            // 交易对
  side: String,              // 买/卖
  type: String,              // 订单类型
  quantity: Number,          // 数量
  price: Number,             // 价格
  executedPrice: Number,     // 成交价
  status: String,            // 状态
  isSimulated: Boolean,      // 是否模拟
  profit: Number,            // 盈亏
  profitPercentage: Number,  // 盈亏比例
  stopLoss: Number,          // 止损价
  takeProfit: Number,        // 止盈价
  aiAnalysis: Object,        // AI分析结果
  strategyName: String       // 策略名称
}
```

#### Strategy（策略模型）
```javascript
{
  name: String,              // 策略名称
  symbol: String,            // 交易对
  interval: String,          // 时间周期
  isActive: Boolean,         // 是否激活
  indicators: {              // 技术指标配置
    rsi: Object,
    macd: Object,
    ma: Object,
    bollingerBands: Object,
    volume: Object
  },
  riskManagement: {          // 风险管理配置
    maxPositionSize: Number,
    stopLossPercentage: Number,
    takeProfitPercentage: Number,
    riskPercentage: Number
  },
  useAI: Boolean,            // 是否使用AI
  aiConfidenceThreshold: Number,
  performance: {             // 表现统计
    totalTrades: Number,
    winningTrades: Number,
    losingTrades: Number,
    totalProfit: Number,
    winRate: Number
  }
}
```

#### Account（账户模型）
```javascript
{
  accountType: String,       // REAL/SIMULATED
  balance: Number,           // 当前余额
  initialBalance: Number,    // 初始余额
  totalProfit: Number,       // 总盈利
  totalLoss: Number,         // 总亏损
  netProfit: Number,         // 净利润
  profitPercentage: Number,  // 收益率
  totalTrades: Number,       // 交易次数
  winRate: Number           // 胜率
}
```

#### Backtest（回测模型）
```javascript
{
  strategyId: ObjectId,      // 策略ID
  symbol: String,            // 交易对
  startDate: Date,           // 开始日期
  endDate: Date,             // 结束日期
  initialBalance: Number,    // 初始资金
  finalBalance: Number,      // 最终资金
  netProfit: Number,         // 净利润
  profitPercentage: Number,  // 收益率
  totalTrades: Number,       // 交易次数
  winRate: Number,           // 胜率
  maxDrawdown: Number,       // 最大回撤
  sharpeRatio: Number,       // 夏普比率
  trades: Array,             // 交易记录
  equityCurve: Array        // 资金曲线
}
```

## 数据流

### 交易执行流程

```
用户触发交易
    ↓
1. 选择策略和交易模式
    ↓
2. TradingService.executeTrade()
    ↓
3. 获取K线数据 (BinanceService)
    ↓
4. 技术指标分析 (StrategyService)
    ↓
5. AI市场分析 (AIService) [可选]
    ↓
6. 综合决策（买/卖/持有）
    ↓
7. 检查AI置信度
    ↓
8. 计算仓位大小和风险水平
    ↓
9. 执行交易
    ├─ 实盘：BinanceService.placeMarketOrder()
    └─ 模拟：模拟交易记录
    ↓
10. 保存订单记录 (Order Model)
    ↓
11. 更新账户信息 (Account Model)
    ↓
12. 更新策略统计 (Strategy Model)
    ↓
13. 返回交易结果
```

### 回测流程

```
用户发起回测
    ↓
1. 选择策略和时间范围
    ↓
2. BacktestService.runBacktest()
    ↓
3. 获取历史K线数据
    ↓
4. 初始化回测环境
    ↓
5. 遍历历史数据
    ├─ 检查止损/止盈
    ├─ 技术指标分析
    ├─ 生成交易信号
    ├─ 模拟下单
    └─ 记录交易
    ↓
6. 计算性能指标
    ├─ 净利润/收益率
    ├─ 胜率
    ├─ 最大回撤
    └─ 夏普比率
    ↓
7. 生成资金曲线
    ↓
8. 保存回测结果
    ↓
9. 返回结果和可视化数据
```

### 策略分析流程

```
获取K线数据
    ↓
并行计算技术指标
    ├─ RSI指标 → 超买/超卖信号
    ├─ MACD指标 → 金叉/死叉信号
    ├─ 移动平均线 → 趋势信号
    ├─ 布林带 → 波动率信号
    └─ 成交量 → 量价信号
    ↓
汇总技术信号
    ├─ 计算买入信号数量
    ├─ 计算卖出信号数量
    └─ 计算综合置信度
    ↓
如果启用AI分析
    ├─ 发送数据到OpenAI
    ├─ 获取AI建议
    ├─ 获取AI置信度
    └─ 获取风险因素
    ↓
生成最终决策
    ├─ 操作：BUY/SELL/HOLD
    ├─ 置信度：0-1
    └─ 理由和风险
```

## 定时任务

### Scheduler（调度器）

```javascript
1. 仓位监控任务（每分钟）
   - 检查所有开仓订单
   - 判断是否触及止损/止盈
   - 自动平仓

2. 策略执行任务（根据策略时间周期）
   - 1分钟策略：每分钟执行
   - 5分钟策略：每5分钟执行
   - 1小时策略：每小时执行
   - 等等...

3. 任务管理
   - 动态添加/删除任务
   - 策略激活/停用时更新调度
   - 优雅关闭
```

## 安全机制

### 1. API密钥安全
- 环境变量存储
- 不提交到版本控制
- 服务端加密传输

### 2. 风险控制
- 最大仓位限制
- 止损保护
- 仓位大小计算
- AI置信度阈值

### 3. 错误处理
- 统一错误中间件
- 详细日志记录
- 优雅降级
- 用户友好提示

### 4. 数据验证
- 输入参数验证
- 数据类型检查
- 范围限制
- SQL注入防护

## 性能优化

### 1. 前端优化
- 代码分割
- 懒加载
- 虚拟滚动
- 缓存策略

### 2. 后端优化
- 数据库索引
- 连接池
- 缓存热点数据
- 异步处理

### 3. 通信优化
- WebSocket实时更新
- 请求压缩
- 响应缓存
- 批量操作

## 扩展性设计

### 1. 模块化架构
每个服务独立，便于：
- 单独测试
- 独立部署
- 功能扩展

### 2. 插件化策略
- 策略配置化
- 指标可插拔
- 易于添加新指标

### 3. 多交易所支持
通过抽象交易所接口，可轻松添加：
- Coinbase
- Kraken
- Huobi
- 等等

### 4. 微服务化潜力
当前为单体架构，可拆分为：
- 交易服务
- 分析服务
- 回测服务
- AI服务

## 监控和日志

### 日志系统
- 多级别日志（error/warn/info/debug）
- 分文件存储
- 自动轮转
- 结构化日志

### 监控指标
- API响应时间
- 交易成功率
- 系统资源使用
- 错误率统计

## 部署架构

### 开发环境
```
localhost:5173 → React Dev Server
localhost:5000 → Express Server
localhost:27017 → MongoDB
```

### 生产环境
```
Nginx → Static Files (React Build)
  ↓
Nginx → Reverse Proxy → PM2 → Node.js
  ↓
MongoDB (可选：副本集)
```

## 未来改进

1. **功能增强**
   - 更多技术指标
   - 机器学习预测
   - 社交交易
   - 手机App

2. **性能提升**
   - Redis缓存
   - 消息队列
   - 负载均衡
   - CDN加速

3. **安全强化**
   - 双因素认证
   - 操作审计
   - 加密存储
   - 安全扫描

4. **用户体验**
   - 实时通知
   - 自定义仪表盘
   - 策略市场
   - 社区功能

---

此文档描述了CryptoBot的整体架构设计。如有疑问或改进建议，欢迎提出。

