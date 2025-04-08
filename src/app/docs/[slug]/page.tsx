interface DocsPageProps {
  params: {
    slug: string;
  };
}

export default function DocsPage({ params }: DocsPageProps) {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Documentation</h1>
      <p className="text-lg">test: {params.slug}</p>
    </div>
  );
}
