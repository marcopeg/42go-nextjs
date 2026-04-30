import { protectPage } from "@/42go/policy/protectPage";
import NoteView from "./NoteView.client";

type RouteParams = { bucket: string; uuid: string };

const NoteReadPage = async ({ params }: { params?: Promise<RouteParams> }) => {
  // Next.js expects route params to be optionally a Promise in some runtimes.
  if (!params) throw new Error("Missing route params");
  const p = (await params) as RouteParams;
  const { bucket, uuid } = p;
  return <NoteView bucket={bucket} uuid={uuid} />;
};

export default protectPage(NoteReadPage, [
  { require: { feature: "page:notes" } },
]);
