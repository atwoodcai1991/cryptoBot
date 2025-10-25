# 快速开始指南

本指南将帮助你在5分钟内启动CryptoBot交易机器人。

## 前置要求

- Node.js 16+
- MongoDB
- 币安账号（可选，用于实盘交易）
- OpenAI账号（可选，用于AI分析）

## 快速启动

### 1. 安装依赖
```bash
npm install
cd client && npm install && cd ..
```

### 2. 配置环境变量

创建`.env`文件（根目录）：
```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cryptobot
BINANCE_TESTNET=true
```

创建`client/.env`文件：
```bash
VITE_API_URL=http://localhost:5000/api
```

### 3. 启动MongoDB
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

### 4. 启动服务

终端1 - 后端：
```bash
npm run dev
```

终端2 - 前端：
```bash
cd client && npm run dev
```

### 5. 访问应用

打开浏览器：http://localhost:5173

## 第一次使用

### 1. 创建模拟账户
- 进入"设置"页面
- 点击"创建模拟账户"

### 2. 创建策略
- 进入"策略管理"页面
- 点击"创建策略"
- 配置参数：
  ```
  名称: BTC测试策略
  交易对: BTCUSDT
  时间周期: 5m
  启用AI: 否（如果没有OpenAI密钥）
  ```

### 3. 运行回测
- 进入"回测"页面
- 选择刚创建的策略
- 设置时间范围：过去30天
- 点击"开始回测"
- 等待完成，查看结果

### 4. 执行模拟交易
- 进入"实时交易"页面
- 选择策略
- 选择"模拟交易"
- 点击"执行模拟交易"

### 5. 查看订单
- 进入"订单记录"页面
- 查看交易历史和统计

## 常用命令

```bash
# 安装所有依赖
npm run install-all

# 启动后端开发服务器
npm run dev

# 启动前端开发服务器
cd client && npm run dev

# 构建生产版本
npm run build

# 查看日志
tail -f logs/combined.log
```

## 配置币安API（可选）

如果要使用实盘交易：

1. 访问 https://www.binance.com
2. 登录 → API管理
3. 创建新密钥
4. 在`.env`中配置：
   ```bash
   BINANCE_API_KEY=你的密钥
   BINANCE_API_SECRET=你的密钥
   BINANCE_TESTNET=false  # 真实交易
   ```

⚠️ **警告**：真实交易有风险，请谨慎操作！

## 配置OpenAI API（可选）

如果要使用AI分析：

1. 访问 https://platform.openai.com
2. 创建API密钥
3. 在`.env`中配置：
   ```bash
   OPENAI_API_KEY=你的密钥
   ```
4. 在策略中启用"AI分析"

## 故障排除

### MongoDB连接失败
```bash
# 检查MongoDB状态
mongosh --eval "db.version()"

# 重启MongoDB
brew services restart mongodb-community  # macOS
```

### 端口被占用
```bash
# 查找占用端口的进程
lsof -i :5000
lsof -i :5173

# 杀死进程
kill -9 <PID>
```

### 依赖安装失败
```bash
# 清除缓存重试
npm cache clean --force
rm -rf node_modules
npm install
```

## 下一步

- 📖 阅读完整文档：[README.md](README.md)
- 🏗️ 了解架构：[ARCHITECTURE.md](ARCHITECTURE.md)
- ⚙️ 详细配置：[SETUP.md](SETUP.md)

## 获取帮助

- 查看日志：`logs/combined.log`
- 提交Issue：GitHub Issues
- 邮件联系：support@cryptobot.com

---

祝交易顺利！🚀

