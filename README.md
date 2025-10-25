# CryptoBot - AI加密货币自动交易机器人

一个功能完整的加密货币自动交易机器人，集成了技术指标分析、ChatGPT AI智能分析、实盘交易、模拟盘回测等功能。

## 🚀 主要功能

### 1. 智能交易策略
- **多种技术指标支持**
  - RSI（相对强弱指数）
  - MACD（异同移动平均线）
  - MA（移动平均线）
  - 布林带（Bollinger Bands）
  - 成交量分析

- **AI智能分析**
  - 集成ChatGPT进行市场分析
  - 提供买卖建议和信心度评估
  - 风险因素分析

### 2. 交易模式
- **实盘交易**：连接币安交易所进行真实交易
- **模拟交易**：无风险测试策略效果
- **自动回测**：使用历史数据验证策略表现

### 3. 风险管理
- 可配置的止损/止盈策略
- 仓位管理
- 风险比例控制
- 最大仓位限制

### 4. 现代化Web界面
- 实时数据展示
- 直观的策略管理
- 详细的订单记录
- 回测结果可视化
- 响应式设计

## 📋 技术栈

### 后端
- **Node.js** - 运行环境
- **Express** - Web框架
- **MongoDB** - 数据库
- **Mongoose** - ODM
- **Binance API** - 交易所接口
- **OpenAI** - AI分析
- **Technical Indicators** - 技术指标计算
- **Winston** - 日志系统

### 前端
- **React** - UI框架
- **Vite** - 构建工具
- **React Router** - 路由管理
- **Recharts** - 数据可视化
- **Axios** - HTTP客户端
- **Heroicons** - 图标库

## 🛠️ 安装和配置

### 前置要求
- Node.js 16+ 
- MongoDB 4.4+
- 币安账户（用于实盘交易）
- OpenAI API密钥（用于AI分析）

### 1. 克隆项目
```bash
git clone <your-repo-url>
cd cryptoBot
```

### 2. 安装依赖

安装后端依赖：
```bash
npm install
```

安装前端依赖：
```bash
cd client
npm install
cd ..
```

或者一键安装所有依赖：
```bash
npm run install-all
```

### 3. 配置环境变量

在项目根目录创建`.env`文件：

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/cryptobot

# Binance API Configuration
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_API_SECRET=your_binance_secret_key_here
BINANCE_TESTNET=true

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Trading Configuration
DEFAULT_TRADE_AMOUNT=100
MAX_POSITION_SIZE=1000
RISK_PERCENTAGE=2
STOP_LOSS_PERCENTAGE=2
TAKE_PROFIT_PERCENTAGE=5

# Strategy Configuration
STRATEGY_INTERVAL=5m
RSI_PERIOD=14
RSI_OVERBOUGHT=70
RSI_OVERSOLD=30
MA_SHORT_PERIOD=9
MA_LONG_PERIOD=21
```

在`client`目录创建`.env`文件：
```env
VITE_API_URL=http://localhost:5000/api
```

### 4. 启动MongoDB

确保MongoDB正在运行：
```bash
# macOS (使用Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

## 🚀 运行项目

### 开发模式

启动后端服务器：
```bash
npm run dev
```

启动前端开发服务器（新终端）：
```bash
cd client
npm run dev
```

### 生产模式

构建前端：
```bash
npm run build
```

启动后端：
```bash
npm start
```

## 📖 使用指南

### 1. 创建交易策略

1. 进入"策略管理"页面
2. 点击"创建策略"按钮
3. 配置策略参数：
   - 基本信息（名称、描述、交易对）
   - 技术指标参数
   - 风险管理设置
   - AI分析开关
4. 保存策略

### 2. 运行回测

1. 进入"回测"页面
2. 选择要测试的策略
3. 设置回测时间范围和初始资金
4. 点击"开始回测"
5. 查看回测结果和资金曲线

### 3. 执行交易

#### 模拟交易（推荐先使用）
1. 进入"实时交易"页面
2. 选择策略
3. 选择"模拟交易"模式
4. 点击"获取AI分析"查看市场建议
5. 点击"执行模拟交易"

#### 实盘交易（谨慎使用）
1. 确保已正确配置币安API密钥
2. 选择"实盘交易"模式
3. 仔细检查AI分析结果
4. 确认后执行交易

### 4. 监控订单

1. 进入"订单记录"页面
2. 查看所有历史订单
3. 使用筛选器按账户类型、状态等过滤
4. 查看详细的盈亏统计

## 📊 API接口文档

### 策略管理
- `GET /api/strategy` - 获取所有策略
- `POST /api/strategy` - 创建策略
- `PUT /api/strategy/:id` - 更新策略
- `DELETE /api/strategy/:id` - 删除策略
- `PATCH /api/strategy/:id/toggle` - 切换策略状态

