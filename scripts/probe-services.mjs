import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const servicesPath = resolve(rootDir, "data/services.json");
const outputPath = resolve(rootDir, "public/status.json");

const REQUEST_TIMEOUT_MS = 8000;

const isOperational = (statusCode) => statusCode >= 200 && statusCode < 400;

const probeService = async (service) => {
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetch(service.url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      redirect: "follow",
    });
    const state = isOperational(response.status) ? "operational" : "degraded";
    const note = isOperational(response.status)
      ? `HTTP ${response.status} ${response.statusText}`
      : `HTTP ${response.status} ${response.statusText || "Unexpected response"}`;
    return {
      component: service.component,
      url: service.url,
      state,
      note,
      checkedAt,
      httpStatus: response.status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown probe error";
    return {
      component: service.component,
      url: service.url,
      state: "degraded",
      note: `Request failed: ${message}`,
      checkedAt,
      httpStatus: null,
    };
  }
};

const run = async () => {
  const servicesRaw = await readFile(servicesPath, "utf8");
  const services = JSON.parse(servicesRaw);
  if (!Array.isArray(services) || services.length === 0) {
    throw new Error("data/services.json must contain a non-empty array.");
  }
  const results = await Promise.all(services.map(probeService));
  const payload = {
    lastUpdated: new Date().toISOString(),
    services: results,
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

try {
  await run();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
