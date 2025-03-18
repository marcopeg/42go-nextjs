'use client';

import { InternalPage } from '@/components/layout/internal-page';
import { ArrowLeft, Pencil, Share, Copy, Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function DemoPage() {
  return (
    <InternalPage
      title="Demo Page"
      subtitle="This demonstrates all the features of the InternalPage component"
      leftAction={{
        icon: ArrowLeft,
        tooltip: 'Go back',
        onClick: () => console.log('Go back'),
      }}
      rightActions={[
        {
          icon: Pencil,
          text: 'Edit',
          tooltip: 'Edit this item',
          onClick: () => console.log('Edit clicked'),
          variant: 'outline',
        },
        {
          icon: Share,
          text: 'Share',
          tooltip: 'Share this item',
          onClick: () => console.log('Share clicked'),
          variant: 'outline',
        },
        {
          icon: Copy,
          tooltip: 'Copy',
          onClick: () => console.log('Copy clicked'),
          variant: 'ghost',
        },
      ]}
      bottomBar={{
        leftContent: <span className="text-sm text-muted-foreground">Last edited 2 hours ago</span>,
        rightActions: [
          {
            text: 'Cancel',
            onClick: () => console.log('Cancel clicked'),
            variant: 'ghost',
          },
          {
            icon: Save,
            text: 'Save',
            onClick: () => console.log('Save clicked'),
            variant: 'default',
          },
        ],
        sticky: true,
      }}
    >
      <div className="space-y-6">
        {/* Example content */}
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="w-full">
            <CardHeader>
              <CardTitle>Content Item {i + 1}</CardTitle>
              <CardDescription>This is some example content to show scrolling</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam eget felis euismod,
                rhoncus metus ut, tincidunt metus. Donec euismod, nisl eget consectetur sagittis,
                nisl nunc consectetur nisi, eget congue nisl nunc eget lectus.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" size="sm">
                View Details
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </InternalPage>
  );
}
