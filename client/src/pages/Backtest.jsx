import { useState, useEffect } from 'react';
import { strategyAPI, backtestAPI } from '../utils/api';
import { PlayIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon } from '@heroicons/react/24/outline';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Scatter,
  ReferenceLine
} from 'recharts';

export default function Backtest() {
  const [strategies, setStrategies] = useState([]);
  const [backtests, setBacktests] = useState([]);
  const [selectedBacktest, setSelectedBacktest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);  // 表单默认收起

  const [formData, setFormData] = useState({
    strategyId: '',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 默认3个月
    endDate: new Date().toISOString().split('T')[0],
    initialBalance: 10000
  });

  // 快捷时间范围设置
  const setTimeRange = (days) => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    setFormData({
      ...formData,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  };

  useEffect(() => {
    fetchStrategies();
    fetchBacktests();
  }, []);

  const fetchStrategies = async () => {
    try {
      const response = await strategyAPI.getAll();
      setStrategies(response.data.data || []);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    }
  };

  const fetchBacktests = async () => {
    try {
      const response = await backtestAPI.getAll();
      setBacktests(response.data.data || []);
    } catch (error) {
      console.error('Error fetching backtests:', error);
    }
  };

  const handleRunBacktest = async (e) => {
    e.preventDefault();
    
    if (!formData.strategyId) {
      alert('请选择策略');
      return;
    }

    setLoading(true);
    setShowForm(false);  // 开始回测后收起表单

    try {
      const response = await backtestAPI.run(formData);
      alert('回测完成！');
      await fetchBacktests();
      setSelectedBacktest(response.data.data);
    } catch (error) {
      console.error('Error running backtest:', error);
      alert('回测失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBacktest = async (id) => {
    try {
      const response = await backtestAPI.getOne(id);
      const backtest = response.data.data;
      setSelectedBacktest(backtest);
    } catch (error) {
      console.error('Error fetching backtest:', error);
    }
  };

  // Prepare data for charts
  const prepareChartData = (backtest) => {
    if (!backtest || !backtest.equityCurve) return null;
    
    // Create a map of trades by timestamp for quick lookup
    const tradeMap = {};
    if (backtest.trades) {
      backtest.trades.forEach(trade => {
        const tradeDate = new Date(trade.date).getTime();
        if (!tradeMap[tradeDate]) {
          tradeMap[tradeDate] = [];
        }
        tradeMap[tradeDate].push(trade);
      });
    }

    // Sample data if there are too many points (keep max 500 points for performance)
    let equityCurve = backtest.equityCurve;
    let samplingRate = 1;
    
    if (equityCurve.length > 500) {
      samplingRate = Math.ceil(equityCurve.length / 500);
    }

    // Combine equity curve with trade markers
    const chartData = [];
    for (let i = 0; i < equityCurve.length; i += samplingRate) {
      const point = equityCurve[i];
      
      const timestamp = new Date(point.date).getTime();
      const trades = tradeMap[timestamp] || [];
      
      const buyTrades = trades.filter(t => t.side === 'BUY');
      const sellTrades = trades.filter(t => t.side === 'SELL');

      chartData.push({
        date: point.date,
        balance: point.balance,
        price: point.price || null,
        buySignal: buyTrades.length > 0 ? point.balance : null,
        sellSignal: sellTrades.length > 0 ? point.balance : null,
        buyPrice: buyTrades.length > 0 ? buyTrades[0].price : null,
        sellPrice: sellTrades.length > 0 ? sellTrades[0].price : null,
      });
    }

    // Always include the last point
    if (equityCurve.length > 0 && (equityCurve.length - 1) % samplingRate !== 0) {
      const lastPoint = equityCurve[equityCurve.length - 1];
      const timestamp = new Date(lastPoint.date).getTime();
      const trades = tradeMap[timestamp] || [];
      
      const buyTrades = trades.filter(t => t.side === 'BUY');
      const sellTrades = trades.filter(t => t.side === 'SELL');

      chartData.push({
        date: lastPoint.date,
        balance: lastPoint.balance,
        price: lastPoint.price,
        buySignal: buyTrades.length > 0 ? lastPoint.balance : null,
        sellSignal: sellTrades.length > 0 ? lastPoint.balance : null,
        buyPrice: buyTrades.length > 0 ? buyTrades[0].price : null,
        sellPrice: sellTrades.length > 0 ? sellTrades[0].price : null,
      });
    }

    // Also ensure all trade points are included
    if (backtest.trades) {
      backtest.trades.forEach(trade => {
        const tradeTime = new Date(trade.date).getTime();
        // Check if this trade point is already in chartData
        const existingPoint = chartData.find(p => new Date(p.date).getTime() === tradeTime);
        
        if (!existingPoint) {
          // Find the closest equity curve point
          const closestPoint = equityCurve.reduce((prev, curr) => {
            const prevDiff = Math.abs(new Date(prev.date).getTime() - tradeTime);
            const currDiff = Math.abs(new Date(curr.date).getTime() - tradeTime);
            return currDiff < prevDiff ? curr : prev;
          });

          if (closestPoint) {
            chartData.push({
              date: trade.date,
              balance: closestPoint.balance,
              price: trade.price,
              buySignal: trade.side === 'BUY' ? closestPoint.balance : null,
              sellSignal: trade.side === 'SELL' ? closestPoint.balance : null,
              buyPrice: trade.side === 'BUY' ? trade.price : null,
              sellPrice: trade.side === 'SELL' ? trade.price : null,
            });
          }
        }
      });

      // Sort by date
      chartData.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    return chartData;
  };

  const handleDeleteBacktest = async (id) => {
    if (!window.confirm('确定要删除这个回测结果吗？')) {
      return;
    }

    try {
      await backtestAPI.delete(id);
      fetchBacktests();
      if (selectedBacktest?._id === id) {
        setSelectedBacktest(null);
      }
    } catch (error) {
      console.error('Error deleting backtest:', error);
      alert('删除失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">策略回测</h2>
          <p className="text-[#8b98a5] mt-1">使用历史数据测试交易策略</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          {showForm ? '收起表单' : '运行新回测'}
          {showForm ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
        </button>
      </div>

      {/* Backtest Form - Collapsible */}
      {showForm && (
        <div className="card animate-slideDown">
          <h3 className="text-lg font-semibold mb-4">回测配置</h3>
        <form onSubmit={handleRunBacktest} className="space-y-4">
          {/* 快捷时间范围选项 */}
          <div>
            <label className="label mb-2">快捷时间范围</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTimeRange(7)}
                className="px-3 py-1.5 text-sm bg-[#2f3336] hover:bg-[#3f4446] text-[#e7e9ea] rounded-lg transition-colors"
              >
                最近 7 天
              </button>
              <button
                type="button"
                onClick={() => setTimeRange(30)}
                className="px-3 py-1.5 text-sm bg-[#2f3336] hover:bg-[#3f4446] text-[#e7e9ea] rounded-lg transition-colors"
              >
                最近 1 个月
              </button>
              <button
                type="button"
                onClick={() => setTimeRange(90)}
                className="px-3 py-1.5 text-sm bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white rounded-lg transition-colors"
              >
                最近 3 个月
              </button>
              <button
                type="button"
                onClick={() => setTimeRange(180)}
                className="px-3 py-1.5 text-sm bg-[#2f3336] hover:bg-[#3f4446] text-[#e7e9ea] rounded-lg transition-colors"
              >
                最近 6 个月
              </button>
              <button
                type="button"
                onClick={() => setTimeRange(365)}
                className="px-3 py-1.5 text-sm bg-[#2f3336] hover:bg-[#3f4446] text-[#e7e9ea] rounded-lg transition-colors"
              >
                最近 1 年
              </button>
              <button
                type="button"
                onClick={() => setTimeRange(730)}
                className="px-3 py-1.5 text-sm bg-[#2f3336] hover:bg-[#3f4446] text-[#e7e9ea] rounded-lg transition-colors"
              >
                最近 2 年
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">选择策略</label>
              <select
                className="select"
                value={formData.strategyId}
                onChange={(e) => setFormData({...formData, strategyId: e.target.value})}
                required
              >
                <option value="">-- 选择策略 --</option>
                {strategies.map((strategy) => (
                  <option key={strategy._id} value={strategy._id}>
                    {strategy.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">开始日期</label>
              <input
                type="date"
                className="input"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="label">结束日期</label>
              <input
                type="date"
                className="input"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="label">初始资金 ($)</label>
              <input
                type="number"
                className="input"
                value={formData.initialBalance}
                onChange={(e) => setFormData({...formData, initialBalance: parseFloat(e.target.value)})}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex items-center"
          >
            <PlayIcon className="h-5 w-5 mr-2" />
            {loading ? '回测中...' : '开始回测'}
          </button>
        </form>
      </div>
      )}

      {/* Backtest Results - 两列布局 */}
      <div className="grid grid-cols-1 gap-6">
        {/* Backtest List - 全宽显示 */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">回测历史</h3>
          <div className="overflow-x-auto">
            {backtests.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>交易对</th>
                    <th>时间周期</th>
                    <th>交易次数</th>
                    <th>胜率</th>
                    <th>收益率</th>
                    <th>最大回撤</th>
                    <th>回测日期</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {backtests.map((backtest) => (
                    <tr 
                      key={backtest._id}
                      className={`cursor-pointer transition-colors ${
                        selectedBacktest?._id === backtest._id
                          ? 'bg-[#1d9bf0]/20'
                          : 'hover:bg-[#2f3336]'
                      }`}
                      onClick={() => handleViewBacktest(backtest._id)}
                    >
                      <td className="font-medium">{backtest.name}</td>
                      <td>{backtest.symbol}</td>
                      <td>{backtest.interval}</td>
                      <td>{backtest.totalTrades}</td>
                      <td>{backtest.winRate.toFixed(1)}%</td>
                      <td className={backtest.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {backtest.profitPercentage >= 0 ? '+' : ''}{backtest.profitPercentage.toFixed(2)}%
                      </td>
                      <td className="text-red-500">{backtest.maxDrawdown.toFixed(2)}%</td>
                      <td className="text-sm text-[#8b98a5]">
                        {new Date(backtest.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBacktest(backtest._id);
                          }}
                          className="p-2 hover:bg-red-500/20 rounded transition-colors"
                          title="删除"
                        >
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <p className="text-[#8b98a5] text-lg mb-2">暂无回测记录</p>
                <p className="text-sm text-[#8b98a5]">点击右上角"运行新回测"按钮开始</p>
              </div>
            )}
          </div>
        </div>

        {/* Backtest Details - 只在选中时显示 */}
        {selectedBacktest && (
          <div className="space-y-4 animate-slideDown">
              {/* Summary Stats */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">回测结果摘要</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-[#8b98a5]">初始资金</p>
                    <p className="text-lg font-bold">${selectedBacktest.initialBalance.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#8b98a5]">最终资金</p>
                    <p className="text-lg font-bold">${selectedBacktest.finalBalance.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#8b98a5]">净利润</p>
                    <p className={`text-lg font-bold ${
                      selectedBacktest.netProfit >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      ${selectedBacktest.netProfit.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#8b98a5]">收益率</p>
                    <p className={`text-lg font-bold ${
                      selectedBacktest.profitPercentage >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {selectedBacktest.profitPercentage >= 0 ? '+' : ''}{selectedBacktest.profitPercentage.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#8b98a5]">总交易次数</p>
                    <p className="text-lg font-bold">{selectedBacktest.totalTrades}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#8b98a5]">胜率</p>
                    <p className="text-lg font-bold">{selectedBacktest.winRate.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#8b98a5]">最大回撤</p>
                    <p className="text-lg font-bold text-red-500">
                      {selectedBacktest.maxDrawdown.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#8b98a5]">夏普比率</p>
                    <p className="text-lg font-bold">{selectedBacktest.sharpeRatio.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Price Chart with Trade Signals */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">价格走势与交易信号</h3>
                  <div className="flex items-center gap-4 text-xs text-[#8b98a5]">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-[#10b981] rounded-full"></div>
                      <span>买入点</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-[#ef4444] rounded-full"></div>
                      <span>卖出点</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[#8b98a5] mb-3">
                  显示{selectedBacktest.symbol}的价格变化，以及策略触发买卖信号的时间点
                </p>
                {!selectedBacktest.equityCurve[0]?.price && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3">
                    <p className="text-sm text-yellow-500">
                      ⚠️ 此回测数据不包含价格信息，请重新运行回测以查看价格走势图
                    </p>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={prepareChartData(selectedBacktest)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#8b98a5"
                      tick={{ fill: '#8b98a5', fontSize: 11 }}
                      tickFormatter={(date) => {
                        const d = new Date(date);
                        return `${d.getMonth()+1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis 
                      yAxisId="price"
                      stroke="#8b98a5"
                      tick={{ fill: '#8b98a5' }}
                      label={{ value: '价格 ($)', angle: -90, position: 'insideLeft', fill: '#8b98a5' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#16181c', 
                        border: '1px solid #2f3336',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: '#8b98a5' }}
                      labelFormatter={(date) => new Date(date).toLocaleString()}
                      formatter={(value, name) => {
                        if (name === '价格') return [`$${value?.toFixed(2)}`, name];
                        if (name === '买入信号' || name === '卖出信号') return [`$${value?.toFixed(2)}`, name];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Line 
                      yAxisId="price"
                      type="monotone" 
                      dataKey="price" 
                      stroke="#f59e0b"
                      name="价格"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Scatter 
                      yAxisId="price"
                      dataKey="buyPrice" 
                      fill="#10b981"
                      name="买入信号"
                      shape={(props) => {
                        const { cx, cy } = props;
                        return (
                          <g>
                            <circle cx={cx} cy={cy} r={6} fill="#10b981" opacity={0.3} />
                            <polygon
                              points={`${cx},${cy-6} ${cx-5},${cy+4} ${cx+5},${cy+4}`}
                              fill="#10b981"
                              stroke="#fff"
                              strokeWidth={1}
                            />
                          </g>
                        );
                      }}
                    />
                    <Scatter 
                      yAxisId="price"
                      dataKey="sellPrice" 
                      fill="#ef4444"
                      name="卖出信号"
                      shape={(props) => {
                        const { cx, cy } = props;
                        return (
                          <g>
                            <circle cx={cx} cy={cy} r={6} fill="#ef4444" opacity={0.3} />
                            <polygon
                              points={`${cx},${cy+6} ${cx-5},${cy-4} ${cx+5},${cy-4}`}
                              fill="#ef4444"
                              stroke="#fff"
                              strokeWidth={1}
                            />
                          </g>
                        );
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Equity Curve */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">资金曲线</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-1 rounded ${
                      selectedBacktest.netProfit >= 0 
                        ? 'bg-green-500/20 text-green-500' 
                        : 'bg-red-500/20 text-red-500'
                    }`}>
                      {selectedBacktest.netProfit >= 0 ? '盈利' : '亏损'}: 
                      ${Math.abs(selectedBacktest.netProfit).toFixed(2)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#8b98a5] mb-3">
                  显示账户资金随时间的变化，包括持仓的未实现盈亏
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={prepareChartData(selectedBacktest)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#8b98a5"
                      tick={{ fill: '#8b98a5', fontSize: 11 }}
                      tickFormatter={(date) => {
                        const d = new Date(date);
                        return `${d.getMonth()+1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis 
                      stroke="#8b98a5"
                      tick={{ fill: '#8b98a5' }}
                      label={{ value: '账户余额 ($)', angle: -90, position: 'insideLeft', fill: '#8b98a5' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#16181c', 
                        border: '1px solid #2f3336',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: '#8b98a5' }}
                      labelFormatter={(date) => new Date(date).toLocaleString()}
                      formatter={(value, name) => {
                        if (value === null) return [null, null];
                        return [`$${value?.toFixed(2)}`, name];
                      }}
                    />
                    <Legend />
                    <ReferenceLine 
                      y={selectedBacktest.initialBalance} 
                      stroke="#8b98a5" 
                      strokeDasharray="3 3"
                      label={{ value: '初始资金', fill: '#8b98a5', fontSize: 11 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#1d9bf0" 
                      name="账户余额"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Scatter 
                      dataKey="buySignal" 
                      fill="#10b981"
                      name="买入"
                      shape={(props) => {
                        const { cx, cy } = props;
                        return (
                          <g>
                            <circle cx={cx} cy={cy} r={6} fill="#10b981" opacity={0.3} />
                            <polygon
                              points={`${cx},${cy-6} ${cx-5},${cy+4} ${cx+5},${cy+4}`}
                              fill="#10b981"
                              stroke="#fff"
                              strokeWidth={1}
                            />
                          </g>
                        );
                      }}
                    />
                    <Scatter 
                      dataKey="sellSignal" 
                      fill="#ef4444"
                      name="卖出"
                      shape={(props) => {
                        const { cx, cy } = props;
                        return (
                          <g>
                            <circle cx={cx} cy={cy} r={6} fill="#ef4444" opacity={0.3} />
                            <polygon
                              points={`${cx},${cy+6} ${cx-5},${cy-4} ${cx+5},${cy-4}`}
                              fill="#ef4444"
                              stroke="#fff"
                              strokeWidth={1}
                            />
                          </g>
                        );
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Trade History */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">交易记录</h3>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>时间</th>
                        <th>方向</th>
                        <th>价格</th>
                        <th>数量</th>
                        <th>盈亏</th>
                        <th>余额</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBacktest.trades && selectedBacktest.trades.length > 0 ? (
                        selectedBacktest.trades.slice(-20).reverse().map((trade, idx) => (
                          <tr key={idx}>
                            <td className="text-sm">
                              {new Date(trade.date).toLocaleString()}
                            </td>
                            <td>
                              <span className={`badge ${
                                trade.side === 'BUY' ? 'badge-success' : 'badge-danger'
                              }`}>
                                {trade.side === 'BUY' ? '买入' : '卖出'}
                              </span>
                            </td>
                            <td>${trade.price.toFixed(2)}</td>
                            <td>{trade.quantity.toFixed(4)}</td>
                            <td className={trade.profit >= 0 ? 'text-green-500' : 'text-red-500'}>
                              {trade.profit ? `$${trade.profit.toFixed(2)}` : '-'}
                            </td>
                            <td>${trade.balance.toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center text-[#8b98a5] py-4">
                            无交易记录
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
          </div>
        )}
      </div>
    </div>
  );
}

