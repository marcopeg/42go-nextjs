import ContentBlock, {
  type ContentBlock as ContentBlockItem,
} from "@/42go/components/ContentBlock";

interface HeaderLinksProps {
  links?: ContentBlockItem[];
}

export function HeaderLinks({ links }: HeaderLinksProps) {
  if (!links || links.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <ContentBlock items={links} />
    </div>
  );
}
