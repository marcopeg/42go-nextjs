"use client";

import { useState } from "react";
import { Layers, PanelRight } from "lucide-react";

import { Modal } from "@/42go/components/modal";
import type { ModalAnchor, ModalSize } from "@/42go/components/modal";
import { AppLayout } from "@/42go/layouts/app";
import { Button } from "@/components/ui/button";

const paragraphs = Array.from({ length: 10 }, (_, index) => index + 1);
const anchors: ModalAnchor[] = ["left", "right", "top", "bottom"];
const sizes: ModalSize[] = ["sm", "md", "lg", "xl", "full"];

export default function DemoModalPage() {
  const [centeredOpen, setCenteredOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const [nestedOpen, setNestedOpen] = useState(false);
  const [nestedChildOpen, setNestedChildOpen] = useState(false);
  const [nestedGrandchildOpen, setNestedGrandchildOpen] = useState(false);
  const [panelStackOpen, setPanelStackOpen] = useState(false);
  const [panelStackChildOpen, setPanelStackChildOpen] = useState(false);
  const [panelStackConfirmOpen, setPanelStackConfirmOpen] = useState(false);
  const [anchorExample, setAnchorExample] = useState<ModalAnchor>("right");
  const [anchorExampleOpen, setAnchorExampleOpen] = useState(false);
  const [sizeExample, setSizeExample] = useState<ModalSize>("md");
  const [sizeExampleOpen, setSizeExampleOpen] = useState(false);
  const handleNestedOpenChange = (next: boolean) => {
    setNestedOpen(next);
    if (!next) {
      setNestedChildOpen(false);
      setNestedGrandchildOpen(false);
    }
  };
  const handleNestedChildOpenChange = (next: boolean) => {
    setNestedChildOpen(next);
    if (!next) {
      setNestedGrandchildOpen(false);
    }
  };
  const handlePanelStackOpenChange = (next: boolean) => {
    setPanelStackOpen(next);
    if (!next) {
      setPanelStackChildOpen(false);
      setPanelStackConfirmOpen(false);
    }
  };
  const handlePanelStackChildOpenChange = (next: boolean) => {
    setPanelStackChildOpen(next);
    if (!next) {
      setPanelStackConfirmOpen(false);
    }
  };

  return (
    <AppLayout
      title="Modal Demo"
      subtitle="Overlay surfaces"
      icon={Layers}
      stickyHeader
      policy={{ require: { feature: "page:demo-modal" } }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-5">
            <PanelRight className="h-5 w-5 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">Centered</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Compact content above an overlay.
            </p>
            <Button
              className="mt-5 w-full"
              type="button"
              onClick={() => setCenteredOpen(true)}
            >
              Open centered modal
            </Button>
          </div>

          <div className="rounded-lg border bg-card p-5">
            <PanelRight className="h-5 w-5 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">Panel</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Anchored desktop surface, full-screen on mobile.
            </p>
            <Button
              className="mt-5 w-full"
              type="button"
              onClick={() => setPanelOpen(true)}
            >
              Open side panel
            </Button>
          </div>

          <div className="rounded-lg border bg-card p-5">
            <PanelRight className="h-5 w-5 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">Long Body</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Header and footer stay fixed while body content scrolls.
            </p>
            <Button
              className="mt-5 w-full"
              type="button"
              onClick={() => setFullOpen(true)}
            >
              Open long modal
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Panel anchors</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each anchor slides in from its own edge on desktop.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {anchors.map((anchor) => (
              <Button
                key={anchor}
                type="button"
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setAnchorExample(anchor);
                  setAnchorExampleOpen(true);
                }}
              >
                Open {anchor} panel
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Modal sizes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Centered dialogs use preset sizes only.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {sizes.map((size) => (
              <Button
                key={size}
                type="button"
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setSizeExample(size);
                  setSizeExampleOpen(true);
                }}
              >
                Open {size} modal
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Nested stacks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Parent and child surfaces stay controlled independently.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => setNestedOpen(true)}
            >
              Open modal in modal
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => setPanelStackOpen(true)}
            >
              Open stacked panels
            </Button>
          </div>
        </section>

        <Modal
          open={centeredOpen}
          onOpenChange={setCenteredOpen}
          title="Centered modal"
          subtitle="presentation modal, size md"
          presentation="modal"
          size="md"
          footer={
            <Button type="button" onClick={() => setCenteredOpen(false)}>
              Done
            </Button>
          }
          footerHelp="Best for focused confirmation or short forms."
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This surface uses the centered desktop presentation and turns into
              a full-screen surface on mobile.
            </p>
            <div className="rounded-md border bg-muted/30 p-4">
              Modal owns focus, backdrop, Escape close, and body scroll.
            </div>
          </div>
        </Modal>

        <Modal
          open={panelOpen}
          onOpenChange={setPanelOpen}
          title="Right panel"
          subtitle="presentation panel, anchor right"
          presentation="panel"
          anchor="right"
          size="md"
          footer={
            <Button type="button" onClick={() => setPanelOpen(false)}>
              Apply
            </Button>
          }
          footerHelp="Best for tools and preference panels."
        >
          <div className="space-y-4">
            <div className="rounded-md border p-4">
              <p className="font-medium">Anchored desktop panel</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The same API becomes full-screen on mobile.
              </p>
            </div>
            <div className="grid gap-3">
              {["sm", "md", "lg", "xl", "full"].map((size) => (
                <div
                  key={size}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>Size preset</span>
                  <span className="font-mono">{size}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>

        <Modal
          open={anchorExampleOpen}
          onOpenChange={setAnchorExampleOpen}
          title={`${anchorExample} panel`}
          subtitle={`presentation panel, anchor ${anchorExample}`}
          presentation="panel"
          anchor={anchorExample}
          size="md"
          footer={
            <Button type="button" onClick={() => setAnchorExampleOpen(false)}>
              Close
            </Button>
          }
          footerHelp="Panels enter from the edge where they are anchored."
        >
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-4">
              <p className="font-medium">Anchor: {anchorExample}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Desktop animation follows the anchor direction. Mobile keeps the
                full-screen overlay behavior.
              </p>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between rounded-md border px-3 py-2">
                <span>left</span>
                <span>slides left to right</span>
              </div>
              <div className="flex justify-between rounded-md border px-3 py-2">
                <span>right</span>
                <span>slides right to left</span>
              </div>
              <div className="flex justify-between rounded-md border px-3 py-2">
                <span>top</span>
                <span>slides top to bottom</span>
              </div>
              <div className="flex justify-between rounded-md border px-3 py-2">
                <span>bottom</span>
                <span>slides bottom to top</span>
              </div>
            </div>
          </div>
        </Modal>

        <Modal
          open={sizeExampleOpen}
          onOpenChange={setSizeExampleOpen}
          title={`${sizeExample} modal`}
          subtitle={`presentation modal, size ${sizeExample}`}
          presentation="modal"
          size={sizeExample}
          footer={
            <Button type="button" onClick={() => setSizeExampleOpen(false)}>
              Close
            </Button>
          }
          footerHelp="The same content rendered through each size preset."
        >
          <div className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              This dialog uses the selected size preset. It still becomes
              full-screen on mobile.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {sizes.map((size) => (
                <div
                  key={size}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>Size preset</span>
                  <span className="font-mono">{size}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>

        <Modal
          open={fullOpen}
          onOpenChange={setFullOpen}
          title="Scrollable body"
          subtitle="Header and footer stay planted."
          presentation="modal"
          size="lg"
          footer={
            <Button type="button" onClick={() => setFullOpen(false)}>
              Close
            </Button>
          }
          footerHelp="Long content scrolls in the body."
        >
          <div className="space-y-4">
            {paragraphs.map((item) => (
              <div key={item} className="rounded-md border bg-muted/30 p-4">
                <p className="font-medium">Section {item}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Repeated content proves that overflow belongs to the modal
                  body, while the header and footer stay available.
                </p>
              </div>
            ))}
          </div>
        </Modal>

        <Modal
          open={nestedOpen}
          onOpenChange={handleNestedOpenChange}
          title="Parent modal"
          subtitle="Level 1"
          presentation="modal"
          size="md"
          footer={
            <Button type="button" onClick={() => handleNestedOpenChange(false)}>
              Close parent
            </Button>
          }
          footerHelp="Closing the parent clears the child stack."
        >
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-4">
              <p className="font-medium">Level 1 surface</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This parent keeps its state while a child dialog opens above it.
              </p>
            </div>
            <Button type="button" onClick={() => setNestedChildOpen(true)}>
              Open child modal
            </Button>
          </div>

          <Modal
            open={nestedChildOpen}
            onOpenChange={handleNestedChildOpenChange}
            title="Child modal"
            subtitle="Level 2"
            presentation="modal"
            size="sm"
            footer={
              <Button
                type="button"
                onClick={() => handleNestedChildOpenChange(false)}
              >
                Close child
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                The child sits above the parent and owns focus until it closes.
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setNestedGrandchildOpen(true)}
              >
                Open third level
              </Button>
            </div>

            <Modal
              open={nestedGrandchildOpen}
              onOpenChange={setNestedGrandchildOpen}
              title="Third level"
              subtitle="Level 3"
              presentation="modal"
              size="sm"
              footer={
                <Button
                  type="button"
                  onClick={() => setNestedGrandchildOpen(false)}
                >
                  Done
                </Button>
              }
            >
              <div className="rounded-md border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                Three layers. Still controlled. Still breathing.
              </div>
            </Modal>
          </Modal>
        </Modal>

        <Modal
          open={panelStackOpen}
          onOpenChange={handlePanelStackOpenChange}
          title="Workspace panel"
          subtitle="Level 1 panel"
          presentation="panel"
          anchor="right"
          size="lg"
          footer={
            <Button
              type="button"
              onClick={() => handlePanelStackOpenChange(false)}
            >
              Close workspace
            </Button>
          }
          footerHelp="Panels can stack without sharing feature state."
        >
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-4">
              <p className="font-medium">Primary panel</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Open a narrower detail panel above this right-side panel.
              </p>
            </div>
            <Button type="button" onClick={() => setPanelStackChildOpen(true)}>
              Open detail panel
            </Button>
          </div>

          <Modal
            open={panelStackChildOpen}
            onOpenChange={handlePanelStackChildOpenChange}
            title="Detail panel"
            subtitle="Level 2 panel"
            presentation="panel"
            anchor="right"
            size="md"
            footer={
              <Button
                type="button"
                onClick={() => handlePanelStackChildOpenChange(false)}
              >
                Close detail
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-4">
                <p className="font-medium">Secondary panel</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  A centered confirmation can still open above this panel.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPanelStackConfirmOpen(true)}
              >
                Open confirmation modal
              </Button>
            </div>

            <Modal
              open={panelStackConfirmOpen}
              onOpenChange={setPanelStackConfirmOpen}
              title="Confirm action"
              subtitle="Level 3 modal"
              presentation="modal"
              size="sm"
              footer={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPanelStackConfirmOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setPanelStackConfirmOpen(false)}
                  >
                    Confirm
                  </Button>
                </>
              }
            >
              <p className="text-sm leading-6 text-muted-foreground">
                This confirms that modal and panel presentations can share a
                stack. No custom overlay shell required.
              </p>
            </Modal>
          </Modal>
        </Modal>
      </div>
    </AppLayout>
  );
}
