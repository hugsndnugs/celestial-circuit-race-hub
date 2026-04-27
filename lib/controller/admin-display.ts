import type { AdminIdentity } from "@/lib/controller/admin-auth";

export function getSignedInLabel(identity: AdminIdentity | null): string {
  if (!identity) return "";
  return identity.displayName.trim() || identity.email;
}
