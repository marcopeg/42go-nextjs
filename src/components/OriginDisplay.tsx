"use client";

import { Button } from "@/components/ui/button";
import { useAppConfig } from "@/components/AppConfigProvider";

const OriginDisplay: React.FC = () => {
  const appConfigFromContext = useAppConfig();

  const handleShowAppName = () => {
    if (appConfigFromContext) {
      alert(`App Name from Client Context: ${appConfigFromContext.name}`);
    } else {
      alert("Client context not available.");
      console.warn(
        "OriginDisplay: handleShowAppName - appConfigFromContext is null."
      );
    }
  };

  return (
    <Button onClick={handleShowAppName} variant="outline">
      Show App Name
    </Button>
  );
};

export default OriginDisplay;
