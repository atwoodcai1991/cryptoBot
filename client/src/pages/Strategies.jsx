import { useState, useEffect } from 'react';
import { strategyAPI } from '../utils/api';
import { PlusIcon, TrashIcon, PencilIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';

export default function Strategies() {
  const [strategies, setStrategies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    symbol: 'BTCUSDT',
    interval: '5m',
    useAI: true,
    aiConfidenceThreshold: 0.7,
    indicators: {
      rsi: { enabled: true, period: 14, overbought: 70, oversold: 30 },
      macd: { enabled: true, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
      ma: { enabled: true, shortPeriod: 9, longPeriod: 21 },
      bollingerBands: { enabled: true, period: 20, stdDev: 2 },
      volume: { enabled: true, threshold: 1.5 }
    },
    riskManagement: {
      maxPositionSize: 1000,
      stopLossPercentage: 2,
      takeProfitPercentage: 5,
      riskPercentage: 2
    }
  });

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      const response = await strategyAPI.getAll();
      setStrategies(response.data.data || []);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStrategy) {
        await strategyAPI.update(editingStrategy._id, formData);
      } else {
        await strategyAPI.create(formData);
      }
      setShowModal(false);
      setEditingStrategy(null);
      resetForm();
      fetchStrategies();
    } catch (error) {
      console.error('Error saving strategy:', error);
      alert('保存策略失败: ' + error.message);
    }
  };

  const handleEdit = (strategy) => {
    setEditingStrategy(strategy);
    setFormData(strategy);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这个策略吗？')) {
      try {
        await strategyAPI.delete(id);
        fetchStrategies();
      } catch (error) {
        console.error('Error deleting strategy:', error);
        alert('删除策略失败');
      }
    }
  };

  const handleToggle = async (id) => {
    try {
      await strategyAPI.toggle(id);
      fetchStrategies();
    } catch (error) {
      console.error('Error toggling strategy:', error);
      alert('切换策略状态失败');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      symbol: 'BTCUSDT',
      interval: '5m',
      useAI: true,
      aiConfidenceThreshold: 0.7,
      indicators: {
        rsi: { enabled: true, period: 14, overbought: 70, oversold: 30 },
        macd: { enabled: true, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
        ma: { enabled: true, shortPeriod: 9, longPeriod: 21 },
        bollingerBands: { enabled: true, period: 20, stdDev: 2 },
        volume: { enabled: true, threshold: 1.5 }
      },
      riskManagement: {
        maxPositionSize: 1000,
        stopLossPercentage: 2,
        takeProfitPercentage: 5,
        riskPercentage: 2
      }
    });
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">交易策略</h2>
          <p className="text-[#8b98a5] mt-1">管理和配置你的交易策略</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingStrategy(null);
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          创建策略
        </button>
      </div>

      {/* Strategies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {strategies.map((strategy) => (
          <div key={strategy._id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{strategy.name}</h3>
                <p className="text-sm text-[#8b98a5] mt-1">{strategy.description}</p>
              </div>
              <span className={`badge ${strategy.isActive ? 'badge-success' : 'badge-danger'}`}>
                {strategy.isActive ? '运行中' : '已停止'}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-[#8b98a5]">交易对</span>
                <span className="font-medium">{strategy.symbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#8b98a5]">时间周期</span>
                <span className="font-medium">{strategy.interval}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#8b98a5]">AI分析</span>
                <span className="font-medium">{strategy.useAI ? '启用' : '禁用'}</span>
              </div>
            </div>

            <div className="border-t border-[#2f3336] pt-4 mb-4">
              <h4 className="text-sm font-medium mb-2">表现统计</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-[#8b98a5]">交易次数</span>
                  <p className="font-medium">{strategy.performance.totalTrades}</p>
                </div>
                <div>
                  <span className="text-[#8b98a5]">胜率</span>
                  <p className={`font-medium ${
                    strategy.performance.winRate >= 50 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {strategy.performance.winRate.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <span className="text-[#8b98a5]">总利润</span>
                  <p className={`font-medium ${
                    strategy.performance.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    ${strategy.performance.totalProfit.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-[#8b98a5]">盈/亏</span>
                  <p className="font-medium">
                    <span className="text-green-500">{strategy.performance.winningTrades}</span>
                    {' / '}
                    <span className="text-red-500">{strategy.performance.losingTrades}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleToggle(strategy._id)}
                className={`btn flex-1 ${strategy.isActive ? 'btn-danger' : 'btn-success'}`}
              >
                {strategy.isActive ? (
                  <>
                    <PauseIcon className="h-4 w-4 mr-1" />
                    停止
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4 mr-1" />
                    启动
                  </>
                )}
              </button>
              <button
                onClick={() => handleEdit(strategy)}
                className="btn btn-secondary"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(strategy._id)}
                className="btn btn-danger"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {strategies.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-[#8b98a5]">还没有策略，点击上方按钮创建第一个策略</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#16181c] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-6">
                {editingStrategy ? '编辑策略' : '创建新策略'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Info */}
                <div>
                  <label className="label">策略名称</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="label">描述</label>
                  <textarea
                    className="input"
                    rows="2"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">交易对</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.symbol}
                      onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">时间周期</label>
                    <select
                      className="select"
                      value={formData.interval}
                      onChange={(e) => setFormData({...formData, interval: e.target.value})}
                    >
                      <option value="1m">1分钟</option>
                      <option value="3m">3分钟</option>
                      <option value="5m">5分钟</option>
                      <option value="15m">15分钟</option>
                      <option value="30m">30分钟</option>
                      <option value="1h">1小时</option>
                      <option value="4h">4小时</option>
                      <option value="1d">1天</option>
                    </select>
                  </div>
                </div>

                {/* Risk Management */}
                <div className="border-t border-[#2f3336] pt-4">
                  <h4 className="font-medium mb-3">风险管理</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">最大仓位 ($)</label>
                      <input
                        type="number"
                        className="input"
                        value={formData.riskManagement.maxPositionSize}
                        onChange={(e) => setFormData({
                          ...formData,
                          riskManagement: {
                            ...formData.riskManagement,
                            maxPositionSize: parseFloat(e.target.value)
                          }
                        })}
                      />
                    </div>
                    <div>
                      <label className="label">风险比例 (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="input"
                        value={formData.riskManagement.riskPercentage}
                        onChange={(e) => setFormData({
                          ...formData,
                          riskManagement: {
                            ...formData.riskManagement,
                            riskPercentage: parseFloat(e.target.value)
                          }
                        })}
                      />
                    </div>
                    <div>
                      <label className="label">止损 (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="input"
                        value={formData.riskManagement.stopLossPercentage}
                        onChange={(e) => setFormData({
                          ...formData,
                          riskManagement: {
                            ...formData.riskManagement,
                            stopLossPercentage: parseFloat(e.target.value)
                          }
                        })}
                      />
                    </div>
                    <div>
                      <label className="label">止盈 (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="input"
                        value={formData.riskManagement.takeProfitPercentage}
                        onChange={(e) => setFormData({
                          ...formData,
                          riskManagement: {
                            ...formData.riskManagement,
                            takeProfitPercentage: parseFloat(e.target.value)
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* AI Settings */}
                <div className="border-t border-[#2f3336] pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">AI分析</h4>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.useAI}
                        onChange={(e) => setFormData({...formData, useAI: e.target.checked})}
                        className="mr-2"
                      />
                      <span className="text-sm">启用AI分析</span>
                    </label>
                  </div>
                  {formData.useAI && (
                    <div>
                      <label className="label">AI置信度阈值</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        className="input"
                        value={formData.aiConfidenceThreshold}
                        onChange={(e) => setFormData({
                          ...formData,
                          aiConfidenceThreshold: parseFloat(e.target.value)
                        })}
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingStrategy(null);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingStrategy ? '保存' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

