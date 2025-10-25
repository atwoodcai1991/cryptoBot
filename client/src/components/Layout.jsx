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
    <div className="layout-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-inner">
          {/* Logo */}
          <div className="sidebar-logo">
            <div className="sidebar-logo-inner">
              <div className="sidebar-logo-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="sidebar-logo-text">
                <h1>CryptoBot</h1>
                <p>AI Trading Platform</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="sidebar-nav">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`sidebar-nav-link ${isActive ? 'sidebar-nav-link-active' : 'sidebar-nav-link-inactive'}`}
                >
                  <Icon className={`sidebar-nav-icon ${!isActive ? 'sidebar-nav-icon-inactive' : ''}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="sidebar-footer">
            <div className="sidebar-footer-card">
              <div className="sidebar-footer-status">
                <span className="sidebar-footer-status-label">系统状态</span>
                <div className="sidebar-footer-status-value">
                  <div className="sidebar-footer-status-indicator">
                    <span className="sidebar-footer-status-dot"></span>
                    <span className="sidebar-footer-status-ping"></span>
                  </div>
                  <span className="sidebar-footer-status-text">在线</span>
                </div>
              </div>
              <div className="sidebar-footer-version">
                <span className="sidebar-footer-version-label">版本</span>
                <span className="sidebar-footer-version-value">v1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        {/* Header */}
        <header className="main-header">
          <div className="main-header-inner">
            <div className="main-header-content">
              {/* Left section - Page title with icon */}
              <div className="main-header-left">
                <div className="main-header-icon">
                  {navigation.find(item => item.href === location.pathname)?.icon && (
                    <div className="main-header-icon-inner">
                      {(() => {
                        const Icon = navigation.find(item => item.href === location.pathname)?.icon;
                        return Icon ? <Icon /> : null;
                      })()}
                    </div>
                  )}
                </div>
                <div className="main-header-text">
                  <h2>
                    {navigation.find(item => item.href === location.pathname)?.name || '仪表盘'}
                  </h2>
                  <p>实时监控和管理您的交易策略</p>
                </div>
              </div>

              {/* Right section - Status and info */}
              <div className="main-header-right">
                {/* System Status */}
                <div className="header-status-card">
                  <div className="header-status-indicator">
                    <span className="header-status-dot"></span>
                    <span className="header-status-ping"></span>
                  </div>
                  <span className="header-status-text">系统在线</span>
                </div>

                {/* Server Status */}
                <div className="header-server-card">
                  <svg className="header-server-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                  <span className="header-server-text">已连接</span>
                </div>

                {/* Current time */}
                <div className="header-time-card">
                  <span className="header-time-value">
                    {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="header-time-date">
                    {new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="main-page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
