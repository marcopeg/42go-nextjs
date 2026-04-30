import { ReactNode } from "react";

type App1PublicLayoutProps = {
  children: ReactNode;
};

/**
 * Custom Public Layout for App1
 * Features a narrow centered column design for focused content presentation
 */
export const App1PublicLayout = ({ children }: App1PublicLayoutProps) => (
  <div className="min-h-screen bg-background">
    {/* Main content in narrow centered column */}
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <div className="space-y-6">
        {/* App1 specific header */}
        <div className="text-center border-b border-border pb-4">
          <h1 className="text-2xl font-bold text-foreground">
            App1 - Narrow Layout
          </h1>
          <p className="text-muted-foreground mt-2">
            Focused content in a clean, centered column
          </p>
        </div>

        {/* Page content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {children}
        </div>
      </div>
    </main>

    {/* Footer */}
    <footer className="border-t border-border mt-16 py-8">
      <div className="container mx-auto max-w-2xl px-4 text-center text-sm text-muted-foreground">
        <p>App1 Custom Layout - Powered by Chuck Norris precision 🥋</p>
      </div>
    </footer>
  </div>
);

export default App1PublicLayout;
