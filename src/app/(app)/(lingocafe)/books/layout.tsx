import type { ReactNode } from "react";

const BooksLayout = ({
  children,
  reader,
}: {
  children: ReactNode;
  reader: ReactNode;
}) => (
  <>
    {children}
    {reader}
  </>
);

export default BooksLayout;
