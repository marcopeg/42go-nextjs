type BookTagsProps = {
  tags: string[];
  className?: string;
};

export const BookTags = ({ tags, className = "" }: BookTagsProps) => {
  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
        >
          {tag}
        </span>
      ))}
    </div>
  );
};
