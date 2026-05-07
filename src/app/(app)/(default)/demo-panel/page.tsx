"use client";

import { Layers } from "lucide-react";

import { AppLayout } from "@/42go/layouts/app";
import {
  Panel,
  PanelActions,
  PanelBody,
  PanelDescription,
  PanelFooter,
  PanelHeader,
  PanelTitle,
  SimplePanel,
} from "@/42go/components/panel";
import { Button } from "@/components/ui/button";

const metrics = [
  { label: "Static blocks", value: "4" },
  { label: "Variants", value: "3" },
  { label: "Overlay logic", value: "0" },
];

export default function DemoPanelPage() {
  return (
    <AppLayout
      title="Panel Demo"
      subtitle="Static content surfaces"
      icon={Layers}
      stickyHeader
      policy={{ require: { feature: "page:demo-panel" } }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <Panel key={metric.label} padding="sm">
              <PanelBody>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
              </PanelBody>
            </Panel>
          ))}
        </div>

        <SimplePanel
          title="SimplePanel"
          description="Title, description, actions, and body content in one static shell."
          actions={
            <>
              <Button variant="outline" size="sm" type="button">
                Secondary
              </Button>
              <Button size="sm" type="button">
                Primary
              </Button>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border bg-muted/30 p-4">
              <h3 className="font-semibold">Account</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Static panels organize content without owning focus, portals,
                backdrop, or page scroll locking.
              </p>
            </div>
            <div className="rounded-md border bg-muted/30 p-4">
              <h3 className="font-semibold">Preferences</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                They sit in the page flow and stay calm. Modal work belongs
                somewhere else.
              </p>
            </div>
          </div>
        </SimplePanel>

        <Panel>
          <PanelHeader
            actions={
              <PanelActions>
                <Button variant="outline" size="sm" type="button">
                  Draft
                </Button>
                <Button size="sm" type="button">
                  Save
                </Button>
              </PanelActions>
            }
          >
            <PanelTitle>Panel primitives</PanelTitle>
            <PanelDescription>
              Explicit pieces for custom static layouts.
            </PanelDescription>
          </PanelHeader>
          <PanelBody>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-4">
                <p className="font-medium">Header</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Uses title, description, and action slots.
                </p>
              </div>
              <div className="rounded-md border p-4">
                <p className="font-medium">Body</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Owns normal page-flow content.
                </p>
              </div>
            </div>
          </PanelBody>
          <PanelFooter className="border-t pt-4 text-sm text-muted-foreground">
            Static footer content stays inside the page layout.
          </PanelFooter>
        </Panel>
      </div>
    </AppLayout>
  );
}
