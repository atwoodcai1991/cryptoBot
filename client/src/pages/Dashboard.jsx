import { useState, useEffect } from 'react';
import { accountAPI, orderAPI, strategyAPI } from '../utils/api';
import { 
  ArrowUpIcon, 
  ArrowDownIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [orderStats, setOrderStats] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [accountsRes, statsRes, strategiesRes] = await Promise.all([
        accountAPI.getAll(),
        orderAPI.getStats(),
        strategyAPI.getAll(),
      ]);

      setAccounts(accountsRes.data.data || []);
      setOrderStats(statsRes.data.data);
      setStrategies(strategiesRes.data.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const simulatedAccount = accounts.find(a => a.accountType === 'SIMULATED');
  const realAccount = accounts.find(a => a.accountType === 'REAL');
  const activeStrategies = strategies.filter(s => s.isActive).length;

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Simulated Account Balance */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8b98a5]">模拟账户余额</p>
              <h3 className="text-2xl font-bold mt-1">
                ${simulatedAccount?.balance.toFixed(2) || '0.00'}
              </h3>
              <p className={`text-sm mt-2 flex items-center ${
                simulatedAccount?.profitPercentage >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {simulatedAccount?.profitPercentage >= 0 ? (
                  <ArrowUpIcon className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 mr-1" />
                )}
                {Math.abs(simulatedAccount?.profitPercentage || 0).toFixed(2)}%
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <CurrencyDollarIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Total Trades */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8b98a5]">总交易次数</p>
              <h3 className="text-2xl font-bold mt-1">
                {orderStats?.totalOrders || 0}
              </h3>
              <p className="text-sm text-[#8b98a5] mt-2">
                成功: {orderStats?.filledOrders || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <ChartBarIcon className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8b98a5]">胜率</p>
              <h3 className="text-2xl font-bold mt-1">
                {orderStats?.winRate.toFixed(2) || 0}%
              </h3>
              <p className="text-sm mt-2">
                <span className="text-green-500">{orderStats?.winningOrders || 0}</span>
                {' / '}
                <span className="text-red-500">{orderStats?.losingOrders || 0}</span>
              </p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Active Strategies */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8b98a5]">活跃策略</p>
              <h3 className="text-2xl font-bold mt-1">
                {activeStrategies} / {strategies.length}
              </h3>
              <p className="text-sm text-[#8b98a5] mt-2">
                运行中
              </p>
            </div>
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <ChartBarIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simulated Account */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">模拟账户详情</h3>
          {simulatedAccount ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[#8b98a5]">初始余额</span>
                <span className="font-medium">${simulatedAccount.initialBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b98a5]">当前余额</span>
                <span className="font-medium">${simulatedAccount.balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b98a5]">净利润</span>
                <span className={`font-medium ${
                  simulatedAccount.netProfit >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  ${simulatedAccount.netProfit.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b98a5]">交易次数</span>
                <span className="font-medium">{simulatedAccount.totalTrades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b98a5]">胜率</span>
                <span className="font-medium">{simulatedAccount.winRate.toFixed(2)}%</span>
              </div>
            </div>
          ) : (
            <p className="text-[#8b98a5]">暂无数据</p>
          )}
        </div>

        {/* Active Strategies List */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">活跃策略</h3>
          <div className="space-y-3">
            {strategies.filter(s => s.isActive).length > 0 ? (
              strategies.filter(s => s.isActive).map((strategy) => (
                <div key={strategy._id} className="flex items-center justify-between p-3 bg-[#1a1f26] rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{strategy.name}</p>
                    <p className="text-sm text-[#8b98a5]">{strategy.symbol} - {strategy.interval}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      <span className={strategy.performance.winRate >= 50 ? 'text-green-500' : 'text-red-500'}>
                        {strategy.performance.winRate.toFixed(2)}%
                      </span>
                    </p>
                    <p className="text-xs text-[#8b98a5]">
                      {strategy.performance.totalTrades} 次交易
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[#8b98a5] text-center py-4">没有活跃的策略</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Performance */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">最近表现</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-[#1a1f26] rounded-lg">
            <p className="text-sm text-[#8b98a5]">总盈利</p>
            <p className="text-xl font-bold text-green-500 mt-1">
              ${simulatedAccount?.totalProfit.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="p-4 bg-[#1a1f26] rounded-lg">
            <p className="text-sm text-[#8b98a5]">总亏损</p>
            <p className="text-xl font-bold text-red-500 mt-1">
              ${simulatedAccount?.totalLoss.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="p-4 bg-[#1a1f26] rounded-lg">
            <p className="text-sm text-[#8b98a5]">盈利交易</p>
            <p className="text-xl font-bold text-green-500 mt-1">
              {simulatedAccount?.winningTrades || 0}
            </p>
          </div>
          <div className="p-4 bg-[#1a1f26] rounded-lg">
            <p className="text-sm text-[#8b98a5]">亏损交易</p>
            <p className="text-xl font-bold text-red-500 mt-1">
              {simulatedAccount?.losingTrades || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

