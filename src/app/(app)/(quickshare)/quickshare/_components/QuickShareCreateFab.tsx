'use client';

import { ExpandableFab } from '@/components/ui/expandable-fab';
import { getQuickShareResourceIcon } from '@/app/(app)/(quickshare)/quickshare/_components/quickshare-resource-icon';
import type { QuickShareResourceDefinition } from '@/lib/quickshare/resource-catalog';
import { Plus } from 'lucide-react';

type QuickShareCreateFabProps = {
  definitions: readonly QuickShareResourceDefinition[];
  disabled?: boolean;
  onCreate: (definition: QuickShareResourceDefinition) => Promise<void> | void;
};

export const QuickShareCreateFab = ({
  definitions,
  disabled = false,
  onCreate,
}: QuickShareCreateFabProps) => (
  <div
    role="region"
    aria-label="Create a share"
    className="fixed right-[calc(env(safe-area-inset-right)+1.25rem)] bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-40 md:right-6 md:bottom-6"
  >
    <ExpandableFab
      label="Create a new share"
      title="New Share"
      icon={<Plus aria-hidden="true" className="size-6" />}
      disabled={disabled}
      placement="top-end"
      actions={definitions.map(definition => {
        const Icon = getQuickShareResourceIcon(definition);
        return {
          id: definition.choiceId,
          label: definition.label,
          icon: <Icon aria-hidden="true" className="size-4 text-primary" />,
          onSelect: () => void onCreate(definition),
        };
      })}
    />
  </div>
);
