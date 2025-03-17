'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { AccentColorPicker } from '@/components/accent-color-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how the application looks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Theme</h3>
                  <p className="text-sm text-muted-foreground">
                    Select light, dark, or system theme
                  </p>
                </div>
                <ThemeToggle />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Accent Color</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred accent color
                  </p>
                </div>
                <AccentColorPicker />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
