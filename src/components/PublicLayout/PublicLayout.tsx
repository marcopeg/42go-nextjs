import { ReactNode } from "react";
import { Nav } from "./Nav";

type PublicLayoutProps = {
  children: ReactNode;
};

export const PublicLayout = ({ children }: PublicLayoutProps) => (
  <>
    <Nav />
    {children}
  </>
);
