import { useState, useEffect } from 'react';
import { strategyAPI, tradingAPI, aiAPI } from '../utils/api';
import { PlayIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function Trading() {
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [isSimulated, setIsSimulated] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      const response = await strategyAPI.getAll();
      setStrategies(response.data.data || []);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    }
  };

  const handleAIAnalysis = async () => {
    if (!selectedStrategy) {
      alert('请先选择一个策略');
      return;
    }

    setAnalyzing(true);
    setAiAnalysis(null);

    try {
      const strategy = strategies.find(s => s._id === selectedStrategy);
      const response = await aiAPI.analyze(strategy.symbol, selectedStrategy);
      setAiAnalysis(response.data.data);
    } catch (error) {
      console.error('Error getting AI analysis:', error);
      alert('AI分析失败: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExecuteTrade = async () => {
    if (!selectedStrategy) {
      alert('请先选择一个策略');
      return;
    }

    if (!window.confirm(`确定要执行${isSimulated ? '模拟' : '真实'}交易吗？`)) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await tradingAPI.execute(selectedStrategy, isSimulated);
      setResult(response.data.data);
      
      if (response.data.data.executed) {
        alert('交易执行成功！');
      } else {
        alert(`交易未执行: ${response.data.data.reason}`);
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      alert('交易执行失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedStrategyData = strategies.find(s => s._id === selectedStrategy);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">实时交易</h2>
        <p className="text-[#8b98a5] mt-1">执行交易和查看AI分析建议</p>
      </div>

      {/* Warning Banner */}
      <div className="card bg-yellow-500/10 border-yellow-500/20">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-500">风险提示</h3>
            <p className="mt-1 text-sm text-[#8b98a5]">
              加密货币交易存在高风险，可能导致资金损失。请谨慎操作，建议先使用模拟交易测试策略。
            </p>
          </div>
        </div>
      </div>

      {/* Trading Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Controls */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">交易控制</h3>
          
          <div className="space-y-4">
            {/* Strategy Selection */}
            <div>
              <label className="label">选择策略</label>
              <select
                className="select"
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
              >
                <option value="">-- 选择策略 --</option>
                {strategies.map((strategy) => (
                  <option key={strategy._id} value={strategy._id}>
                    {strategy.name} ({strategy.symbol} - {strategy.interval})
                  </option>
                ))}
              </select>
            </div>

            {/* Trading Mode */}
            <div>
              <label className="label">交易模式</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={isSimulated}
                    onChange={() => setIsSimulated(true)}
                    className="mr-2"
                  />
                  <span>模拟交易</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!isSimulated}
                    onChange={() => setIsSimulated(false)}
                    className="mr-2"
                  />
                  <span className="text-red-500">实盘交易</span>
                </label>
              </div>
            </div>

            {/* Strategy Info */}
            {selectedStrategyData && (
              <div className="bg-[#1a1f26] rounded-lg p-4">
                <h4 className="font-medium mb-2">策略信息</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8b98a5]">交易对</span>
                    <span>{selectedStrategyData.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b98a5]">时间周期</span>
                    <span>{selectedStrategyData.interval}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b98a5]">AI分析</span>
                    <span>{selectedStrategyData.useAI ? '启用' : '禁用'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b98a5]">止损</span>
                    <span>{selectedStrategyData.riskManagement.stopLossPercentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b98a5]">止盈</span>
                    <span>{selectedStrategyData.riskManagement.takeProfitPercentage}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <button
                onClick={handleAIAnalysis}
                disabled={!selectedStrategy || analyzing}
                className="btn btn-secondary w-full flex items-center justify-center"
              >
                <SparklesIcon className="h-5 w-5 mr-2" />
                {analyzing ? 'AI分析中...' : '获取AI分析'}
              </button>
              
              <button
                onClick={handleExecuteTrade}
                disabled={!selectedStrategy || loading}
                className={`btn w-full flex items-center justify-center ${
                  isSimulated ? 'btn-primary' : 'btn-danger'
                }`}
              >
                <PlayIcon className="h-5 w-5 mr-2" />
                {loading ? '执行中...' : `执行${isSimulated ? '模拟' : '实盘'}交易`}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Analysis */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">AI分析结果</h3>
          
          {aiAnalysis ? (
            <div className="space-y-4">
              {/* Technical Signals */}
              <div className="bg-[#1a1f26] rounded-lg p-4">
                <h4 className="font-medium mb-3">技术指标信号</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8b98a5]">推荐操作</span>
                    <span className={`badge ${
                      aiAnalysis.technicalSignals.action === 'BUY' ? 'badge-success' :
                      aiAnalysis.technicalSignals.action === 'SELL' ? 'badge-danger' :
                      'badge-warning'
                    }`}>
                      {aiAnalysis.technicalSignals.action === 'BUY' ? '买入' :
                       aiAnalysis.technicalSignals.action === 'SELL' ? '卖出' : '持有'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8b98a5]">置信度</span>
                    <span>{(aiAnalysis.technicalSignals.confidence * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8b98a5]">当前价格</span>
                    <span>${aiAnalysis.technicalSignals.currentPrice?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Buy Signals */}
                {aiAnalysis.technicalSignals.buy && aiAnalysis.technicalSignals.buy.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#2f3336]">
                    <p className="text-sm text-green-500 font-medium mb-2">买入信号</p>
                    <ul className="text-sm space-y-1">
                      {aiAnalysis.technicalSignals.buy.map((signal, idx) => (
                        <li key={idx} className="text-[#8b98a5]">
                          • {signal.indicator}: {signal.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sell Signals */}
                {aiAnalysis.technicalSignals.sell && aiAnalysis.technicalSignals.sell.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#2f3336]">
                    <p className="text-sm text-red-500 font-medium mb-2">卖出信号</p>
                    <ul className="text-sm space-y-1">
                      {aiAnalysis.technicalSignals.sell.map((signal, idx) => (
                        <li key={idx} className="text-[#8b98a5]">
                          • {signal.indicator}: {signal.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* AI Analysis */}
              {aiAnalysis.aiAnalysis && aiAnalysis.aiAnalysis.enabled && (
                <div className="bg-[#1a1f26] rounded-lg p-4">
                  <h4 className="font-medium mb-3">ChatGPT AI分析</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#8b98a5]">AI推荐</span>
                        <span className={`badge ${
                          aiAnalysis.aiAnalysis.recommendation === 'BUY' ? 'badge-success' :
                          aiAnalysis.aiAnalysis.recommendation === 'SELL' ? 'badge-danger' :
                          'badge-warning'
                        }`}>
                          {aiAnalysis.aiAnalysis.recommendation === 'BUY' ? '买入' :
                           aiAnalysis.aiAnalysis.recommendation === 'SELL' ? '卖出' : '持有'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#8b98a5]">AI置信度</span>
                        <span>{(aiAnalysis.aiAnalysis.confidence * 100).toFixed(2)}%</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#2f3336]">
                      <p className="text-sm text-[#8b98a5] mb-2">分析理由</p>
                      <p className="text-sm">{aiAnalysis.aiAnalysis.reasoning}</p>
                    </div>

                    {aiAnalysis.aiAnalysis.riskFactors && aiAnalysis.aiAnalysis.riskFactors.length > 0 && (
                      <div className="pt-3 border-t border-[#2f3336]">
                        <p className="text-sm text-[#8b98a5] mb-2">风险因素</p>
                        <ul className="text-sm space-y-1">
                          {aiAnalysis.aiAnalysis.riskFactors.map((risk, idx) => (
                            <li key={idx} className="text-yellow-500">• {risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-[#8b98a5]">
              <SparklesIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>点击"获取AI分析"查看市场分析</p>
            </div>
          )}
        </div>
      </div>

      {/* Execution Result */}
      {result && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">执行结果</h3>
          
          {result.executed ? (
            <div className="space-y-3">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <p className="text-green-500 font-medium mb-2">✓ 交易执行成功</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#8b98a5]">订单ID</span>
                    <p className="font-mono">{result.order?.orderId}</p>
                  </div>
                  <div>
                    <span className="text-[#8b98a5]">交易对</span>
                    <p>{result.order?.symbol}</p>
                  </div>
                  <div>
                    <span className="text-[#8b98a5]">方向</span>
                    <p className={result.order?.side === 'BUY' ? 'text-green-500' : 'text-red-500'}>
                      {result.order?.side === 'BUY' ? '买入' : '卖出'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#8b98a5]">数量</span>
                    <p>{result.order?.quantity}</p>
                  </div>
                  <div>
                    <span className="text-[#8b98a5]">价格</span>
                    <p>${result.order?.executedPrice?.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-[#8b98a5]">状态</span>
                    <p className="text-green-500">{result.order?.status}</p>
                  </div>
                </div>
              </div>

              {result.riskLevels && (
                <div className="bg-[#1a1f26] rounded-lg p-4">
                  <p className="font-medium mb-2">风险管理</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[#8b98a5]">止损价格</span>
                      <p className="text-red-500">${result.riskLevels.stopLoss?.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-[#8b98a5]">止盈价格</span>
                      <p className="text-green-500">${result.riskLevels.takeProfit?.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-yellow-500">未执行交易: {result.reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

