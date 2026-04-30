import { supabase } from "@/lib/controller/supabase-client";

const NOT_SIGNED_IN_ERROR = "Sign in required.";
const NOT_ADMIN_ERROR = "You do not have admin access.";
const NOT_DEVELOPER_ERROR = "You do not have developer access.";
const NOT_MARSHAL_ERROR = "You do not have marshal access.";

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

function allowPublicRoleFallback(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ALLOW_ENV_ROLE_FALLBACK === "true";
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

function getDeveloperAllowlist(): Set<string> {
  const raw = process.env.NEXT_PUBLIC_DEV_EMAILS ?? "";
  const emails = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeEmail);
  return new Set(emails);
}

function getMarshalAllowlist(): Set<string> {
  const raw = process.env.NEXT_PUBLIC_MARSHAL_EMAILS ?? "";
  const emails = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeEmail);
  return new Set(emails);
}

export function isAllowedAdminFromEnv(email: string): boolean {
  if (!allowPublicRoleFallback()) return false;
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return getAdminAllowlist().has(normalized);
}

async function isAllowedMarshalFromSupabase(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const { data, error } = await supabase
    .from("marshal_users")
    .select("email")
    .eq("email", normalized)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.email);
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

async function isAllowedDeveloperFromSupabase(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const { data, error } = await supabase
    .from("dev_users")
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
  return isAllowedAdminFromEnv(normalized);
}

export function isAllowedDeveloperFromEnv(email: string): boolean {
  if (!allowPublicRoleFallback()) return false;
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  if (isAllowedAdminFromEnv(normalized)) return true;
  return getDeveloperAllowlist().has(normalized);
}

export async function isAllowedDeveloper(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  if (await isAllowedAdmin(normalized)) return true;
  if (await isAllowedDeveloperFromSupabase(normalized)) return true;
  return isAllowedDeveloperFromEnv(normalized);
}

export function isAllowedMarshalFromEnv(email: string): boolean {
  if (!allowPublicRoleFallback()) return false;
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  if (isAllowedAdminFromEnv(normalized)) return true;
  return getMarshalAllowlist().has(normalized);
}

export async function isAllowedMarshal(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  if (await isAllowedAdmin(normalized)) return true;
  if (await isAllowedMarshalFromSupabase(normalized)) return true;
  return isAllowedMarshalFromEnv(normalized);
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

async function getAdminDisplayNameFromSupabase(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const { data, error } = await supabase
    .from("admin_users")
    .select("display_name")
    .eq("email", normalized)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return normalizeDisplayName((data as { display_name?: string | null } | null)?.display_name);
}

function getMetadataDisplayName(metadata: Record<string, unknown> | undefined): string | null {
  const raceDirectorName = metadata?.race_director_name;
  if (typeof raceDirectorName === "string") return normalizeDisplayName(raceDirectorName);
  const fullName = metadata?.full_name;
  if (typeof fullName === "string") return normalizeDisplayName(fullName);
  const name = metadata?.name;
  if (typeof name === "string") return normalizeDisplayName(name);
  return null;
}

export async function getCurrentAdminIdentity(): Promise<AdminIdentity | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData.session?.user ?? null;
  const sessionEmail = sessionUser?.email;
  const sessionMetadata = sessionUser?.user_metadata as Record<string, unknown> | undefined;
  const metadataName = getMetadataDisplayName(sessionMetadata);
  if (sessionEmail) {
    const normalized = normalizeEmail(sessionEmail);
    const dbName = await getAdminDisplayNameFromSupabase(normalized);
    return {
      email: normalized,
      displayName: dbName ?? metadataName ?? fallbackDisplayNameFromEmail(normalized),
    };
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;
  const normalized = normalizeEmail(data.user.email);
  const userMetadata = data.user.user_metadata as Record<string, unknown> | undefined;
  const metadataNameFromUser = getMetadataDisplayName(userMetadata);
  const dbName = await getAdminDisplayNameFromSupabase(normalized);
  return {
    email: normalized,
    displayName: dbName ?? metadataNameFromUser ?? fallbackDisplayNameFromEmail(normalized),
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
  const { error: adminUsersError } = await supabase
    .from("admin_users")
    .update({ display_name: normalizedDisplayName })
    .eq("email", identity.email)
    .eq("is_active", true);
  if (adminUsersError) throw new Error(adminUsersError.message);
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

export async function requireDeveloperUserEmail(): Promise<string> {
  const email = await requireSignedInUserEmail();
  if (!(await isAllowedDeveloper(email))) throw new Error(NOT_DEVELOPER_ERROR);
  return email;
}

export async function requireMarshalUserEmail(): Promise<string> {
  const email = await requireSignedInUserEmail();
  if (!(await isAllowedMarshal(email))) throw new Error(NOT_MARSHAL_ERROR);
  return email;
}
