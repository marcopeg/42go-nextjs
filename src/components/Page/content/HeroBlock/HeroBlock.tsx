export interface HeroBlock {
  type: "hero";
  title: string;
  subtitle?: string;
  backgroundImage?: string;
}

interface HeroBlockProps {
  data: HeroBlock;
}

export default function HeroBlock({ data }: HeroBlockProps) {
  const { title, subtitle, backgroundImage } = data;

  return (
    <div
      className="hero-block relative bg-gradient-to-r from-primary/10 to-secondary/10 py-16 px-6 text-center rounded-lg"
      style={
        backgroundImage
          ? { backgroundImage: `url(${backgroundImage})` }
          : undefined
      }
    >
      {backgroundImage && (
        <div className="absolute inset-0 bg-black/50 rounded-lg" />
      )}

      <div className="relative z-10">
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
          {title}
        </h1>

        {subtitle && (
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
