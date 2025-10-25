import { useState, useEffect } from 'react';
import { strategyAPI, backtestAPI } from '../utils/api';
import { PlayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Backtest() {
  const [strategies, setStrategies] = useState([]);
  const [backtests, setBacktests] = useState([]);
  const [selectedBacktest, setSelectedBacktest] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    strategyId: '',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    initialBalance: 10000
  });

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

    try {
      const response = await backtestAPI.run(formData);
      alert('回测完成！');
      fetchBacktests();
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
      setSelectedBacktest(response.data.data);
    } catch (error) {
      console.error('Error fetching backtest:', error);
    }
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
      <div>
        <h2 className="text-2xl font-bold">策略回测</h2>
        <p className="text-[#8b98a5] mt-1">使用历史数据测试交易策略</p>
      </div>

      {/* Backtest Form */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">运行新回测</h3>
        <form onSubmit={handleRunBacktest} className="space-y-4">
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

      {/* Backtest Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Backtest List */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">回测历史</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {backtests.length > 0 ? (
              backtests.map((backtest) => (
                <div
                  key={backtest._id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedBacktest?._id === backtest._id
                      ? 'bg-[#1d9bf0] text-white'
                      : 'bg-[#1a1f26] hover:bg-[#2f3336]'
                  }`}
                  onClick={() => handleViewBacktest(backtest._id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{backtest.name}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBacktest(backtest._id);
                      }}
                      className="p-1 hover:bg-red-500/20 rounded"
                    >
                      <TrashIcon className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                  <p className="text-xs opacity-75">{backtest.symbol} - {backtest.interval}</p>
                  <p className={`text-sm font-medium mt-1 ${
                    backtest.netProfit >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {backtest.profitPercentage >= 0 ? '+' : ''}{backtest.profitPercentage.toFixed(2)}%
                  </p>
                </div>
              ))
            ) : (
              <p className="text-[#8b98a5] text-center py-8 text-sm">暂无回测记录</p>
            )}
          </div>
        </div>

        {/* Backtest Details */}
        <div className="lg:col-span-2">
          {selectedBacktest ? (
            <div className="space-y-4">
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

              {/* Equity Curve */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">资金曲线</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={selectedBacktest.equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#8b98a5"
                      tick={{ fill: '#8b98a5' }}
                      tickFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <YAxis 
                      stroke="#8b98a5"
                      tick={{ fill: '#8b98a5' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#16181c', 
                        border: '1px solid #2f3336',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: '#8b98a5' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#1d9bf0" 
                      name="余额"
                      strokeWidth={2}
                    />
                  </LineChart>
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
          ) : (
            <div className="card h-full flex items-center justify-center">
              <div className="text-center text-[#8b98a5]">
                <p>从左侧选择一个回测结果查看详情</p>
                <p className="text-sm mt-2">或创建一个新的回测</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

