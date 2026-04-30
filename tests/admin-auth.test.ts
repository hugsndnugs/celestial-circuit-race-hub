import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedAdminFromEnv } from "../lib/controller/admin-auth";

function setNodeEnv(value: string | undefined) {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    configurable: true,
    enumerable: true,
    writable: true,
  });
}

test("isAllowedAdminFromEnv is fail-closed in production by default", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAllowFallback = process.env.NEXT_PUBLIC_ALLOW_ENV_ROLE_FALLBACK;
  const previousAdmins = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  setNodeEnv("production");
  delete process.env.NEXT_PUBLIC_ALLOW_ENV_ROLE_FALLBACK;
  process.env.NEXT_PUBLIC_ADMIN_EMAILS = "admin@example.com";
  assert.equal(isAllowedAdminFromEnv("admin@example.com"), false);
  setNodeEnv(previousNodeEnv);
  process.env.NEXT_PUBLIC_ALLOW_ENV_ROLE_FALLBACK = previousAllowFallback;
  process.env.NEXT_PUBLIC_ADMIN_EMAILS = previousAdmins;
});

test("isAllowedAdminFromEnv can be explicitly enabled", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAllowFallback = process.env.NEXT_PUBLIC_ALLOW_ENV_ROLE_FALLBACK;
  const previousAdmins = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  setNodeEnv("production");
  process.env.NEXT_PUBLIC_ALLOW_ENV_ROLE_FALLBACK = "true";
  process.env.NEXT_PUBLIC_ADMIN_EMAILS = "admin@example.com";
  assert.equal(isAllowedAdminFromEnv("admin@example.com"), true);
  setNodeEnv(previousNodeEnv);
  process.env.NEXT_PUBLIC_ALLOW_ENV_ROLE_FALLBACK = previousAllowFallback;
  process.env.NEXT_PUBLIC_ADMIN_EMAILS = previousAdmins;
});
