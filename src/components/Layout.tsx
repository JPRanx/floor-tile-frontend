import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './LanguageToggle';
import { useAuthStore } from '../state/authStore';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', labelKey: 'nav.horizon' },
  { path: '/plan', labelKey: 'nav.plan' },
  { path: '/dashboard', labelKey: 'nav.inventory' },
  { path: '/customers', labelKey: 'nav.customers' },
  { path: '/data-hub', labelKey: 'nav.dataHub' },
  { path: '/products', labelKey: 'nav.products' },
  { path: '/users', labelKey: 'nav.users' },
];

export function Layout({ children }: LayoutProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const signOut = useAuthStore((s) => s.signOut);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  // Dark theme for Dashboard, Intelligence, and Products pages
  const isDarkPage = ['/', '/dashboard', '/intelligence', '/products', '/config', '/horizon', '/horizon/boat', '/customers', '/data-hub', '/users', '/plan'].includes(location.pathname);

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  // Get nav link classes based on theme and active state
  const getNavLinkClasses = (isActive: boolean) => {
    if (isDarkPage) {
      return isActive
        ? 'bg-slate-800 text-white'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white';
    }
    return isActive
      ? 'bg-blue-100 text-blue-700'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';
  };

  return (
    <div className={`min-h-screen ${isDarkPage ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`shadow-sm border-b ${
        isDarkPage
          ? 'bg-slate-900 border-slate-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <span className={`text-xl font-bold ${isDarkPage ? 'text-white' : 'text-gray-900'}`}>
                {t('nav.appName')}
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-4">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                  || (item.path === '/' && ['/horizon', '/horizon/boat'].includes(location.pathname));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${getNavLinkClasses(isActive)}`}
                  >
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>

            {/* Language Toggle + Logout (Desktop) */}
            <div className="hidden md:flex items-center gap-3">
              <LanguageToggle />
              <button
                type="button"
                onClick={handleSignOut}
                className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                  isDarkPage
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {t('nav.signOut')}
              </button>
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className={`md:hidden inline-flex items-center justify-center p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                isDarkPage
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                // X icon (close)
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                // Hamburger icon
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden border-t ${isDarkPage ? 'border-slate-700' : 'border-gray-200'}`}>
            <nav className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                  || (item.path === '/' && ['/horizon', '/horizon/boat'].includes(location.pathname));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleNavClick}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${getNavLinkClasses(isActive)}`}
                  >
                    {t(item.labelKey)}
                  </Link>
                );
              })}
              {/* Language Toggle (Mobile) */}
              <div className="px-3 py-2">
                <LanguageToggle />
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                  isDarkPage
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {t('nav.signOut')}
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className={isDarkPage ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}>
        {children}
      </main>
    </div>
  );
}
