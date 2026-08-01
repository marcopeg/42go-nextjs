'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { QuickShareResourceDefinition } from '@/lib/quickshare/resource-catalog';
import { ChevronDown, FileCode2, FileText, Globe2, LoaderCircle, Plus } from 'lucide-react';
import { useState } from 'react';

type QuickShareCreateSplitButtonProps = {
  definitions: readonly QuickShareResourceDefinition[];
  disabled?: boolean;
  onCreate: (definition: QuickShareResourceDefinition) => Promise<void> | void;
};

const iconFor = (definition: QuickShareResourceDefinition) => {
  if (definition.id === 'web-page') return Globe2;
  if (definition.id === 'template') return FileCode2;
  return FileText;
};

export const QuickShareCreateSplitButton = ({
  definitions,
  disabled = false,
  onCreate,
}: QuickShareCreateSplitButtonProps) => {
  const [open, setOpen] = useState(false);

  const openChoices = () => {
    if (!disabled) setOpen(true);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div className="inline-flex h-10 overflow-hidden rounded-md bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/10">
        <Button
          type="button"
          size="default"
          disabled={disabled}
          className="h-10 rounded-none bg-transparent px-3.5 shadow-none hover:bg-primary-foreground/10 focus-visible:ring-primary-foreground/40"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={openChoices}
        >
          {disabled ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
          New Share
        </Button>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Choose a share type"
            className="inline-flex w-10 items-center justify-center border-l border-primary-foreground/25 bg-transparent text-primary-foreground transition-colors hover:bg-primary-foreground/10 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground/40 disabled:pointer-events-none disabled:opacity-50"
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80 p-1.5">
        <DropdownMenuLabel className="px-2.5 pb-2 pt-1 text-xs font-medium text-muted-foreground">
          Create a draft
        </DropdownMenuLabel>
        {definitions.map(definition => {
          const Icon = iconFor(definition);
          return (
            <DropdownMenuItem
              key={definition.choiceId}
              className="min-h-14 items-start gap-3 rounded-md px-2.5 py-2.5"
              onSelect={() => void onCreate(definition)}
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="min-w-0 whitespace-normal">
                <span className="block text-sm font-medium">{definition.label}</span>
                <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                  {definition.description}
                </span>
                {definition.template && (
                  <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">
                    Maintained template · v{definition.template.version}
                  </span>
                )}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
