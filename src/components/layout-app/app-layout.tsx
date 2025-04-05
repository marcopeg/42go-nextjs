'use client';

import { useState, useEffect } from 'react';
import { SidebarMenu } from './sidebar-menu';
import { Home, Settings, Menu } from 'lucide-react';
import Link from 'next/link';
import appConfig from '@/lib/config';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    // Only run on client-side
    if (typeof window !== 'undefined') {
      const storedCollapsedState = localStorage.getItem('sidebarCollapsed');
      if (storedCollapsedState !== null) {
        setIsSidebarCollapsed(storedCollapsedState === 'true');
      }
      setIsLoaded(true);
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    // Only run on client-side
    if (typeof window !== 'undefined' && isLoaded) {
      localStorage.setItem('sidebarCollapsed', isSidebarCollapsed.toString());
    }
  }, [isSidebarCollapsed, isLoaded]);

  // Close mobile menu on larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  // Get mobile menu width from config or default to 80%
  const mobileMenuWidth = appConfig.app?.mobile?.menu?.width || '80%';

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full transition-all duration-300 ease-in-out hidden md:block 
                    ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}
      >
        <SidebarMenu
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ease-in-out min-h-screen px-6
                      ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}
      >
        {/* Page Content */}
        <div className="container mx-auto px-0 h-full flex flex-col">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border h-16 flex items-center justify-around z-40 md:hidden">
        <Link href="/dashboard" className="flex flex-col items-center justify-center w-1/3 h-full">
          <Home className="h-5 w-5" />
          <span className="text-xs mt-1">Dashboard</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center justify-center w-1/3 h-full">
          <Settings className="h-5 w-5" />
          <span className="text-xs mt-1">Settings</span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex flex-col items-center justify-center w-1/3 h-full"
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs mt-1">Menu</span>
        </button>
      </div>

      {/* Mobile Sidebar - Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar - Content */}
      <aside
        className={`fixed top-0 left-0 z-[60] h-full transition-transform duration-300 ease-in-out md:hidden 
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: mobileMenuWidth }}
      >
        <SidebarMenu
          isCollapsed={false}
          toggleCollapse={() => {}}
          closeMobileMenu={() => setIsMobileMenuOpen(false)}
        />
      </aside>
    </div>
  );
}
