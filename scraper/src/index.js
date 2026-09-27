import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
const START_URL =
  "https://books.toscrape.com/catalogue/page-1.html";

const USER_AGENT =
  "FlyRankInternship-A9/1.0 (+https://github.com/AjdinFazlihodzicUNZE/FlyrankW5A9---polite_scraper)";

const TIMEOUT_MS = 10000;
const DELAY_MS = 500;
const MAX_PAGES = 3;
const CACHE_DIR = "cache";

let lastFetchTime = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitBetweenFetches() {
  const sinceLast = Date.now() - lastFetchTime;
  if (sinceLast < DELAY_MS) {
    await sleep(DELAY_MS - sinceLast);
  }
  lastFetchTime = Date.now();
}

function cacheFileFor(url) {
 
  const m = url.match(/page-(\d+)\.html$/);
  if (m) {
    return path.join(CACHE_DIR, `catalogue-page-${m[1]}.html`);
  }

  const safe = url.replace(/^https?:\/\//, "").replace(/[^a-z0-9.-]/gi, "_");
  return path.join(CACHE_DIR, safe + ".html");
}


async function getPage(url) {

  const cacheFile = cacheFileFor(url);

  if (fs.existsSync(cacheFile)) {
    const html = fs.readFileSync(cacheFile, "utf8");
    console.log(`CACHE HIT  ${url}`);
    return html;
  }

  await waitBetweenFetches();
  console.log(`FETCH      ${url}`);

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
  console.log(`SAVED      ${cacheFile}`);

  return html;
}

function findBookLinks(html, pageUrl) {
  const $ = cheerio.load(html);
  const links = [];

  $("article.product_pod h3 a").each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      
      links.push(new URL(href, pageUrl).toString());
    }
  });

  return links;
}

function findNextLink(html, pageUrl) {
  const $ = cheerio.load(html);
  const href = $("li.next a").attr("href");
  if (!href) return null;
  return new URL(href, pageUrl).toString();
}

async function collectBookUrls() {
  let pageUrl = START_URL;
  let cataloguePages = 0;
  const allLinks = [];

  while (cataloguePages < MAX_PAGES) {
    const html = await getPage(pageUrl);
    cataloguePages++;

    const onThisPage = findBookLinks(html, pageUrl);
    allLinks.push(...onThisPage);

    const next = findNextLink(html, pageUrl);
    if (!next) break;             // no more pages
    pageUrl = next;
  }

  const uniqueUrls = [...new Set(allLinks)];

  console.log(`catalogue_pages=${cataloguePages}`);
  console.log(`discovered=${allLinks.length}`);
  console.log(`unique_urls=${uniqueUrls.length}`);

  return uniqueUrls;
}


// ----------- MAIN --------------- //
async function main() {
  await collectBookUrls();
}

main().catch((err) => {
  console.error("Run failed:", err.message);
  process.exit(1);
});