"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RequestAppConfig } from "@/middleware"; // Ensured @/middleware alias is used

// Helper function to get config on the client from the script tag
const getClientAppConfigFromScript = (): RequestAppConfig | null => {
  if (typeof window !== "undefined") {
    const configScript = document.getElementById("__APP_CONFIG__");
    if (configScript && configScript.textContent) {
      try {
        return JSON.parse(configScript.textContent);
      } catch (e) {
        console.error("Failed to parse __APP_CONFIG__:", e);
        return null;
      }
    }
  }
  return null;
};

interface OriginDisplayProps {
  serverSideOrigin: string | null;
}

export default function OriginDisplay({
  serverSideOrigin,
}: OriginDisplayProps) {
  // serverSideOrigin is used for the initial render.
  // Client-side config can be fetched for other purposes or verification if needed.

  useEffect(() => {
    const config = getClientAppConfigFromScript();
    if (config) {
      // Optional: for debugging
    }
  }, []);

  const handleButtonClick = () => {
    const config = getClientAppConfigFromScript();
    if (config && config.origin) {
      alert(
        `Client-side Origin (from script): ${config.origin}\nServer-side prop origin: ${serverSideOrigin}`
      );
    } else {
      alert(
        `Client-side config not found. Server-side prop origin: ${serverSideOrigin}`
      );
    }
  };

  return (
    <>
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-12">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Origin:&nbsp;
          <code className="font-mono font-bold">
            {serverSideOrigin || "Origin not available"}
          </code>
        </p>
      </div>

      <div className="relative z-[-1] flex place-items-center before:absolute before:h-[300px] before:w-full before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-full after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 sm:before:w-[480px] sm:after:w-[240px] before:lg:h-[360px]">
        <h1 className="text-4xl font-bold text-center">Welcome to Next.js!</h1>
      </div>

      <div className="mb-32 mt-12 grid text-center lg:mb-0 lg:w-full lg:max-w-5xl lg:grid-cols-4 lg:text-left">
        <Button onClick={handleButtonClick} variant="outline">
          Show Origin Info
        </Button>
      </div>
    </>
  );
}
