"use client";

import { createRenderer, type BlocksMap } from "./render-component";

import { ComponentBlock, type TComponentBlock } from "./blocks/ComponentBlock";
import { LinkBlock, type TLinkBlock } from "./blocks/LinkBlock";

export type ContentBlockItem = TLinkBlock | TComponentBlock;

const blocksMap: BlocksMap = {
  component: ComponentBlock,
  link: LinkBlock,
} as BlocksMap;

export const ContentBlock = ({ items }: { items: ContentBlockItem[] }) => {
  const renderer = createRenderer(blocksMap);
  return items.map(renderer);
};
