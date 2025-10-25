import { useState, useEffect } from 'react';
import { strategyAPI } from '../utils/api';
import { PlusIcon, TrashIcon, PencilIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';

export default function Strategies() {
  const [strategies, setStrategies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState(null);
  const [loading, setLoading] = useState(true);

  // 策略模板
  const strategyTemplates = {
    trend: {
      name: 'BTC趋势跟踪',
      description: '适合牛市和强趋势市场，使用EMA多头排列和RSI确认',
      symbol: 'BTCUSDT',
      interval: '4h',
      useAI: true,
      aiConfidenceThreshold: 0.7,
      indicators: {
        rsi: { enabled: true, period: 14, overbought: 70, oversold: 50 },
        macd: { enabled: true, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
        ma: { enabled: true, shortPeriod: 20, longPeriod: 50 },
        bollingerBands: { enabled: false, period: 20, stdDev: 2 },
        volume: { enabled: true, threshold: 1.2 }
      },
      riskManagement: {
        maxPositionSize: 8000,
        stopLossPercentage: 3,
        takeProfitPercentage: 8,
        riskPercentage: 2
      }
    },
    meanReversion: {
      name: 'BTC均值回归',
      description: '适合震荡市场，使用布林带和RSI超买超卖',
      symbol: 'BTCUSDT',
      interval: '1h',
      useAI: true,
      aiConfidenceThreshold: 0.75,
      indicators: {
        rsi: { enabled: true, period: 14, overbought: 70, oversold: 30 },
        macd: { enabled: true, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
        ma: { enabled: false, shortPeriod: 9, longPeriod: 21 },
        bollingerBands: { enabled: true, period: 20, stdDev: 2 },
        volume: { enabled: false, threshold: 1.5 }
      },
      riskManagement: {
        maxPositionSize: 5000,
        stopLossPercentage: 2,
        takeProfitPercentage: 4,
        riskPercentage: 1.5
      }
    },
    breakout: {
      name: 'BTC突破策略',
      description: '适合高波动期，捕捉价格突破',
      symbol: 'BTCUSDT',
      interval: '1h',
      useAI: true,
      aiConfidenceThreshold: 0.8,
      indicators: {
        rsi: { enabled: true, period: 14, overbought: 55, oversold: 45 },
        macd: { enabled: true, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
        ma: { enabled: true, shortPeriod: 9, longPeriod: 21 },
        bollingerBands: { enabled: true, period: 20, stdDev: 2 },
        volume: { enabled: true, threshold: 2.0 }
      },
      riskManagement: {
        maxPositionSize: 6000,
        stopLossPercentage: 2.5,
        takeProfitPercentage: 10,
        riskPercentage: 2
      }
    },
    macdRsi: {
      name: 'MACD+RSI双确认',
      description: '经典组合，适合所有市况',
      symbol: 'BTCUSDT',
      interval: '4h',
      useAI: true,
      aiConfidenceThreshold: 0.7,
      indicators: {
        rsi: { enabled: true, period: 14, overbought: 70, oversold: 30 },
        macd: { enabled: true, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
        ma: { enabled: true, shortPeriod: 50, longPeriod: 200 },
        bollingerBands: { enabled: false, period: 20, stdDev: 2 },
        volume: { enabled: false, threshold: 1.5 }
      },
      riskManagement: {
        maxPositionSize: 7000,
        stopLossPercentage: 2,
        takeProfitPercentage: 6,
        riskPercentage: 2
      }
    },
    swing: {
      name: 'BTC波段策略',
      description: '中长线策略，适合捕捉大周期波动',
      symbol: 'BTCUSDT',
      interval: '1d',
      useAI: true,
      aiConfidenceThreshold: 0.65,
      indicators: {
        rsi: { enabled: true, period: 14, overbought: 70, oversold: 35 },
        macd: { enabled: true, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
        ma: { enabled: true, shortPeriod: 50, longPeriod: 200 },
        bollingerBands: { enabled: false, period: 20, stdDev: 2 },
        volume: { enabled: false, threshold: 1.5 }
      },
      riskManagement: {
        maxPositionSize: 10000,
        stopLossPercentage: 5,
        takeProfitPercentage: 20,
        riskPercentage: 1.5
      }
    }
  };

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
                {/* Strategy Template Selector */}
                {!editingStrategy && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <label className="label mb-2">选择策略模板（可选）</label>
                    <select
                      className="select mb-2"
                      onChange={(e) => {
                        if (e.target.value) {
                          setFormData(strategyTemplates[e.target.value]);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="">自定义策略</option>
                      <option value="trend">🚀 趋势跟踪（适合牛市）</option>
                      <option value="meanReversion">↔️ 均值回归（适合震荡市）</option>
                      <option value="breakout">💥 突破策略（高波动）</option>
                      <option value="macdRsi">✅ MACD+RSI双确认（经典）</option>
                      <option value="swing">📈 波段策略（中长线）</option>
                    </select>
                    <p className="text-xs text-[#8b98a5]">
                      选择模板后，参数会自动填充。您可以根据需要调整。
                    </p>
                  </div>
                )}

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

                {/* Technical Indicators */}
                <div className="border-t border-[#2f3336] pt-4">
                  <h4 className="font-medium mb-3">技术指标配置</h4>
                  
                  {/* RSI */}
                  <div className="bg-[#1e2124] p-4 rounded-lg mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-sm">RSI（相对强弱指标）</h5>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.indicators.rsi.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            indicators: {
                              ...formData.indicators,
                              rsi: { ...formData.indicators.rsi, enabled: e.target.checked }
                            }
                          })}
                          className="mr-2"
                        />
                        <span className="text-sm text-[#8b98a5]">启用</span>
                      </label>
                    </div>
                    {formData.indicators.rsi.enabled && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="label text-xs">周期</label>
                          <input
                            type="number"
                            className="input input-sm"
                            value={formData.indicators.rsi.period}
                            onChange={(e) => setFormData({
                              ...formData,
                              indicators: {
                                ...formData.indicators,
                                rsi: { ...formData.indicators.rsi, period: parseInt(e.target.value) }
                              }
                            })}
                          />
                        </div>
                        <div>
                          <label className="label text-xs">超买线</label>
                          <input
                            type="number"
                            className="input input-sm"
                            value={formData.indicators.rsi.overbought}
                            onChange={(e) => setFormData({
                              ...formData,
                              indicators: {
                                ...formData.indicators,
                                rsi: { ...formData.indicators.rsi, overbought: parseInt(e.target.value) }
                              }
                            })}
                          />
                        </div>
                        <div>
                          <label className="label text-xs">超卖线</label>
                          <input
                            type="number"
                            className="input input-sm"
                            value={formData.indicators.rsi.oversold}
                            onChange={(e) => setFormData({
                              ...formData,
                              indicators: {
                                ...formData.indicators,
                                rsi: { ...formData.indicators.rsi, oversold: parseInt(e.target.value) }
                              }
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MACD */}
                  <div className="bg-[#1e2124] p-4 rounded-lg mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-sm">MACD（异同移动平均线）</h5>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.indicators.macd.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            indicators: {
                              ...formData.indicators,
                              macd: { ...formData.indicators.macd, enabled: e.target.checked }
                            }
                          })}
                          className="mr-2"
                        />
                        <span className="text-sm text-[#8b98a5]">启用</span>
                      </label>
                    </div>
                    {formData.indicators.macd.enabled && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="label text-xs">快线周期</label>
                          <input
                            type="number"
                            className="input input-sm"
                            value={formData.indicators.macd.fastPeriod}
                            onChange={(e) => setFormData({
                              ...formData,
                              indicators: {
                                ...formData.indicators,
                                macd: { ...formData.indicators.macd, fastPeriod: parseInt(e.target.value) }
                              }
                            })}
                          />
                        </div>
                        <div>
                          <label className="label text-xs">慢线周期</label>
                          <input
                            type="number"
                            className="input input-sm"
                            value={formData.indicators.macd.slowPeriod}
                            onChange={(e) => setFormData({
                              ...formData,
                              indicators: {
                                ...formData.indicators,
                                macd: { ...formData.indicators.macd, slowPeriod: parseInt(e.target.value) }
                              }
                            })}
                          />
                        </div>
                        <div>
                          <label className="label text-xs">信号线周期</label>
                          <input
                            type="number"
                            className="input input-sm"
                            value={formData.indicators.macd.signalPeriod}
                            onChange={(e) => setFormData({
                              ...formData,
                              indicators: {
                                ...formData.indicators,
                                macd: { ...formData.indicators.macd, signalPeriod: parseInt(e.target.value) }
                              }
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Moving Average */}
                  <div className="bg-[#1e2124] p-4 rounded-lg mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-sm">MA（移动平均线）</h5>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.indicators.ma.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            indicators: {
                              ...formData.indicators,
                              ma: { ...formData.indicators.ma, enabled: e.target.checked }
                            }
                          })}
                          className="mr-2"
                        />
                        <span className="text-sm text-[#8b98a5]">启用</span>
                      </label>
                    </div>
                    {formData.indicators.ma.enabled && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label text-xs">短期周期</label>
                          <input
                            type="number"
                            className="input input-sm"
                            value={formData.indicators.ma.shortPeriod}
                            onChange={(e) => setFormData({
                              ...formData,
                              indicators: {
                                ...formData.indicators,
                                ma: { ...formData.indicators.ma, shortPeriod: parseInt(e.target.value) }
                              }
                            })}
                          />
                        </div>
                        <div>
                          <label className="label text-xs">长期周期</label>
                          <input
                            type="number"
                            className="input input-sm"
                            value={formData.indicators.ma.longPeriod}
                            onChange={(e) => setFormData({
                              ...formData,
                              indicators: {
                                ...formData.indicators,
                                ma: { ...formData.indicators.ma, longPeriod: parseInt(e.target.value) }
                              }
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bollinger Bands */}
                  <div className="bg-[#1e2124] p-4 rounded-lg mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-sm">布林带（Bollinger Bands）</h5>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.indicators.bollingerBands.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            indicators: {
                              ...formData.indicators,
                              bollingerBands: { ...formData.indicators.bollingerBands, enabled: e.target.checked }
                            }
                          })}
                          className="mr-2"
                        />
                        <span className="text-sm text-[#8b98a5]">启用</span>
                      </label>
                    </div>
                    {formData.indicators.bollingerBands.enabled && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label text-xs">周期</label>
                          <input
                            type="number"
                            className="input input-sm"
                            value={formData.indicators.bollingerBands.period}
                            onChange={(e) => setFormData({
                              ...formData,
                              indicators: {
                                ...formData.indicators,
                                bollingerBands: { ...formData.indicators.bollingerBands, period: parseInt(e.target.value) }
                              }
                            })}
                          />
                        </div>
                        <div>
                          <label className="label text-xs">标准差倍数</label>
                          <input
                            type="number"
                            step="0.1"
                            className="input input-sm"
                            value={formData.indicators.bollingerBands.stdDev}
                            onChange={(e) => setFormData({
                              ...formData,
                              indicators: {
                                ...formData.indicators,
                                bollingerBands: { ...formData.indicators.bollingerBands, stdDev: parseFloat(e.target.value) }
                              }
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Volume */}
                  <div className="bg-[#1e2124] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-sm">成交量分析</h5>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.indicators.volume.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            indicators: {
                              ...formData.indicators,
                              volume: { ...formData.indicators.volume, enabled: e.target.checked }
                            }
                          })}
                          className="mr-2"
                        />
                        <span className="text-sm text-[#8b98a5]">启用</span>
                      </label>
                    </div>
                    {formData.indicators.volume.enabled && (
                      <div>
                        <label className="label text-xs">成交量放大倍数阈值</label>
                        <input
                          type="number"
                          step="0.1"
                          className="input input-sm"
                          value={formData.indicators.volume.threshold}
                          onChange={(e) => setFormData({
                            ...formData,
                            indicators: {
                              ...formData.indicators,
                              volume: { ...formData.indicators.volume, threshold: parseFloat(e.target.value) }
                            }
                          })}
                        />
                        <p className="text-xs text-[#8b98a5] mt-1">
                          例如：1.5 表示成交量需要超过平均值的1.5倍才触发信号
                        </p>
                      </div>
                    )}
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
                      <p className="text-xs text-[#8b98a5] mt-1">
                        AI推荐置信度需要达到此值才会执行交易（0-1之间，推荐0.7）
                      </p>
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

