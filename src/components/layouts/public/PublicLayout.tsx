import { Header } from "./Header";
import { Footer } from "./Footer";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 w-full flex justify-center">
        <div className="w-full max-w-4xl px-4 sm:px-6">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
