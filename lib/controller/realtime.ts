import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/signups/supabaseBrowser";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function subscribeRaceTables(
  raceId: string,
  onChange: () => void,
  tables: string[] = ["races", "teams", "relay_events", "correction_requests", "race_incident_notes"]
): RealtimeChannel | null {
  const supabase = getSupabaseBrowser();
  if (!supabase || !raceId || !UUID_RE.test(raceId)) return null;
  const channel = supabase.channel(`race-live:${raceId}:${tables.join("-")}`);
  for (const table of tables) {
    channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `race_id=eq.${raceId}` }, () => onChange());
  }
  channel.subscribe();
  return channel;
}
