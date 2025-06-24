type InjectAppNameProps = {
  name?: string | null;
};

export const InjectAppName = ({ name }: InjectAppNameProps) => (
  <script
    dangerouslySetInnerHTML={{
      __html: `window.__APP_NAME__ = ${JSON.stringify(name ?? null)};`,
    }}
  />
);
