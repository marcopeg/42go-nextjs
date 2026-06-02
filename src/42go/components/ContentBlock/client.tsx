"use client";

import {
  createRenderer,
  type BlocksMap,
  type WithContentBlockMargin,
  type WithContentBlockPadding,
} from "./render-component";

import { ComponentBlock, type TComponentBlock } from "./blocks/ComponentBlock";
import { LinkBlock, type TLinkBlock } from "./blocks/LinkBlock";

export type ContentBlockItem = WithContentBlockMargin<
  WithContentBlockPadding<TLinkBlock | TComponentBlock>
>;

const blocksMap: BlocksMap = {
  component: ComponentBlock,
  link: LinkBlock,
} as BlocksMap;

export const ContentBlock = ({ items }: { items: ContentBlockItem[] }) => {
  const renderer = createRenderer(blocksMap);
  return items.map(renderer);
};
