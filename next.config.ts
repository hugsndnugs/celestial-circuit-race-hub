import type { NextConfig } from "next";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const isGithubPagesBuild = process.env.GITHUB_ACTIONS === "true" && repositoryName.length > 0;
const githubPagesProjectBasePath = isGithubPagesBuild ? `/${repositoryName}` : "";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? githubPagesProjectBasePath;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  basePath,
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || (basePath.length > 0 ? basePath : undefined)
};

export default nextConfig;
