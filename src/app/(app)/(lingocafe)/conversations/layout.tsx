import type { ReactNode } from "react";

const ConversationsLayout = ({
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

export default ConversationsLayout;
