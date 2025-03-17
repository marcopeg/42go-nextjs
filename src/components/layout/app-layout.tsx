'use client';

import { useState, useEffect } from 'react';
import { SidebarMenu } from './sidebar-menu';
import { MobileNavToggle } from './mobile-nav-toggle';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full transition-all duration-300 ease-in-out hidden md:block 
                    ${isSidebarCollapsed ? 'w-16' : 'w-64'}`}
      >
        <SidebarMenu
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </aside>

      {/* Mobile Sidebar - Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar - Content */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 transition-transform duration-300 ease-in-out md:hidden 
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarMenu
          isCollapsed={false}
          toggleCollapse={() => {}}
          closeMobileMenu={() => setIsMobileMenuOpen(false)}
        />
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ease-in-out overflow-auto px-6 py-6
                      ${isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}
      >
        {/* Mobile Header with Menu Toggle */}
        <div className="flex justify-end md:hidden mb-4">
          <MobileNavToggle
            isOpen={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        </div>

        {/* Page Content */}
        <div className="container mx-auto px-0">{children}</div>
      </main>
    </div>
  );
}
