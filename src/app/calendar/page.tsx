import { appPage } from "@/42go/config/app-config-pages";
import CalendarClient from "./CalendarClient";

function CalendarPage() {
  return <CalendarClient />;
}

export default appPage(CalendarPage, "CalendarPage");
