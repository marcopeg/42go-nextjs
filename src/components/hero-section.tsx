import { Button } from '@/components/ui/button';
import { ScrollAnimation } from '@/components/scroll-animation';

export function HeroSection() {
  return (
    <section className="w-full py-20 md:py-32 flex flex-col items-center justify-center text-center">
      <ScrollAnimation type="fade" delay={0.1}>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 max-w-4xl">
          Build Your SaaS <span className="text-accent">Faster</span> With Our Modern Boilerplate
        </h1>
      </ScrollAnimation>

      <ScrollAnimation type="fade" delay={0.2}>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
          Everything you need to launch your next web application. Authentication, UI components,
          and database integration — all pre-configured and ready to go.
        </p>
      </ScrollAnimation>

      <ScrollAnimation type="scale" delay={0.3} whileHover whileTap>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
            Get Started
          </Button>
          <Button size="lg" variant="outline">
            View Documentation
          </Button>
        </div>
      </ScrollAnimation>

      <ScrollAnimation type="fade" delay={0.4}>
        <div className="mt-12 text-sm text-muted-foreground">
          <p>Trusted by developers at companies worldwide</p>
          <div className="flex flex-wrap justify-center gap-8 mt-4 opacity-70">
            {/* Company logos would go here - using placeholder text for now */}
            <div className="font-semibold">Company 1</div>
            <div className="font-semibold">Company 2</div>
            <div className="font-semibold">Company 3</div>
            <div className="font-semibold">Company 4</div>
          </div>
        </div>
      </ScrollAnimation>
    </section>
  );
}
