import { supabase } from "@/lib/controller/supabase-client";

const NOT_SIGNED_IN_ERROR = "Sign in required.";
const NOT_ADMIN_ERROR = "You do not have admin access.";

export interface AdminIdentity {
  email: string;
  displayName: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeDisplayName(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

function fallbackDisplayNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? email;
  const words = localPart
    .replaceAll(/[._-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (words.length === 0) return email;
  return words.map((word) => word.slice(0, 1).toUpperCase() + word.slice(1)).join(" ");
}

function getAdminAllowlist(): Set<string> {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "";
  const emails = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeEmail);
  return new Set(emails);
}

async function isAllowedAdminFromSupabase(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const { data, error } = await supabase
    .from("admin_users")
    .select("email")
    .eq("email", normalized)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.email);
}

export async function isAllowedAdmin(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const fromSupabase = await isAllowedAdminFromSupabase(normalized);
  if (fromSupabase) return true;
  return getAdminAllowlist().has(normalized);
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionEmail = sessionData.session?.user?.email;
  if (sessionEmail) return normalizeEmail(sessionEmail);
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  const email = data.user?.email;
  return email ? normalizeEmail(email) : null;
}

export async function getCurrentAdminIdentity(): Promise<AdminIdentity | null> {
  const email = await getCurrentUserEmail();
  if (!email) return null;
  return {
    email,
    displayName: fallbackDisplayNameFromEmail(email),
  };
}

export async function updateCurrentAdminDisplayName(displayName: string): Promise<AdminIdentity> {
  const identity = await getCurrentAdminIdentity();
  if (!identity) throw new Error(NOT_SIGNED_IN_ERROR);
  const normalizedDisplayName = normalizeDisplayName(displayName);
  if (!normalizedDisplayName) throw new Error("Display name is required.");
  const { error: metadataError } = await supabase.auth.updateUser({
    data: { race_director_name: normalizedDisplayName },
  });
  if (metadataError) throw new Error(metadataError.message);
  return { email: identity.email, displayName: normalizedDisplayName };
}

export async function requireSignedInUserEmail(): Promise<string> {
  const email = await getCurrentUserEmail();
  if (!email) throw new Error(NOT_SIGNED_IN_ERROR);
  return email;
}

export async function requireAdminUserEmail(): Promise<string> {
  const email = await requireSignedInUserEmail();
  if (!(await isAllowedAdmin(email))) throw new Error(NOT_ADMIN_ERROR);
  return email;
}
