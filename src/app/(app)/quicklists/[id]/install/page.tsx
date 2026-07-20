"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { AppLayout } from "@/42go/layouts/app/AppLayout";
import { InstallAppAction } from "@/42go/pwa";
import { SimplePanel } from "@/42go/components/panel";

type TInstallListResponse = {
  project: {
    title: string;
  };
};

export default function QuicklistInstallPage() {
  const params = useParams<{ id: string | string[] }>();
  const idParam = params?.id;
  const projectId = Array.isArray(idParam) ? idParam[0] : idParam || "";
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`/api/quicklists/${projectId}/info`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("This list is unavailable.");

        const payload = (await res.json()) as TInstallListResponse;
        if (!cancelled) setTitle(payload.project.title);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "This list is unavailable."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <AppLayout
      hideMobileMenu
      backBtn={{ to: `/quicklists/${projectId}/info`, label: "List settings" }}
      policy={{ require: { feature: "page:quicklists" } }}
      title="Install this list"
      subtitle={title || undefined}
    >
      <div className="w-full max-w-3xl">
        {loading && (
          <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm">
            Loading installation options…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && title && (
          <SimplePanel
            title={`Install ${title}`}
            description="This dedicated page gives the list its own app identity. After installation, it opens directly to this list."
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use the button below. Your browser will either open its native
                installer or show the correct installation steps for this
                device.
              </p>
              <InstallAppAction
                appName={title}
                buttonLabel="Install this list"
                className="w-full sm:w-auto"
              />
            </div>
          </SimplePanel>
        )}
      </div>
    </AppLayout>
  );
}
