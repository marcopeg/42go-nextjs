"use client";

import { ReactNode } from "react";
import { Nav } from "./PublicLayout/Nav";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <>
      <Nav />
      {children}
    </>
  );
};
