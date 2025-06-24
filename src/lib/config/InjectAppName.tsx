type InjectAppNameProps = {
  name: string;
};

export const InjectAppName = ({ name }: InjectAppNameProps) => (
  <script
    dangerouslySetInnerHTML={{
      __html: `window.__APP_NAME__ = ${JSON.stringify(name)};`,
    }}
  />
);
