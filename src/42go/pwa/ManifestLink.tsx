"use client";

export const ManifestLink = ({
  href,
  isPrivate,
}: {
  href: string;
  isPrivate: boolean;
}) => (
  <link
    rel="manifest"
    href={href}
    crossOrigin={isPrivate ? "use-credentials" : undefined}
  />
);
