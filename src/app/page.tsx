import { ThemeToggle } from '@/components/theme-toggle';
import { AccentColorPicker } from '@/components/accent-color-picker';
import { PageTransition } from '@/components/page-transition';
import { UIAnimation } from '@/components/ui-animation';
import { FeatureShowcase } from '@/components/landing/feature-showcase';
import { PricingWall } from '@/components/landing/pricing-wall';
import { HeroSection } from '@/components/landing/hero-section';
import { AdoptersTestimonials } from '@/components/adopters-testimonials';
import { FeedbackForm } from '@/components/landing/feedback-form';
import appConfig from '../../app.config';

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
        {appConfig.landing?.hero && (
          <div className="w-full max-w-7xl px-4 pt-24">
            <HeroSection />
          </div>
        )}

        {/* Feature Showcase Section */}
        {appConfig.landing?.features && (
          <div className="w-full max-w-7xl px-4">
            <FeatureShowcase />
          </div>
        )}

        {/* Pricing Wall Section */}
        {appConfig.landing?.pricing && (
          <div className="w-full max-w-7xl px-4 bg-muted/50">
            <PricingWall />
          </div>
        )}

        {/* Adopters and Testimonials Section */}
        {appConfig.landing?.testimonials && (
          <div className="w-full max-w-7xl px-4">
            <AdoptersTestimonials />
          </div>
        )}

        {/* Feedback Form Section */}
        {appConfig.landing?.feedback && (
          <div className="w-full max-w-7xl px-4 bg-muted/30 mb-16">
            <FeedbackForm />
          </div>
        )}
      </main>
    </PageTransition>
  );
}
