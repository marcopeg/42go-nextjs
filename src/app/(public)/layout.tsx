import PublicLayout from "@/42go/layouts/public";
import { getAppConfig } from "@/42go/config/app-config";

export default async function PublicRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getAppConfig();
  const LayoutComponent = config?.theme?.PublicLayout || PublicLayout;

  return <LayoutComponent config={config}>{children}</LayoutComponent>;
}
