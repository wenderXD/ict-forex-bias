export type NewsImpact = "High" | "Medium" | "Low";

export type NewsEvent = {
  id: string;
  ts: number; // epoch ms (UTC) — converted to the chosen timezone on the client
  currency: string;
  impact: NewsImpact;
  title: string;
  forecast: string;
  previous: string;
};

type FFEntry = {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
};

// FairEconomy hosts the JSON feed that powers ForexFactory's calendar.
const FEED = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

/* Fetches the current week's economic calendar (ForexFactory data via
   FairEconomy). Cached for 30 min via Next's fetch cache. Returns [] on
   failure so the UI degrades gracefully. */
export async function fetchEconomicCalendar(): Promise<NewsEvent[]> {
  try {
    const res = await fetch(FEED, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ICTForexBias/1.0)" },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as FFEntry[];

    const events: NewsEvent[] = [];
    for (const e of data) {
      const impact = e.impact as NewsImpact;
      if (impact !== "High" && impact !== "Medium" && impact !== "Low") continue;
      const ts = new Date(e.date).getTime();
      if (Number.isNaN(ts)) continue;
      events.push({
        id: `${e.country}-${e.title}-${e.date}`,
        ts,
        currency: e.country,
        impact,
        title: e.title,
        forecast: e.forecast || "",
        previous: e.previous || "",
      });
    }
    events.sort((a, b) => a.ts - b.ts);
    return events;
  } catch {
    return [];
  }
}
