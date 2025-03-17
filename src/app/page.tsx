import { ThemeToggle } from '@/components/theme-toggle';
import { AccentColorPicker } from '@/components/accent-color-picker';
import { PageTransition } from '@/components/page-transition';
import { UIAnimation } from '@/components/ui-animation';
import { FeatureShowcase } from '@/components/feature-showcase';
import { PricingWall } from '@/components/pricing-wall';
import { HeroSection } from '@/components/hero-section';
import { AdoptersTestimonials } from '@/components/adopters-testimonials';
import { FeedbackForm } from '@/components/feedback-form';

export default function Home() {
  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col items-center">
        <div className="absolute top-4 right-4 flex gap-2">
          <UIAnimation type="fade" delay={0.3}>
            <AccentColorPicker />
          </UIAnimation>
          <UIAnimation type="fade" delay={0.4}>
            <ThemeToggle />
          </UIAnimation>
        </div>

        {/* Hero Section */}
        <div className="w-full max-w-7xl px-4 pt-24">
          <HeroSection />
        </div>

        {/* Feature Showcase Section */}
        <div className="w-full max-w-7xl px-4">
          <FeatureShowcase />
        </div>

        {/* Pricing Wall Section */}
        <div className="w-full max-w-7xl px-4 bg-muted/50">
          <PricingWall />
        </div>

        {/* Adopters and Testimonials Section */}
        <div className="w-full max-w-7xl px-4">
          <AdoptersTestimonials />
        </div>

        {/* Feedback Form Section */}
        <div className="w-full max-w-7xl px-4 bg-muted/30 mb-16">
          <FeedbackForm />
        </div>
      </main>
    </PageTransition>
  );
}
