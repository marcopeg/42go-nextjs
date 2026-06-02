import {
  createRenderer,
  type BlocksMap,
  type WithContentBlockMargin,
  type WithContentBlockPadding,
} from "./render-component";

import { HeroBlock, type THeroBlock } from "./blocks/HeroBlock";
import { DemoBlock, type TDemoBlock } from "./blocks/DemoBlock";
import { MarkdownBlock, type TMarkdownBlock } from "./blocks/MarkdownBlock";
import { ComponentBlock, type TComponentBlock } from "./blocks/ComponentBlock";
import { LinkBlock, type TLinkBlock } from "./blocks/LinkBlock";
import { PricingBlock, type TPricingBlock } from "./blocks/PricingBlock";
import { WaitlistBlock, type TWaitlistBlock } from "./blocks/WaitlistBlock";
import { FeedbackBlock, type TFeedbackBlock } from "./blocks/FeedbackBlock";
import { CTABlock, type CTAConfig } from "./blocks/CTABlock";
import { StackBlock, type TStackBlock } from "./blocks/StackBlock";
import { ImageBlock, type TImageBlock } from "./blocks/ImageBlock";

type BaseContentBlockItem =
  | THeroBlock
  | TDemoBlock
  | TMarkdownBlock
  | TComponentBlock
  | TLinkBlock
  | TPricingBlock
  | TWaitlistBlock
  | TFeedbackBlock
  | CTAConfig
  | TStackBlock
  | TImageBlock; // stack itself has a type

export type ContentBlockItem = WithContentBlockMargin<
  WithContentBlockPadding<BaseContentBlockItem>
>;

export const blocksMap: BlocksMap = {} as BlocksMap;

const pageBlockRendererOptions = {
  defaultMargin: {
    top: "[8rem]",
    bottom: "0",
  },
};

// Build blocksMap after function definition to allow renderer injection into stack
Object.assign(blocksMap, {
  hero: HeroBlock as unknown,
  demo: DemoBlock as unknown,
  markdown: MarkdownBlock as unknown,
  component: ComponentBlock as unknown,
  link: LinkBlock as unknown,
  pricing: PricingBlock as unknown,
  waitlist: (({ data }: { data: TWaitlistBlock }) => (
    <WaitlistBlock {...data} />
  )) as unknown,
  feedback: (({ data }: { data: TFeedbackBlock }) => (
    <FeedbackBlock {...data} />
  )) as unknown,
  cta: (({ data }: { data: CTAConfig }) => <CTABlock {...data} />) as unknown,
  image: ImageBlock as unknown,
  // Stack: inject renderer lazily for recursion
  stack: (({ data }: { data: TStackBlock }) => {
    const renderer = createRenderer(blocksMap, pageBlockRendererOptions);
    return <StackBlock data={data} renderItem={renderer} />;
  }) as unknown,
} as BlocksMap);

export const ContentBlock = ({ items }: { items: ContentBlockItem[] }) => {
  const renderer = createRenderer(blocksMap, pageBlockRendererOptions);
  return items.map(renderer);
};
