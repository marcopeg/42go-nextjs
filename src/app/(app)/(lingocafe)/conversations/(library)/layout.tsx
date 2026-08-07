import { ConversationLibraryShell } from "@/app/(app)/(lingocafe)/conversations/_components/ConversationLibraryShell";

const ConversationLibraryLayout = ({ children }: { children: React.ReactNode }) => (
  <ConversationLibraryShell>{children}</ConversationLibraryShell>
);

export default ConversationLibraryLayout;
