"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import { Modal } from "@/42go/components/modal";
import { usePWAInstall } from "@/42go/pwa/usePWAInstall";
import { Button } from "@/components/ui/button";

type TInstallAppActionProps = {
  appName: string;
  buttonLabel?: string;
  className?: string;
};

export const InstallAppAction = ({
  appName,
  buttonLabel = "Install app",
  className,
}: TInstallAppActionProps) => {
  const { canPrompt, isStandalone, platform, promptInstall } = usePWAInstall();
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [prompting, setPrompting] = useState(false);

  const instructions = useMemo(() => {
    if (isStandalone) {
      return {
        title: "Continue in your browser",
        steps: [
          "Open this list in your device browser.",
          "Use the browser Share or menu command.",
          `Choose Add to Home Screen or Install app for ${appName}.`,
        ],
      };
    }

    if (platform === "ios") {
      return {
        title: "Add to Home Screen",
        steps: [
          "Tap the Share button in your browser toolbar.",
          "Choose Add to Home Screen.",
          `Keep Open as Web App enabled, then confirm ${appName}.`,
        ],
      };
    }

    if (platform === "mac-safari") {
      return {
        title: "Add to Dock",
        steps: [
          "Open the File or Share menu in Safari.",
          "Choose Add to Dock.",
          `Review the name ${appName}, then confirm.`,
        ],
      };
    }

    return {
      title: "Install from your browser",
      steps: [
        "Open your browser menu or use the install icon in the address bar.",
        "Choose Install app or Add to Home Screen.",
        `Confirm the installation of ${appName}.`,
      ],
    };
  }, [appName, isStandalone, platform]);

  const handleInstall = async () => {
    if (!canPrompt) {
      setInstructionsOpen(true);
      return;
    }

    setPrompting(true);
    try {
      const outcome = await promptInstall();
      if (outcome !== "accepted") setInstructionsOpen(true);
    } finally {
      setPrompting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        className={className}
        onClick={handleInstall}
        disabled={prompting}
      >
        <Download className="h-4 w-4" />
        {prompting ? "Opening installer…" : buttonLabel}
      </Button>

      <Modal
        open={instructionsOpen}
        onOpenChange={setInstructionsOpen}
        title={instructions.title}
        subtitle={appName}
        presentation="modal"
        size="sm"
        className="md:min-h-0"
        footer={
          <Button
            type="button"
            variant="neutralLink"
            onClick={() => setInstructionsOpen(false)}
          >
            Close
          </Button>
        }
      >
        <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
          {instructions.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="mt-5 text-xs text-muted-foreground">
          Browser support varies. This page cannot reliably detect every
          existing installation.
        </p>
      </Modal>
    </>
  );
};
