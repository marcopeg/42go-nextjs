import type { TAppID } from "@/AppConfig";
import { resolveAppThemeStylesheet } from "@/42go/app-themes";

type InjectAppIDProps = {
  id?: TAppID;
};

export const InjectAppID = ({ id }: InjectAppIDProps) => {
  const stylesheet = resolveAppThemeStylesheet(id ?? null);

  return (
    <>
      <link rel="stylesheet" href={stylesheet.defaultHref} />
      {stylesheet.appHref && (
        <link rel="stylesheet" href={stylesheet.appHref} />
      )}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__APP_ID__ = ${JSON.stringify(id ?? null)};`,
        }}
      />
    </>
  );
};
