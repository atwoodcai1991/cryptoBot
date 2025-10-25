import { useState, useEffect } from 'react';
import { orderAPI } from '../utils/api';
import { FunnelIcon } from '@heroicons/react/24/outline';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    isSimulated: '',
    status: '',
    symbol: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getAll(filters);
      setOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await orderAPI.getStats(filters.isSimulated);
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">订单记录</h2>
        <p className="text-[#8b98a5] mt-1">查看所有交易订单和统计信息</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="card">
            <p className="text-sm text-[#8b98a5]">总订单</p>
            <p className="text-2xl font-bold mt-1">{stats.totalOrders}</p>
          </div>
          <div className="card">
            <p className="text-sm text-[#8b98a5]">已成交</p>
            <p className="text-2xl font-bold mt-1">{stats.filledOrders}</p>
          </div>
          <div className="card">
            <p className="text-sm text-[#8b98a5]">盈利订单</p>
            <p className="text-2xl font-bold mt-1 text-green-500">{stats.winningOrders}</p>
          </div>
          <div className="card">
            <p className="text-sm text-[#8b98a5]">亏损订单</p>
            <p className="text-2xl font-bold mt-1 text-red-500">{stats.losingOrders}</p>
          </div>
          <div className="card">
            <p className="text-sm text-[#8b98a5]">胜率</p>
            <p className="text-2xl font-bold mt-1">{stats.winRate.toFixed(2)}%</p>
          </div>
          <div className="card">
            <p className="text-sm text-[#8b98a5]">总利润</p>
            <p className={`text-2xl font-bold mt-1 ${
              stats.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              ${stats.totalProfit.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <FunnelIcon className="h-5 w-5 text-[#8b98a5]" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">账户类型</label>
              <select
                className="select"
                value={filters.isSimulated}
                onChange={(e) => handleFilterChange('isSimulated', e.target.value)}
              >
                <option value="">全部</option>
                <option value="true">模拟账户</option>
                <option value="false">实盘账户</option>
              </select>
            </div>
            <div>
              <label className="label">订单状态</label>
              <select
                className="select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">全部</option>
                <option value="NEW">新建</option>
                <option value="FILLED">已成交</option>
                <option value="PARTIALLY_FILLED">部分成交</option>
                <option value="CANCELED">已取消</option>
                <option value="REJECTED">已拒绝</option>
              </select>
            </div>
            <div>
              <label className="label">交易对</label>
              <input
                type="text"
                className="input"
                placeholder="例如: BTCUSDT"
                value={filters.symbol}
                onChange={(e) => handleFilterChange('symbol', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12">加载中...</div>
          ) : orders.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>订单ID</th>
                  <th>交易对</th>
                  <th>方向</th>
                  <th>类型</th>
                  <th>数量</th>
                  <th>价格</th>
                  <th>状态</th>
                  <th>盈亏</th>
                  <th>策略</th>
                  <th>账户</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td className="text-sm">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="font-mono text-xs">
                      {order.orderId.substring(0, 12)}...
                    </td>
                    <td className="font-medium">{order.symbol}</td>
                    <td>
                      <span className={`badge ${
                        order.side === 'BUY' ? 'badge-success' : 'badge-danger'
                      }`}>
                        {order.side === 'BUY' ? '买入' : '卖出'}
                      </span>
                    </td>
                    <td className="text-sm">{order.type}</td>
                    <td>{order.quantity.toFixed(4)}</td>
                    <td>${order.executedPrice?.toFixed(2) || order.price?.toFixed(2)}</td>
                    <td>
                      <span className={`badge ${
                        order.status === 'FILLED' ? 'badge-success' :
                        order.status === 'CANCELED' ? 'badge-danger' :
                        order.status === 'REJECTED' ? 'badge-danger' :
                        'badge-warning'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      {order.profit !== undefined && order.profit !== 0 ? (
                        <span className={order.profit >= 0 ? 'text-green-500' : 'text-red-500'}>
                          ${order.profit.toFixed(2)}
                          <span className="text-xs ml-1">
                            ({order.profitPercentage.toFixed(2)}%)
                          </span>
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="text-sm text-[#8b98a5]">{order.strategyName || '-'}</td>
                    <td>
                      <span className={`badge ${
                        order.isSimulated ? 'badge-info' : 'badge-warning'
                      }`}>
                        {order.isSimulated ? '模拟' : '实盘'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-[#8b98a5]">
              <p>暂无订单记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

