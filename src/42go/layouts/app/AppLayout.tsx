"use client";

import { useState, useEffect } from "react";
import { AppLayoutProps } from "./types";
import { ProtectComponent } from "@/42go/policy/client";
import { SidebarMenu } from "./SidebarMenu";
import { MobileBottomNav } from "./MobileBottomNav";
import { Toolbar } from "./Toolbar";
import { useAppConfig } from "@/42go/config/use-app-config";

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
  icon,
  actions,
  stickyHeader = true,
  backBtn,
  policy,
  renderOnLoading,
  renderOnError,
  footer,
  hideMobileMenu,
  disablePadding = false,
}: AppLayoutProps) => {
  const config = useAppConfig();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    getSideMenuState()
  );
  const hasFooter = !!footer;

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
        className={`fixed top-0 left-0 z-50 h-full transition-all duration-300 ease-in-out hidden md:block ${
          isSidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        <SidebarMenu
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          collapsePosition={
            config?.app?.menu?.collapsible?.position === "top"
              ? "top"
              : "bottom"
          }
        />
      </aside>

      {/* Header - Full Width */}
      <header
        className={`w-full bg-background border-b transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
        } ${stickyHeader ? "sticky top-0 z-30" : ""}`}
      >
        <Toolbar
          title={title}
          subtitle={subtitle}
          icon={icon}
          actions={actions}
          backBtn={backBtn}
        />
      </header>

      {/* Main Content */}
      <main
        className={`min-h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        {/* Page Content */}
        <div
          className={`h-full flex flex-col ${(() => {
            // Base paddings for left/right and top
            const base = disablePadding ? [] : ["px-6", "pt-6"];
            // Bottom padding: always ensure content isn't hidden by footer
            let pbMobile = "";
            let pbDesktop = "";
            if (hasFooter) {
              // Footer height: h-16 (4rem). If mobile bottom nav exists, add both.
              pbMobile = hideMobileMenu ? "pb-16" : "pb-32";
              pbDesktop = "md:pb-16";
            } else {
              // Legacy behavior when no footer
              if (!disablePadding) {
                pbMobile = !hideMobileMenu ? "pb-20" : "pb-6";
                pbDesktop = "md:pb-6";
              }
            }
            return `${base.join(" ")} ${pbMobile} ${pbDesktop}`.trim();
          })()}`}
        >
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
      {!hideMobileMenu && (
        <MobileBottomNav onMoreClick={() => setIsMobileMenuOpen(true)} />
      )}

      {/* Mobile Sidebar - Overlay */}
      {!hideMobileMenu && isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar - Content */}
      {!hideMobileMenu && isMobileMenuOpen && (
        <aside
          className="fixed top-0 right-0 z-[60] h-full w-4/5 transition-transform duration-300 ease-in-out md:hidden"
        >
          <SidebarMenu
            isCollapsed={false}
            toggleCollapse={() => {}}
            closeMobileMenu={() => setIsMobileMenuOpen(false)}
            collapsePosition={
              config?.app?.menu?.collapsible?.position === "top"
                ? "top"
                : "bottom"
            }
          />
        </aside>
      )}

      {/* Sticky Footer (matches top bar style) */}
      {footer && (
        <footer
          className={`fixed ${
            hideMobileMenu ? "bottom-0" : "bottom-16 md:bottom-0"
          } right-0 bg-background border-t h-16 flex items-center z-30 transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? "left-0 md:left-20" : "left-0 md:left-64"
          }`}
        >
          <div className="w-full px-6">{footer}</div>
        </footer>
      )}
    </div>
  );
};
