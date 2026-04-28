import logo from "@/app/celestial_circuit_logo.png";

export const dynamic = "force-static";

export function GET(): Response {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="10" fill="#000000"/>
  <image href="${logo.src}" x="0" y="0" width="64" height="64" preserveAspectRatio="xMidYMid slice"/>
</svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable"
    }
  });
}
