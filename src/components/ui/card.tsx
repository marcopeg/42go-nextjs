import React from "react";

export default function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "bg-white dark:bg-gray-900",
        "border border-gray-200 dark:border-gray-800",
        "rounded-lg",
        "shadow-sm",
        "p-6",
        className || "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
