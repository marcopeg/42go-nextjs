import { createRenderer, type BlocksMap } from "./render-component";

import { HeroBlock, type THeroBlock } from "./blocks/HeroBlock";
import { DemoBlock, type TDemoBlock } from "./blocks/DemoBlock";
import { MarkdownBlock, type TMarkdownBlock } from "./blocks/MarkdownBlock";
import { ComponentBlock, type TComponentBlock } from "./blocks/ComponentBlock";
import { LinkBlock, type TLinkBlock } from "./blocks/LinkBlock";
import { PricingBlock, type TPricingBlock } from "./blocks/PricingBlock";
import { WaitlistBlock, type TWaitlistBlock } from "./blocks/WaitlistBlock";
import { FeedbackBlock, type TFeedbackBlock } from "./blocks/FeedbackBlock";

export type ContentBlockItem =
  | THeroBlock
  | TDemoBlock
  | TMarkdownBlock
  | TComponentBlock
  | TLinkBlock
  | TPricingBlock
  | TWaitlistBlock
  | TFeedbackBlock;

const blocksMap: BlocksMap = {
  hero: HeroBlock,
  demo: DemoBlock,
  markdown: MarkdownBlock,
  component: ComponentBlock,
  link: LinkBlock,
  pricing: PricingBlock,
  waitlist: ({ data }: { data: TWaitlistBlock }) => <WaitlistBlock {...data} />,
  feedback: ({ data }: { data: TFeedbackBlock }) => <FeedbackBlock {...data} />,
} as BlocksMap;

export const ContentBlock = ({ items }: { items: ContentBlockItem[] }) => {
  const renderer = createRenderer(blocksMap);
  return items.map(renderer);
};
