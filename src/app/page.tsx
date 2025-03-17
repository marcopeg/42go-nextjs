import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Welcome to Next.js</CardTitle>
          <CardDescription>A clean setup with Next.js, Tailwind CSS, and shadcn/ui</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-gray-600">Get started by editing app/page.tsx</p>
          <Button>Get Started</Button>
        </CardContent>
      </Card>
    </main>
  );
}
