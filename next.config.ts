import type { NextConfig } from "next";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const hasRepoName = repositoryName.length > 0;
const defaultProjectBasePath = hasRepoName ? `/${repositoryName}` : "";

const normalizeBasePath = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  if (value === "/") return "";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
};

const envBasePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
const isGithubPagesBuild = process.env.GITHUB_ACTIONS === "true";
const basePath = envBasePath ?? (isGithubPagesBuild ? defaultProjectBasePath : "");
const envAssetPrefix = normalizeBasePath(process.env.NEXT_PUBLIC_ASSET_PREFIX);
const assetPrefix = envAssetPrefix ?? (basePath.length > 0 ? basePath : undefined);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
  basePath,
  assetPrefix
};

export default nextConfig;
