type InjectAppIDProps = {
  id?: string | null;
};

export const InjectAppID = ({ id }: InjectAppIDProps) => (
  <>
    {id && id !== "default" && (
      <link rel="stylesheet" href={`/themes/${id}.css`} />
    )}
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__APP_ID__ = ${JSON.stringify(id ?? null)};`,
      }}
    />
  </>
);
