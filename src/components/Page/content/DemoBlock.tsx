import { Button } from "@/components/ui/button";
import OriginDisplay from "@/components/OriginDisplay";

export interface DemoBlock {
  type: "demo";
  title?: string;
  description?: string;
}

interface DemoBlockProps {
  data: DemoBlock;
}

export default function DemoBlock({ data }: DemoBlockProps) {
  return (
    <div className="demo-block w-full space-y-8 p-6">
      {data.title && (
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{data.title}</h1>
          {data.description && (
            <p className="text-lg text-muted-foreground">{data.description}</p>
          )}
        </div>
      )}

      {/* Button Variants Section */}
      <section className="w-full">
        <h2 className="text-2xl font-bold mb-4">Button Variants</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Default</h3>
            <Button variant="default">Default Button</Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Destructive</h3>
            <Button variant="destructive">Destructive Button</Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Outline</h3>
            <Button variant="outline">Outline Button</Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Secondary</h3>
            <Button variant="secondary">Secondary Button</Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Ghost</h3>
            <Button variant="ghost">Ghost Button</Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Link</h3>
            <Button variant="link">Link Button</Button>
          </div>
        </div>
      </section>

      {/* Button Sizes Section */}
      <section className="w-full">
        <h2 className="text-2xl font-bold mb-4">Button Sizes</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
          <div className="space-y-2">
            <h3 className="font-semibold">Small</h3>
            <Button size="sm">Small Button</Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Default</h3>
            <Button size="default">Default Size</Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Large</h3>
            <Button size="lg">Large Button</Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Icon</h3>
            <Button size="icon">🥋</Button>
          </div>
        </div>
      </section>

      {/* Combined Variants and Sizes */}
      <section className="w-full">
        <h2 className="text-2xl font-bold mb-4">Variant + Size Combinations</h2>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              Small Outline
            </Button>
            <Button variant="outline" size="default">
              Default Outline
            </Button>
            <Button variant="outline" size="lg">
              Large Outline
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm">
              Small Secondary
            </Button>
            <Button variant="secondary" size="default">
              Default Secondary
            </Button>
            <Button variant="secondary" size="lg">
              Large Secondary
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" size="sm">
              Small Destructive
            </Button>
            <Button variant="destructive" size="default">
              Default Destructive
            </Button>
            <Button variant="destructive" size="lg">
              Large Destructive
            </Button>
          </div>
        </div>
      </section>

      {/* Interactive States */}
      <section className="w-full">
        <h2 className="text-2xl font-bold mb-4">Interactive States</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Normal State</Button>
          <Button disabled>Disabled State</Button>
          <Button className="opacity-50 cursor-not-allowed">
            Custom Disabled
          </Button>
        </div>
      </section>

      {/* Variant Limitations Testing */}
      <section className="w-full">
        <h2 className="text-2xl font-bold mb-4">
          Variant Limitations & Combinations
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              ⚠️ Chuck Norris Test: Can a button be both secondary AND outlined?
            </h3>
            <div className="flex flex-wrap gap-4 items-center">
              <Button variant="secondary">Pure Secondary</Button>
              <Button variant="outline">Pure Outline</Button>
              {/* This will only apply the last variant due to CVA design */}
              <Button variant="secondary" className="border border-gray-300">
                Secondary + Manual Border
              </Button>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                ← Trying to combine secondary with manual border via className
              </div>
            </div>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
              <strong>Answer:</strong> No! CVA variants are mutually exclusive.
              Only one variant can be active at a time. The last variant prop
              wins, and manual className additions happen after variant styles.
            </p>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded mt-4">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              ✅ Chuck Norris Enhancement: Primary-Themed Outline Button
            </h3>
            <div className="flex flex-wrap gap-4 items-center">
              <Button variant="outline">Enhanced Outline</Button>
              <Button variant="ghost">Enhanced Ghost</Button>
              <Button variant="default">Default (for comparison)</Button>
              <div className="text-sm text-green-600 dark:text-green-400">
                ← Both outline and ghost now share primary color theming
              </div>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 mt-2">
              <strong>Enhancement:</strong> Both outline and ghost buttons now
              use consistent `text-primary` and `hover:bg-primary/10` styling
              for unified theming!
            </p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded mt-4">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              ✨ Chuck Norris Refinement: Subtle Ghost Button
            </h3>
            <div className="flex flex-wrap gap-4 items-center">
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="outline">Outline Button</Button>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                ← Ghost uses normal text color, primary color only on hover
              </div>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
              <strong>Refinement:</strong> Ghost button now uses default text
              color at rest, with `hover:bg-primary/10` and `hover:text-primary`
              for subtle interaction!
            </p>
          </div>
        </div>
      </section>

      <OriginDisplay />
    </div>
  );
}
