export interface TextBlock {
  type: "text";
  content: string;
}

interface TextBlockProps {
  data: TextBlock;
}

export default function TextBlock({ data }: TextBlockProps) {
  return (
    <div className="text-block">
      <p className="text-foreground">{data.content}</p>
    </div>
  );
}
