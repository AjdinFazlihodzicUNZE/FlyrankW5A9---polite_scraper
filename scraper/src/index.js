import fs from "fs";
import path from "path";

const PAGE_URL =
  "https://books.toscrape.com/catalogue/page-1.html";

const USER_AGENT =
  "FlyRankInternship-A9/1.0 (+https://github.com/AjdinFazlihodzicUNZE/FlyrankW5A9---polite_scraper)";

const TIMEOUT_MS = 10000;
const CACHE_DIR = "cache";
const CACHE_FILE = path.join(CACHE_DIR, "catalogue-page-1.html");

async function getPage(url, cacheFile) {

  if (fs.existsSync(cacheFile)) {
    const html = fs.readFileSync(cacheFile, "utf8");
    const size = Buffer.byteLength(html, "utf8");
    console.log(`CACHE HIT  ${cacheFile}  (${size} bytes)`);
    return html;
  }
  console.log(`FETCH - ${url}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (response.status !== 200) {
    throw new Error(`Bad status ${response.status} for ${url}`);
  }

  const html = await response.text();
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cacheFile, html);

  const size = Buffer.byteLength(html, "utf8");
  console.log(`SAVED      ${cacheFile}  (${size} bytes)`);

  return html;
}

// ----------- MAIN --------------- //
async function main() {
  await getPage(PAGE_URL, CACHE_FILE);
}

main().catch((err) => {
  console.error("Run failed:", err.megsage);
  process.exit(1);
});