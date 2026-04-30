import PolicyError from "./PolicyError";
import type { PolicyErrorCode } from "@/42go/policy/types";

export interface PolicyErrorViewProps {
  code: PolicyErrorCode | string;
  message: string;
}

// Server Component wrapper around client PolicyError providing a consistent
// inline policy failure visualization for protectPage.
export const PolicyErrorView = ({ code, message }: PolicyErrorViewProps) => {
  const safeCode: PolicyErrorCode =
    code === "session" || code === "role" || code === "grant"
      ? (code as PolicyErrorCode)
      : "feature"; // treat unknown codes as feature-style (Not Found aesthetics)
  return (
    <div className="px-6 py-12">
      <PolicyError code={safeCode} description={message} />
    </div>
  );
};

export default PolicyErrorView;
