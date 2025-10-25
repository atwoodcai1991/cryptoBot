import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  DocumentTextIcon,
  Cog6ToothIcon 
} from '@heroicons/react/24/outline';

const navigation = [
  { name: '仪表盘', href: '/', icon: HomeIcon },
  { name: '策略管理', href: '/strategies', icon: ChartBarIcon },
  { name: '实时交易', href: '/trading', icon: CurrencyDollarIcon },
  { name: '回测', href: '/backtest', icon: ClockIcon },
  { name: '订单记录', href: '/orders', icon: DocumentTextIcon },
  { name: '设置', href: '/settings', icon: Cog6ToothIcon },
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#0f1419]">
      {/* Sidebar */}
      <div className="w-64 bg-[#16181c] border-r border-[#2f3336]">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6">
            <h1 className="text-2xl font-bold text-[#1d9bf0]">CryptoBot</h1>
            <p className="text-sm text-[#8b98a5] mt-1">AI Trading Platform</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center px-3 py-3 mb-1 rounded-lg text-sm font-medium
                    transition-colors
                    ${isActive
                      ? 'bg-[#1d9bf0] text-white'
                      : 'text-[#e7e9ea] hover:bg-[#1a1f26]'
                    }
                  `}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-[#2f3336]">
            <div className="text-xs text-[#8b98a5]">
              <div className="flex items-center justify-between mb-2">
                <span>状态</span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  在线
                </span>
              </div>
              <div className="text-[#5b6570]">v1.0.0</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#16181c] border-b border-[#2f3336] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#e7e9ea]">
              {navigation.find(item => item.href === location.pathname)?.name || '仪表盘'}
            </h2>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-[#8b98a5]">
                {new Date().toLocaleString('zh-CN')}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

