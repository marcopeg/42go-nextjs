import { createRenderer, type BlocksMap } from "./render-component";

import { HeroBlock, type THeroBlock } from "./blocks/HeroBlock";
import { DemoBlock, type TDemoBlock } from "./blocks/DemoBlock";
import { MarkdownBlock, type TMarkdownBlock } from "./blocks/MarkdownBlock";
import { ComponentBlock, type TComponentBlock } from "./blocks/ComponentBlock";
import { LinkBlock, type TLinkBlock } from "./blocks/LinkBlock";

export type ContentBlockItem =
  | THeroBlock
  | TDemoBlock
  | TMarkdownBlock
  | TComponentBlock
  | TLinkBlock;

const blocksMap: BlocksMap = {
  hero: HeroBlock,
  demo: DemoBlock,
  markdown: MarkdownBlock,
  component: ComponentBlock,
  link: LinkBlock,
} as BlocksMap;

export const ContentBlock = ({ items }: { items: ContentBlockItem[] }) => {
  const renderer = createRenderer(blocksMap);
  return items.map(renderer);
};
