import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/signups/supabaseBrowser";

export function subscribeRaceTables(
  raceId: string,
  onChange: () => void,
  tables: string[] = ["races", "teams", "relay_events", "correction_requests", "race_incident_notes", "team_signup_requests"]
): RealtimeChannel | null {
  const supabase = getSupabaseBrowser();
  if (!supabase || !raceId) return null;
  const channel = supabase.channel(`race-live:${raceId}:${tables.join("-")}`);
  for (const table of tables) {
    channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `race_id=eq.${raceId}` }, () => onChange());
  }
  channel.subscribe();
  return channel;
}
