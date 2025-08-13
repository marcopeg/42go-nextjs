"use client";

import { useState, useEffect } from "react";
import { AppLayoutProps } from "./types";
import { ProtectComponent } from "@/42go/policy/client";
import { SidebarMenu } from "./SidebarMenu";
import { MobileBottomNav } from "./MobileBottomNav";
import { Toolbar } from "./Toolbar";

const getSideMenuState = () => {
  try {
    const storedCollapsedState = localStorage.getItem("sidebarCollapsed");
    return storedCollapsedState === "true";
  } catch {
    return false;
  }
};

export const AppLayout = ({
  children,
  title,
  subtitle,
  actions,
  stickyHeader = true,
  policy,
  renderOnLoading,
  renderOnError,
}: AppLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    getSideMenuState()
  );

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  // Close mobile menu on larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full transition-all duration-300 ease-in-out hidden md:block ${
          isSidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        <SidebarMenu
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </aside>

      {/* Header - Full Width */}
      <header
        className={`w-full bg-background border-b transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
        } ${stickyHeader ? "sticky top-0 z-30" : ""}`}
      >
        <Toolbar title={title} subtitle={subtitle} actions={actions} />
      </header>

      {/* Main Content */}
      <main
        className={`min-h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        {/* Page Content */}
        <div className="h-full flex flex-col p-6 pb-20 md:pb-6">
          {policy ? (
            <ProtectComponent
              policy={policy}
              renderOnLoading={renderOnLoading}
              renderOnError={renderOnError}
            >
              {children}
            </ProtectComponent>
          ) : (
            children
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onMoreClick={() => setIsMobileMenuOpen(true)} />

      {/* Mobile Sidebar - Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar - Content */}
      <aside
        className={`fixed top-0 right-0 z-[60] h-full w-4/5 transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <SidebarMenu
          isCollapsed={false}
          toggleCollapse={() => {}}
          closeMobileMenu={() => setIsMobileMenuOpen(false)}
        />
      </aside>
    </div>
  );
};
