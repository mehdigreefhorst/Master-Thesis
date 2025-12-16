'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getExpiry } from '@/utils/jwt_utils';
import UserIcon from '@/components/icons/UserIcon';

export const Navbar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      const access_token = localStorage.getItem("access_token");
      const refresh_token = localStorage.getItem("refresh_token");

      const isAuth = (access_token && getExpiry(access_token) > new Date()) ||
                     (refresh_token && getExpiry(refresh_token) > new Date());

      setIsAuthenticated(!!isAuth);
    };

    checkAuth();

    // Re-check auth on route changes
    const interval = setInterval(checkAuth, 1000);
    return () => clearInterval(interval);
  }, [pathname]);

  return (
    <nav
      className="sticky top-0 z-50 border-b transition-all duration-300 animate-[navSlideDown_0.4s_ease-out]"
      style={{
        background: 'var(--card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <span
              className="text-xl font-bold tracking-tight transition-all duration-200 group-hover:scale-105"
              style={{ color: 'var(--primary)' }}
            >
              VibeResearch
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <Link
                  href="/overview"
                  className="nav-link text-sm font-medium transition-all duration-200 relative group pb-1"
                  style={{ color: pathname === '/overview' ? 'var(--primary)' : 'var(--secondary-foreground)' }}
                >
                  Overview
                  <span
                    className="absolute bottom-0 left-0 w-0 h-0.5 transition-all duration-200 group-hover:w-full"
                    style={{ background: 'var(--primary)' }}
                  />
                </Link>

                <Link
                  href="/account"
                  className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 hover:scale-110 hover:animate-[userIconPulse_0.6s_ease-out]"
                  style={{
                    background: 'var(--secondary)',
                    color: 'var(--secondary-foreground)'
                  }}
                  aria-label="Account"
                >
                  <UserIcon />
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium rounded transition-all duration-200 hover:scale-105 hover:shadow-[var(--shadow)]"
                style={{
                  background: 'var(--secondary)',
                  color: 'var(--secondary-foreground)'
                }}
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
