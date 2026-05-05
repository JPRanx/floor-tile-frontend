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

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  const isActivePath = (path: string) =>
    location.pathname === path
    || (path === '/' && ['/horizon', '/horizon/boat'].includes(location.pathname));

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      {/* Header — editorial top bar matching Horizon / Plan */}
      <header
        style={{
          backgroundColor: 'var(--color-bg-base)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-14">
            {/* Logo — tracked uppercase, restrained */}
            <Link
              to="/"
              className="text-xs font-medium tracking-[0.2em] uppercase transition-colors"
              style={{ color: 'var(--color-text-primary)' }}
              translate="no"
            >
              {t('nav.appName')}
            </Link>

            {/* Desktop Navigation — small caps, no pills */}
            <nav className="hidden md:flex items-center gap-7">
              {navItems.map((item) => {
                const active = isActivePath(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="relative text-[11px] tracking-widest uppercase transition-colors py-3"
                    style={{
                      color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      if (!active) (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-muted)';
                    }}
                  >
                    {t(item.labelKey)}
                    {active && (
                      <span
                        className="absolute left-0 right-0 -bottom-px h-px"
                        style={{ backgroundColor: 'var(--color-accent)' }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Trailing controls — Desktop */}
            <div className="hidden md:flex items-center gap-4">
              <LanguageToggle />
              <button
                type="button"
                onClick={handleSignOut}
                className="text-[11px] tracking-widest uppercase transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)'; }}
              >
                {t('nav.signOut')}
              </button>
            </div>

            {/* Mobile Hamburger */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2 focus:outline-none"
              style={{ color: 'var(--color-text-secondary)' }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div
            className="md:hidden"
            style={{ borderTop: '1px solid var(--color-border-subtle)' }}
          >
            <nav className="px-6 py-3 space-y-1">
              {navItems.map((item) => {
                const active = isActivePath(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleNavClick}
                    className="block px-2 py-2 text-[11px] tracking-widest uppercase transition-colors"
                    style={{ color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                  >
                    {t(item.labelKey)}
                  </Link>
                );
              })}
              <div className="px-2 py-2 flex items-center justify-between">
                <LanguageToggle />
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-[11px] tracking-widest uppercase"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {t('nav.signOut')}
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main>{children}</main>
    </div>
  );
}
