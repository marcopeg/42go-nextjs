// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ComponentBlock<TProps = any> {
  type: "component";
  component: React.ComponentType<TProps>;
  props?: TProps;
}

interface ComponentBlockProps {
  data: ComponentBlock;
}

export const ComponentBlock = ({ data }: ComponentBlockProps) => {
  const { component: Component, props = {} } = data;
  return <Component {...props} />;
};
