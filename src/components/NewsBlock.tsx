import { fetchEconomicCalendar } from "@/lib/news";
import NewsBlockClient from "./NewsBlockClient";

// Server component: fetches the live ForexFactory calendar (cached 30 min) and
// hands it to the client UI for filtering + timezone display.
export default async function NewsBlock() {
  const events = await fetchEconomicCalendar();
  return <NewsBlockClient events={events} />;
}
