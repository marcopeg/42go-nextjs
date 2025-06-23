import { getAppName } from "@/lib/config/app-config";

const InjectAppName = async () => {
  const appName = await getAppName();
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__APP_NAME__ = ${JSON.stringify(appName)};`,
      }}
    />
  );
};

export default InjectAppName;
