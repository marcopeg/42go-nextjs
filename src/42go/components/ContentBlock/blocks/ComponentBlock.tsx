import {
  resolveContentBlockPaddingProps,
  type TContentBlockPadding,
} from "@/42go/components/ContentBlock/render-component";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface TComponentBlock<TProps = any> {
  type: "component";
  component: React.ComponentType<TProps>;
  props?: TProps;
  padding?: TContentBlockPadding;
}

export const ComponentBlock = ({ data }: { data: TComponentBlock }) => {
  const { component: Component, props = {}, padding } = data;
  const paddingProps = resolveContentBlockPaddingProps(padding);
  const component = <Component {...props} />;

  if (!paddingProps) return component;

  return (
    <div className={paddingProps.className} style={paddingProps.style}>
      {component}
    </div>
  );
};
