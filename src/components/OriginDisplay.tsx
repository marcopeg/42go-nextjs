"use client";

import { Button } from "@/components/ui/button";
import { useAppConfig } from "@/42go/config/use-app-config";

const OriginDisplay: React.FC = () => {
  const appConfigFromContext = useAppConfig();

  const handleShowAppID = () => {
    if (appConfigFromContext) {
      alert(
        `App ID from Client Context: ${appConfigFromContext?.name || "unknown"}`
      );
    } else {
      alert("Client context not available.");
      console.warn(
        "OriginDisplay: handleShowAppID - appConfigFromContext is null."
      );
    }
  };

  return (
    <Button onClick={handleShowAppID} variant="outline">
      Show App ID
    </Button>
  );
};

export default OriginDisplay;
