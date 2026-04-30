import React from "react";
import { UnknownBlock } from "./UnknownBlock";

/**
 * Type definition for blocks map
 */
export type BlocksMap = Record<string, React.ComponentType<{ data: unknown }>>;

/**
 * Factory function that creates a renderer with a specific blocks map
 */
export function createRenderer<T extends { type: string }>(blocks: BlocksMap) {
  return function renderComponent(component: T, index: number) {
    const BlockComponent = blocks[component.type];

    if (BlockComponent) {
      return React.createElement(BlockComponent, {
        key: index,
        data: component,
      });
    }

    return React.createElement(UnknownBlock, {
      key: index,
      component: component as { type: string; [key: string]: unknown },
    });
  };
}
