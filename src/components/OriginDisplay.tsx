"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAppConfig } from "@/contexts/AppConfigContext";

interface OriginDisplayProps {
  initialOrigin: string; // Keep this for the initial SSR render
}

const OriginDisplay: React.FC<OriginDisplayProps> = ({ initialOrigin }) => {
  // Use the hook to get the config from context
  const appConfigFromContext = useAppConfig();

  // State to hold the origin, initialized with SSR value, then updated from context
  const [displayOrigin, setDisplayOrigin] = useState<string>(initialOrigin);
  const [configSource, setConfigSource] = useState<string>("SSR");

  useEffect(() => {
    // This effect runs on the client after hydration
    if (appConfigFromContext) {
      console.log(
        "OriginDisplay: useEffect - appConfigFromContext found:",
        appConfigFromContext
      );
      setDisplayOrigin(appConfigFromContext.origin);
      setConfigSource("Client Context");
    } else {
      console.warn(
        "OriginDisplay: useEffect - appConfigFromContext is null, using initialOrigin."
      );
      // Fallback or keep initialOrigin if context is null
      // This might happen if AppConfigProvider hasn't set the context yet,
      // or if the script tag was missing/empty.
    }
  }, [appConfigFromContext]); // Re-run if the context value changes

  const handleShowOrigin = () => {
    // Now, appConfigFromContext should reliably have the config on the client
    if (appConfigFromContext) {
      alert(
        `Origin from Client Context: ${appConfigFromContext.origin}\\n(Initially rendered with: ${initialOrigin})`
      );
    } else {
      // This case should be less common if AppConfigProvider works correctly
      alert(
        `Origin (fallback to initial SSR): ${initialOrigin}\\nClient context not available.`
      );
      console.warn(
        "OriginDisplay: handleShowOrigin - appConfigFromContext is null."
      );
    }
  };

  return (
    <>
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-12">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Origin:&nbsp;
          <code className="font-mono font-bold">
            {initialOrigin || "Origin not available"}
          </code>
        </p>
      </div>

      <div className="relative z-[-1] flex place-items-center before:absolute before:h-[300px] before:w-full before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-full after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 sm:before:w-[480px] sm:after:w-[240px] before:lg:h-[360px]">
        <h1 className="text-4xl font-bold text-center">Welcome to Next.js!</h1>
      </div>

      <div className="mb-32 mt-12 grid text-center lg:mb-0 lg:w-full lg:max-w-5xl lg:grid-cols-4 lg:text-left">
        <Button onClick={handleShowOrigin} variant="outline">
          Show Origin Info
        </Button>
      </div>

      <div className="mt-8">
        <p>
          Origin Displayed ({configSource}): {displayOrigin}{" "}
          {/* Used displayOrigin and configSource */}
        </p>
        <Button onClick={handleShowOrigin} variant="outline" className="mt-2">
          Show Origin (Client-side)
        </Button>
      </div>
    </>
  );
};

export default OriginDisplay;
