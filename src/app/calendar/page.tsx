import { appPage } from "@/lib/config/app-config-pages";
import CalendarClient from "./CalendarClient";

function CalendarPage() {
  return <CalendarClient />;
}

export default appPage(CalendarPage, "CalendarPage");
