import PublicLayout from "@/components/layouts/public";
import { getAppConfig } from "@/lib/config/app-config";

export default async function PublicRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getAppConfig();
  const LayoutComponent = config?.theme?.PublicLayout || PublicLayout;

  return <LayoutComponent config={config}>{children}</LayoutComponent>;
}
