type InjectAppNameProps = {
  name?: string | null;
};

export const InjectAppName = ({ name }: InjectAppNameProps) => (
  <>
    {name && name !== "default" && (
      <link rel="stylesheet" href={`/themes/${name}.css`} />
    )}
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__APP_NAME__ = ${JSON.stringify(name ?? null)};`,
      }}
    />
  </>
);
