import { useState, useEffect } from 'react';
import { accountAPI } from '../utils/api';

export default function Settings() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await accountAPI.getAll();
      setAccounts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
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
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-yellow-500 text-sm">
              ⚠️ API密钥配置需要在服务器端的.env文件中设置
            </p>
          </div>

          <div>
            <label className="label">币安API状态</label>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                realAccount ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span>{realAccount ? '已连接' : '未连接'}</span>
            </div>
          </div>

          <div>
            <label className="label">OpenAI API状态</label>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>需要在服务器配置</span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Management */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">风险管理默认值</h3>
        <div className="space-y-4">
          <p className="text-sm text-[#8b98a5]">
            这些是创建新策略时的默认值，可以在策略设置中单独修改。
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label">默认交易金额</label>
              <input type="number" className="input" defaultValue="100" disabled />
            </div>
            <div>
              <label className="label">最大仓位</label>
              <input type="number" className="input" defaultValue="1000" disabled />
            </div>
            <div>
              <label className="label">风险比例 (%)</label>
              <input type="number" className="input" defaultValue="2" disabled />
            </div>
            <div>
              <label className="label">止损 (%)</label>
              <input type="number" className="input" defaultValue="2" disabled />
            </div>
          </div>
        </div>
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
            <p className="font-medium">Development</p>
          </div>
          <div>
            <span className="text-[#8b98a5]">后端API</span>
            <p className="font-medium">http://localhost:5000</p>
          </div>
          <div>
            <span className="text-[#8b98a5]">状态</span>
            <p className="font-medium text-green-500">运行中</p>
          </div>
        </div>
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

