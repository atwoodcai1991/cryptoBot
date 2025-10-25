# CryptoBot 快速安装指南

## 一、环境准备

### 1. 安装Node.js
访问 https://nodejs.org/ 下载并安装Node.js 16或更高版本

验证安装：
```bash
node --version
npm --version
```

### 2. 安装MongoDB

#### macOS
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Windows
1. 访问 https://www.mongodb.com/try/download/community
2. 下载并安装MongoDB Community Server
3. 启动MongoDB服务

#### Linux (Ubuntu)
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

验证MongoDB：
```bash
mongosh --eval "db.version()"
```

## 二、项目配置

### 1. 安装项目依赖

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd client
npm install
cd ..
```

如果遇到npm权限问题，可以尝试：
```bash
# 修复npm缓存权限 (macOS/Linux)
sudo chown -R $(whoami) ~/.npm

# 或者使用--force选项
npm install --force
```

### 2. 配置环境变量

在项目根目录创建`.env`文件：

```bash
cp .env.example .env
```

然后编辑`.env`文件，填入你的配置：

```env
# 基本配置
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/cryptobot

# 币安API配置（必须）
# 获取地址：https://www.binance.com/en/my/settings/api-management
BINANCE_API_KEY=你的币安API密钥
BINANCE_API_SECRET=你的币安密钥
BINANCE_TESTNET=true  # 建议先使用测试网

# OpenAI API配置（可选，用于AI分析）
# 获取地址：https://platform.openai.com/api-keys
OPENAI_API_KEY=你的OpenAI_API密钥

# 交易配置（可选）
DEFAULT_TRADE_AMOUNT=100
MAX_POSITION_SIZE=1000
RISK_PERCENTAGE=2
STOP_LOSS_PERCENTAGE=2
TAKE_PROFIT_PERCENTAGE=5
```

在`client`目录创建`.env`文件：

```bash
cd client
echo "VITE_API_URL=http://localhost:5000/api" > .env
cd ..
```

## 三、获取API密钥

### 1. 币安API密钥

1. 访问 https://www.binance.com
2. 登录账户，进入"API管理"
3. 创建新的API密钥
4. **重要**：启用"现货交易"权限
5. **安全**：建议设置IP白名单
6. 保存API密钥和密钥（只显示一次）

⚠️ **测试网络**：
- 建议先使用币安测试网：https://testnet.binance.vision/
- 测试网可以获得虚拟资金进行测试
- 在`.env`中设置`BINANCE_TESTNET=true`

### 2. OpenAI API密钥（可选）

1. 访问 https://platform.openai.com
2. 注册/登录账户
3. 进入"API Keys"页面
4. 创建新的API密钥
5. 保存密钥（只显示一次）

注意：OpenAI API是付费服务，需要充值才能使用

## 四、启动项目

### 开发模式（推荐）

#### 终端1 - 启动后端
```bash
npm run dev
```

应该看到：
```
Server running on port 5000 in development mode
MongoDB connected successfully
```

#### 终端2 - 启动前端
```bash
cd client
npm run dev
```

应该看到：
```
  VITE v4.4.5  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 访问应用

打开浏览器访问：http://localhost:5173

## 五、初始化数据

### 1. 创建模拟账户

1. 访问"设置"页面
2. 点击"创建模拟账户"
3. 默认会创建初始余额为$10,000的模拟账户

### 2. 创建第一个策略

1. 访问"策略管理"页面
2. 点击"创建策略"
3. 填写策略信息：
   - 名称：例如"BTC RSI策略"
   - 交易对：BTCUSDT
   - 时间周期：5m（5分钟）
   - 启用AI分析（如果已配置OpenAI）
4. 保存策略

### 3. 运行回测

1. 访问"回测"页面
2. 选择刚创建的策略
3. 设置回测时间范围（建议1-3个月）
4. 点击"开始回测"
5. 等待回测完成，查看结果

## 六、常见问题

### 问题1：MongoDB连接失败
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

解决方案：
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

### 问题2：npm install失败
```
npm error code EACCES
```

解决方案：
```bash
# macOS/Linux
sudo chown -R $(whoami) ~/.npm
npm cache clean --force
npm install
```

### 问题3：币安API错误
```
Error: API-key format invalid
```

解决方案：
- 检查`.env`文件中的API密钥是否正确
- 确认没有多余的空格或引号
- 验证API密钥是否已启用交易权限

### 问题4：前端无法连接后端
```
Network Error
```

解决方案：
- 确认后端服务正在运行（端口5000）
- 检查`client/.env`中的API_URL配置
- 查看浏览器控制台错误信息

### 问题5：OpenAI API错误
```
Error: 401 Unauthorized
```

解决方案：
- 验证OpenAI API密钥是否正确
- 检查OpenAI账户是否有足够余额
- 如果不使用AI功能，在策略中禁用"AI分析"

## 七、生产环境部署

### 1. 环境变量配置
```env
NODE_ENV=production
BINANCE_TESTNET=false  # 使用真实交易（谨慎！）
```

### 2. 构建前端
```bash
cd client
npm run build
cd ..
```

### 3. 使用PM2运行（推荐）
```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start server/index.js --name cryptobot

# 查看日志
pm2 logs cryptobot

# 设置开机自启
pm2 startup
pm2 save
```

### 4. 使用Nginx反向代理（可选）
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/cryptoBot/client/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 八、安全建议

1. **永远不要**把`.env`文件提交到Git
2. 使用强密码和API密钥
3. 为币安API设置IP白名单
4. 定期更换API密钥
5. 先用测试网和模拟账户测试
6. 设置合理的止损和仓位限制
7. 不要投入超过你能承受损失的资金

## 九、下一步

- 阅读完整文档：[README.md](README.md)
- 查看API文档
- 加入社区讨论
- 报告问题：GitHub Issues

## 十、获取帮助

如果遇到问题：

1. 查看日志文件：`logs/combined.log`
2. 检查浏览器控制台
3. 查看MongoDB日志
4. 访问币安API状态：https://www.binance.com/en/support
5. 提交Issue到GitHub

---

祝交易顺利！记住：加密货币交易有风险，投资需谨慎。

