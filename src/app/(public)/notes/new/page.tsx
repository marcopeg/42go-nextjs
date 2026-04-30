import { protectPage } from "@/42go/policy/protectPage";
import NewNoteForm from "./NewNoteForm.client";

const NewNotePage = () => {
  return <NewNoteForm />;
};

export default protectPage(NewNotePage, [
  {
    require: { feature: "page:notes" },
  },
]);
