interface UnknownBlockProps {
  component: { type: string; [key: string]: unknown };
}

export const UnknownBlock = ({ component }: UnknownBlockProps) => {
  return (
    <div className="unknown-component p-4 border border-destructive rounded-md">
      <p className="text-destructive mb-3">
        Unsupported block type <i>{component.type}</i> in client component
      </p>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Show configuration details
        </summary>
        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
          {JSON.stringify(component, null, 2)}
        </pre>
      </details>
    </div>
  );
};
