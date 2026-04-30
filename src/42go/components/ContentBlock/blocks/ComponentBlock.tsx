// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface TComponentBlock<TProps = any> {
  type: "component";
  component: React.ComponentType<TProps>;
  props?: TProps;
}

export const ComponentBlock = ({ data }: { data: TComponentBlock }) => {
  const { component: Component, props = {} } = data;
  return <Component {...props} />;
};
