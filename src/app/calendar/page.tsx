import { protectPage } from "@/42go/policy/protectPage";
import CalendarClient from "./CalendarClient";

function CalendarPage() {
  return <CalendarClient />;
}

export default protectPage(CalendarPage, {
  require: { feature: "page:CalendarPage" },
});