### 交易操作
- `POST /api/trading/execute` - 执行交易
- `POST /api/trading/close` - 关闭仓位
- `POST /api/trading/monitor` - 监控仓位

### 回测
- `POST /api/backtest/run` - 运行回测
- `GET /api/backtest` - 获取所有回测
- `GET /api/backtest/:id` - 获取回测详情
- `DELETE /api/backtest/:id` - 删除回测

### AI分析
- `POST /api/ai-analysis/analyze` - 获取AI市场分析
- `POST /api/ai-analysis/sentiment` - 获取情绪分析

### 订单管理
- `GET /api/orders` - 获取订单列表
- `GET /api/orders/:id` - 获取订单详情
- `GET /api/orders/stats/summary` - 获取订单统计

### 账户管理
- `GET /api/account` - 获取账户信息
- `POST /api/account` - 创建/重置账户
- `GET /api/account/binance/balance` - 获取币安余额

## 🔧 项目结构

```
cryptoBot/
├── server/                  # 后端代码
│   ├── config/             # 配置文件
│   ├── models/             # 数据模型
│   │   ├── Account.js      # 账户模型
│   │   ├── Order.js        # 订单模型
│   │   ├── Strategy.js     # 策略模型
│   │   └── Backtest.js     # 回测模型
│   ├── routes/             # API路由
│   │   ├── trading.js      # 交易路由
│   │   ├── strategy.js     # 策略路由
│   │   ├── backtest.js     # 回测路由
│   │   ├── aiAnalysis.js   # AI分析路由
│   │   ├── orders.js       # 订单路由
│   │   └── account.js      # 账户路由
│   ├── services/           # 业务逻辑
│   │   ├── binanceService.js    # 币安API服务
│   │   ├── strategyService.js   # 策略分析服务
│   │   ├── aiService.js         # AI分析服务
│   │   ├── tradingService.js    # 交易执行服务
│   │   └── backtestService.js   # 回测服务
│   ├── utils/              # 工具函数
│   │   └── logger.js       # 日志工具
│   └── index.js            # 服务器入口
│
├── client/                 # 前端代码
│   ├── src/
│   │   ├── components/     # React组件
│   │   │   └── Layout.jsx  # 布局组件
│   │   ├── pages/          # 页面组件
│   │   │   ├── Dashboard.jsx   # 仪表盘
│   │   │   ├── Strategies.jsx  # 策略管理
│   │   │   ├── Trading.jsx     # 实时交易
│   │   │   ├── Backtest.jsx    # 回测
│   │   │   ├── Orders.jsx      # 订单记录
│   │   │   └── Settings.jsx    # 设置
│   │   ├── utils/          # 工具函数
│   │   │   └── api.js      # API客户端
│   │   ├── App.jsx         # 主应用组件
│   │   ├── App.css         # 全局样式
│   │   └── main.jsx        # 入口文件
│   ├── index.html          # HTML模板
│   └── package.json        # 前端依赖
│
├── logs/                   # 日志文件（自动生成）
├── .gitignore             # Git忽略配置
├── package.json           # 后端依赖
└── README.md              # 项目文档
```

## ⚠️ 风险提示

1. **加密货币交易具有高风险**，可能导致资金损失
2. **强烈建议先使用模拟账户**测试策略
3. 不要投资超过你能承受损失的资金
4. 过去的表现不代表未来的结果
5. 始终设置止损以控制风险
6. 定期检查和调整策略参数
7. 妥善保管API密钥，不要泄露给他人

## 🔒 安全建议

1. **API密钥安全**
   - 不要将API密钥提交到版本控制
   - 使用环境变量存储敏感信息
   - 定期更换API密钥
   - 为币安API设置IP白名单

2. **数据库安全**
   - 设置MongoDB认证
   - 使用强密码
   - 限制数据库访问

3. **服务器安全**
   - 使用HTTPS
   - 配置防火墙
   - 定期更新依赖包
   - 监控异常活动

## 🐛 故障排除

### 问题：无法连接MongoDB
解决方案：
- 确认MongoDB正在运行
- 检查MONGODB_URI配置
- 查看MongoDB日志

### 问题：币安API错误
解决方案：
- 验证API密钥是否正确
- 检查API权限设置
- 确认网络连接
- 查看币安API状态

### 问题：AI分析失败
解决方案：
- 验证OpenAI API密钥
- 检查API额度
- 查看日志错误信息

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📝 开发计划

- [ ] 添加更多技术指标
- [ ] 支持更多交易所
- [ ] 实现止盈止损自动管理
- [ ] 添加Telegram通知
- [ ] 策略性能分析报告
- [ ] 多时间框架分析
- [ ] 组合策略支持

## 📄 许可证

ISC License

## 👨‍💻 作者

CryptoBot Team

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues
- Email: [your-email@example.com]

---

**免责声明**：本软件仅用于教育和研究目的。使用本软件进行交易的任何损失，开发者概不负责。请自行承担交易风险。

