import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getCurrentUserEmail, isAllowedAdmin } from "@/lib/controller/admin-auth";
import { getSupabaseBrowser } from "@/lib/signups/supabaseBrowser";

export const HOMEPAGE_SETTINGS_ID = "homepage";

const homepageSlideSchema = z.object({
  id: z.string().trim().catch(""),
  title: z.string().trim().max(90).catch(""),
  caption: z.string().trim().max(180).catch(""),
  imageUrl: z.string().trim().max(800).catch(""),
  altText: z.string().trim().max(160).catch(""),
  ctaLabel: z.string().trim().max(50).catch(""),
  ctaHref: z.string().trim().max(300).catch(""),
});

const homepageSettingsSchema = z.object({
  eyebrow: z.string().trim().max(70).catch("Race operations"),
  headline: z.string().trim().max(120).catch("Race Operations Hub"),
  intro: z.string().trim().max(260).catch(""),
  primaryCtaLabel: z.string().trim().max(50).catch("Team signup"),
  primaryCtaHref: z.string().trim().max(300).catch("/signups"),
  secondaryCtaLabel: z.string().trim().max(50).catch("Race docs"),
  secondaryCtaHref: z.string().trim().max(300).catch("/docs"),
  rotationIntervalSeconds: z.coerce.number().int().min(3).max(120).catch(8),
  slides: z.array(homepageSlideSchema).max(8).catch([]),
});

export type HomepageSlide = z.infer<typeof homepageSlideSchema>;
export type HomepageSettings = z.infer<typeof homepageSettingsSchema>;

export const defaultHomepageSettings: HomepageSettings = {
  eyebrow: "Celestial Circuit",
  headline: "Race-day tools, team registration, and live operations in one orbit.",
  intro:
    "Follow the latest race status, jump into team signup, and keep every marshal, captain, and viewer aligned from launch to finish.",
  primaryCtaLabel: "Register a team",
  primaryCtaHref: "/signups",
  secondaryCtaLabel: "View race docs",
  secondaryCtaHref: "/docs",
  rotationIntervalSeconds: 8,
  slides: [
    {
      id: "race-grid",
      title: "Showcase race-day moments",
      caption: "Admins can add image URLs, captions, and links for this rotating homepage feature.",
      imageUrl: "",
      altText: "Race-day feature image placeholder",
      ctaLabel: "Check status",
      ctaHref: "/status",
    },
    {
      id: "team-spotlight",
      title: "Spotlight teams and announcements",
      caption: "Use the admin console to rotate sponsor art, team photos, or pre-race notices.",
      imageUrl: "",
      altText: "Team spotlight image placeholder",
      ctaLabel: "Open leaderboard",
      ctaHref: "/leaderboard",
    },
  ],
};

type HomepageSettingsRow = {
  content: unknown;
};

function getClient(): SupabaseClient | null {
  return getSupabaseBrowser();
}

export function parseHomepageSettings(value: unknown): HomepageSettings {
  const parsed = homepageSettingsSchema.parse(value ?? {});
  const normalizedSlides = parsed.slides.map((slide, index) => ({
    ...slide,
    id: slide.id || `slide-${index + 1}`,
  }));
  return {
    ...defaultHomepageSettings,
    ...parsed,
    slides: normalizedSlides.length > 0 ? normalizedSlides : defaultHomepageSettings.slides,
  };
}

export async function loadHomepageSettings(): Promise<HomepageSettings> {
  const supabase = getClient();
  if (!supabase) return defaultHomepageSettings;

  const { data, error } = await supabase
    .from("homepage_settings")
    .select("content")
    .eq("id", HOMEPAGE_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    console.warn("Unable to load homepage settings", error);
    return defaultHomepageSettings;
  }
  return parseHomepageSettings((data as HomepageSettingsRow | null)?.content);
}

export async function saveHomepageSettings(settings: HomepageSettings): Promise<HomepageSettings> {
  const supabase = getClient();
  if (!supabase) throw new Error("Homepage settings are unavailable on this deployment.");

  const email = await getCurrentUserEmail();
  if (!email || !(await isAllowedAdmin(email))) throw new Error("Admin access required.");

  const content = parseHomepageSettings(settings);
  const { error } = await supabase.from("homepage_settings").upsert(
    {
      id: HOMEPAGE_SETTINGS_ID,
      content,
      updated_by: email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) throw new Error(error.message);
  return content;
}
