import { useState, useEffect } from 'react';
import { accountAPI, statusAPI, systemConfigAPI, dataCacheAPI } from '../utils/api';
import { PencilIcon, CheckIcon, XMarkIcon, ArrowPathIcon, ServerIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function Settings() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [systemConfig, setSystemConfig] = useState(null);
  const [editingConfig, setEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({});
  const [cacheStats, setCacheStats] = useState(null);

  useEffect(() => {
    fetchAccounts();
    fetchSystemStatus();
    fetchSystemConfig();
    fetchCacheStats();
    
    // 每30秒刷新一次状态
    const interval = setInterval(() => {
      fetchSystemStatus();
      fetchCacheStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await accountAPI.getAll();
      setAccounts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const response = await statusAPI.getAll();
      setSystemStatus(response.data.data);
    } catch (error) {
      console.error('Error fetching system status:', error);
    }
  };

  const fetchSystemConfig = async () => {
    try {
      const response = await systemConfigAPI.get();
      setSystemConfig(response.data.data);
      setConfigForm({
        defaultTradeAmount: response.data.data.riskManagement.defaultTradeAmount,
        maxPositionSize: response.data.data.riskManagement.maxPositionSize,
        riskPercentage: response.data.data.riskManagement.riskPercentage,
        stopLossPercentage: response.data.data.riskManagement.stopLossPercentage,
        takeProfitPercentage: response.data.data.riskManagement.takeProfitPercentage,
      });
    } catch (error) {
      console.error('Error fetching system config:', error);
    }
  };

  const fetchCacheStats = async () => {
    try {
      const response = await dataCacheAPI.getStats();
      setCacheStats(response.data.data);
    } catch (error) {
      console.error('Error fetching cache stats:', error);
    }
  };

  const handleResetAccount = async (accountType) => {
    if (!window.confirm(`确定要重置${accountType === 'SIMULATED' ? '模拟' : '实盘'}账户吗？`)) {
      return;
    }

    setLoading(true);
    try {
      await accountAPI.create({
        accountType,
        initialBalance: accountType === 'SIMULATED' ? 10000 : undefined
      });
      alert('账户重置成功');
      fetchAccounts();
    } catch (error) {
      console.error('Error resetting account:', error);
      alert('账户重置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEditConfig = () => {
    setEditingConfig(true);
  };

  const handleCancelEdit = () => {
    setEditingConfig(false);
    // 恢复原值
    setConfigForm({
      defaultTradeAmount: systemConfig.riskManagement.defaultTradeAmount,
      maxPositionSize: systemConfig.riskManagement.maxPositionSize,
      riskPercentage: systemConfig.riskManagement.riskPercentage,
      stopLossPercentage: systemConfig.riskManagement.stopLossPercentage,
      takeProfitPercentage: systemConfig.riskManagement.takeProfitPercentage,
    });
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      await systemConfigAPI.update({
        riskManagement: {
          defaultTradeAmount: parseFloat(configForm.defaultTradeAmount),
          maxPositionSize: parseFloat(configForm.maxPositionSize),
          riskPercentage: parseFloat(configForm.riskPercentage),
          stopLossPercentage: parseFloat(configForm.stopLossPercentage),
          takeProfitPercentage: parseFloat(configForm.takeProfitPercentage),
        }
      });
      alert('配置更新成功！新创建的策略将使用这些默认值。');
      await fetchSystemConfig();
      setEditingConfig(false);
    } catch (error) {
      console.error('Error updating config:', error);
      alert(error.response?.data?.message || '配置更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfig = async () => {
    if (!window.confirm('确定要重置为系统默认配置吗？')) {
      return;
    }

    setLoading(true);
    try {
      await systemConfigAPI.reset();
      alert('配置已重置为默认值');
      await fetchSystemConfig();
      setEditingConfig(false);
    } catch (error) {
      console.error('Error resetting config:', error);
      alert('配置重置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleWarmupCache = async () => {
    const symbols = prompt('输入要预热的交易对（逗号分隔）:', 'BTCUSDT,ETHUSDT');
    if (!symbols) return;

    setLoading(true);
    try {
      const symbolArray = symbols.split(',').map(s => s.trim().toUpperCase());
      await dataCacheAPI.warmup(symbolArray, ['1h', '4h', '1d'], 365);
      alert(`数据预热成功！已为 ${symbolArray.join(', ')} 预加载1年数据`);
      await fetchCacheStats();
    } catch (error) {
      console.error('Error warming up cache:', error);
      alert('数据预热失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async (symbol, interval) => {
    const msg = symbol && interval 
      ? `确定要清除 ${symbol} ${interval} 的缓存吗？`
      : '确定要清除所有缓存数据吗？这将在下次回测时重新下载数据。';
    
    if (!window.confirm(msg)) {
      return;
    }

    setLoading(true);
    try {
      await dataCacheAPI.clear(symbol, interval);
      alert('缓存已清除');
      await fetchCacheStats();
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('清除缓存失败');
    } finally {
      setLoading(false);
    }
  };

  const simulatedAccount = accounts.find(a => a.accountType === 'SIMULATED');
  const realAccount = accounts.find(a => a.accountType === 'REAL');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">系统设置</h2>
        <p className="text-[#8b98a5] mt-1">配置交易机器人参数</p>
      </div>

      {/* Simulated Account */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">模拟账户设置</h3>
        
        {simulatedAccount ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-[#8b98a5]">初始余额</p>
                <p className="text-xl font-bold mt-1">
                  ${simulatedAccount.initialBalance.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#8b98a5]">当前余额</p>
                <p className="text-xl font-bold mt-1">
                  ${simulatedAccount.balance.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#8b98a5]">净利润</p>
                <p className={`text-xl font-bold mt-1 ${
                  simulatedAccount.netProfit >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  ${simulatedAccount.netProfit.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#8b98a5]">收益率</p>
                <p className={`text-xl font-bold mt-1 ${
                  simulatedAccount.profitPercentage >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {simulatedAccount.profitPercentage.toFixed(2)}%
                </p>
              </div>
            </div>

            <button
              onClick={() => handleResetAccount('SIMULATED')}
              disabled={loading}
              className="btn btn-danger"
            >
              重置模拟账户
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-[#8b98a5] mb-4">还没有模拟账户</p>
            <button
              onClick={() => handleResetAccount('SIMULATED')}
              disabled={loading}
              className="btn btn-primary"
            >
              创建模拟账户
            </button>
          </div>
        )}
      </div>

      {/* API Configuration */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">API配置</h3>
        <div className="space-y-4">

          <div>
            <label className="label">币安API状态</label>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                systemStatus?.binance?.status === 'connected' ? 'bg-green-500' : 
                systemStatus?.binance?.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
              }`}></div>
              <span>
                {systemStatus?.binance?.message || '检查中...'}
                {systemStatus?.binance?.testnet && ' (测试网)'}
              </span>
            </div>
          </div>

          <div>
            <label className="label">AI API状态 (Gemini)</label>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                systemStatus?.ai?.status === 'connected' ? 'bg-green-500' : 
                systemStatus?.ai?.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
              }`}></div>
              <span>{systemStatus?.ai?.message || '检查中...'}</span>
            </div>
            {systemStatus?.ai?.model && (
              <p className="text-xs text-[#8b98a5] mt-1">
                模型: {systemStatus.ai.model} | SDK: {systemStatus.ai.sdk} v{systemStatus.ai.version}
              </p>
            )}
          </div>

          <div>
            <label className="label">MongoDB 状态</label>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                systemStatus?.mongodb?.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span>{systemStatus?.mongodb?.message || '检查中...'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Management */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">风险管理默认值</h3>
            <p className="text-sm text-[#8b98a5] mt-1">
              这些是创建新策略时的默认值，可以在策略设置中单独修改。
            </p>
          </div>
          <div className="flex gap-2">
            {!editingConfig ? (
              <button
                onClick={handleEditConfig}
                className="btn btn-secondary flex items-center gap-2"
                disabled={!systemConfig}
              >
                <PencilIcon className="h-4 w-4" />
                编辑
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="btn btn-secondary flex items-center gap-2"
                  disabled={loading}
                >
                  <XMarkIcon className="h-4 w-4" />
                  取消
                </button>
                <button
                  onClick={handleSaveConfig}
                  className="btn btn-primary flex items-center gap-2"
                  disabled={loading}
                >
                  <CheckIcon className="h-4 w-4" />
                  {loading ? '保存中...' : '保存'}
                </button>
              </>
            )}
          </div>
        </div>
        
        {systemConfig ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="label">默认交易金额 ($)</label>
                <input 
                  type="number" 
                  className="input" 
                  value={configForm.defaultTradeAmount || ''} 
                  onChange={(e) => setConfigForm({...configForm, defaultTradeAmount: e.target.value})}
                  disabled={!editingConfig}
                  min="10"
                  max="100000"
                />
                <p className="text-xs text-[#8b98a5] mt-1">范围: 10-100,000</p>
              </div>
              <div>
                <label className="label">最大仓位 ($)</label>
                <input 
                  type="number" 
                  className="input" 
                  value={configForm.maxPositionSize || ''} 
                  onChange={(e) => setConfigForm({...configForm, maxPositionSize: e.target.value})}
                  disabled={!editingConfig}
                  min="100"
                  max="1000000"
                />
                <p className="text-xs text-[#8b98a5] mt-1">范围: 100-1,000,000</p>
              </div>
              <div>
                <label className="label">风险比例 (%)</label>
                <input 
                  type="number" 
                  className="input" 
                  value={configForm.riskPercentage || ''} 
                  onChange={(e) => setConfigForm({...configForm, riskPercentage: e.target.value})}
                  disabled={!editingConfig}
                  min="0.1"
                  max="10"
                  step="0.1"
                />
                <p className="text-xs text-[#8b98a5] mt-1">范围: 0.1-10%</p>
              </div>
              <div>
                <label className="label">止损比例 (%)</label>
                <input 
                  type="number" 
                  className="input" 
                  value={configForm.stopLossPercentage || ''} 
                  onChange={(e) => setConfigForm({...configForm, stopLossPercentage: e.target.value})}
                  disabled={!editingConfig}
                  min="0.5"
                  max="20"
                  step="0.1"
                />
                <p className="text-xs text-[#8b98a5] mt-1">范围: 0.5-20%</p>
              </div>
              <div>
                <label className="label">止盈比例 (%)</label>
                <input 
                  type="number" 
                  className="input" 
                  value={configForm.takeProfitPercentage || ''} 
                  onChange={(e) => setConfigForm({...configForm, takeProfitPercentage: e.target.value})}
                  disabled={!editingConfig}
                  min="1"
                  max="50"
                  step="0.1"
                />
                <p className="text-xs text-[#8b98a5] mt-1">范围: 1-50%</p>
              </div>
            </div>

            {editingConfig && (
              <div className="pt-4 border-t border-[#2f3336]">
                <button
                  onClick={handleResetConfig}
                  className="btn btn-danger flex items-center gap-2"
                  disabled={loading}
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  重置为默认值
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-[#8b98a5]">加载配置中...</p>
          </div>
        )}
      </div>

      {/* System Info */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">系统信息</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[#8b98a5]">版本</span>
            <p className="font-medium">v1.0.0</p>
          </div>
          <div>
            <span className="text-[#8b98a5]">环境</span>
            <p className="font-medium">{systemStatus?.server?.environment || 'Development'}</p>
          </div>
          <div>
            <span className="text-[#8b98a5]">Node.js</span>
            <p className="font-medium">{systemStatus?.server?.nodeVersion || 'N/A'}</p>
          </div>
          <div>
            <span className="text-[#8b98a5]">运行时间</span>
            <p className="font-medium">
              {systemStatus?.server?.uptime 
                ? `${Math.floor(systemStatus.server.uptime / 3600)}h ${Math.floor((systemStatus.server.uptime % 3600) / 60)}m`
                : 'N/A'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Data Cache Management */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ServerIcon className="h-5 w-5" />
              数据缓存管理
            </h3>
            <p className="text-sm text-[#8b98a5] mt-1">
              历史数据缓存系统可以加速回测，避免重复下载数据
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleWarmupCache}
              className="btn btn-primary flex items-center gap-2"
              disabled={loading}
            >
              <ServerIcon className="h-4 w-4" />
              预热缓存
            </button>
            <button
              onClick={() => handleClearCache()}
              className="btn btn-danger flex items-center gap-2"
              disabled={loading}
            >
              <TrashIcon className="h-4 w-4" />
              清空缓存
            </button>
          </div>
        </div>

        {cacheStats ? (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#1a1f26] p-4 rounded-lg">
                <p className="text-sm text-[#8b98a5]">缓存记录数</p>
                <p className="text-2xl font-bold mt-1">{cacheStats.totalRecords}</p>
              </div>
              <div className="bg-[#1a1f26] p-4 rounded-lg">
                <p className="text-sm text-[#8b98a5]">总K线数量</p>
                <p className="text-2xl font-bold mt-1">{cacheStats.totalCandles.toLocaleString()}</p>
              </div>
              <div className="bg-[#1a1f26] p-4 rounded-lg">
                <p className="text-sm text-[#8b98a5]">交易对数</p>
                <p className="text-2xl font-bold mt-1">{cacheStats.uniqueSymbols}</p>
              </div>
              <div className="bg-[#1a1f26] p-4 rounded-lg">
                <p className="text-sm text-[#8b98a5]">时间周期数</p>
                <p className="text-2xl font-bold mt-1">{cacheStats.uniqueIntervals}</p>
              </div>
            </div>

            {/* Cache Details */}
            {cacheStats.details && cacheStats.details.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">缓存详情</h4>
                <div className="overflow-x-auto">
                  <table className="table text-sm">
                    <thead>
                      <tr>
                        <th>交易对</th>
                        <th>周期</th>
                        <th>数据量</th>
                        <th>数据范围</th>
                        <th>最后更新</th>
                        <th>状态</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cacheStats.details.slice(0, 10).map((cache, idx) => (
                        <tr key={idx}>
                          <td className="font-medium">{cache.symbol}</td>
                          <td>{cache.interval}</td>
                          <td>{cache.candleCount.toLocaleString()}</td>
                          <td className="text-xs">
                            {new Date(cache.dataStartDate).toLocaleDateString()} - {new Date(cache.dataEndDate).toLocaleDateString()}
                          </td>
                          <td className="text-xs">
                            {new Date(cache.lastUpdate).toLocaleString()}
                          </td>
                          <td>
                            <span className={`badge ${
                              cache.status === 'ACTIVE' ? 'badge-success' : 
                              cache.status === 'UPDATING' ? 'badge-warning' : 'badge-danger'
                            }`}>
                              {cache.status}
                            </span>
                            {cache.needsUpdate && (
                              <span className="ml-1 text-xs text-yellow-500">需更新</span>
                            )}
                          </td>
                          <td>
                            <button
                              onClick={() => handleClearCache(cache.symbol, cache.interval)}
                              className="p-1 hover:bg-red-500/20 rounded transition-colors"
                              title="删除"
                            >
                              <TrashIcon className="h-4 w-4 text-red-500" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {cacheStats.details.length > 10 && (
                    <p className="text-xs text-[#8b98a5] mt-2 text-center">
                      显示前 10 条，共 {cacheStats.details.length} 条记录
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-400 font-medium mb-2">💡 使用提示</p>
              <ul className="text-xs text-[#8b98a5] space-y-1">
                <li>• <strong>预热缓存</strong>：手动预加载常用交易对的历史数据，加速后续回测</li>
                <li>• <strong>自动更新</strong>：系统每小时自动更新缓存数据，保持数据最新</li>
                <li>• <strong>智能缓存</strong>：回测时自动使用缓存，缺失数据时才从API获取</li>
                <li>• <strong>数据范围</strong>：缓存最多保留2年历史数据（可配置）</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-[#8b98a5]">加载缓存统计中...</p>
          </div>
        )}
      </div>

      {/* Documentation */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">文档和帮助</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[#1a1f26] rounded-lg">
            <div>
              <p className="font-medium">使用文档</p>
              <p className="text-sm text-[#8b98a5]">查看完整的使用说明</p>
            </div>
            <button className="btn btn-secondary btn-sm">查看</button>
          </div>
          <div className="flex items-center justify-between p-3 bg-[#1a1f26] rounded-lg">
            <div>
              <p className="font-medium">API文档</p>
              <p className="text-sm text-[#8b98a5]">后端API接口文档</p>
            </div>
            <button className="btn btn-secondary btn-sm">查看</button>
          </div>
          <div className="flex items-center justify-between p-3 bg-[#1a1f26] rounded-lg">
            <div>
              <p className="font-medium">GitHub</p>
              <p className="text-sm text-[#8b98a5]">查看源代码和贡献</p>
            </div>
            <button className="btn btn-secondary btn-sm">访问</button>
          </div>
        </div>
      </div>
    </div>
  );
}

