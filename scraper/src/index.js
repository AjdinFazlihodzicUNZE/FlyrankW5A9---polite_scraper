import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { z } from "zod";
const START_URL =
  "https://books.toscrape.com/catalogue/page-1.html";

const USER_AGENT =
  "FlyRankInternship-A9/1.0 (+https://github.com/AjdinFazlihodzicUNZE/FlyrankW5A9---polite_scraper)";

const TIMEOUT_MS = 10000;
const DELAY_MS = 500;
const MAX_PAGES = 3;
const CACHE_DIR = "cache";

 // FOR ZOD PART ON STEP 4
const OUTPUT_DIR = "output";
const BOOKS_FILE = path.join(OUTPUT_DIR, "books.json");
const ERRORS_FILE = path.join(OUTPUT_DIR, "errors.json");

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
  const b = url.match(/\/catalogue\/([^/]+)\/index\.html$/);
  if (b) {
    return path.join(CACHE_DIR, "books", `${b[1]}.html`);
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
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
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
      links.push({
        url: new URL(href, pageUrl).toString(),
        sourcePage: pageUrl,
      });
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

async function collectBookLinks() {
  let pageUrl = START_URL;
  let cataloguePages = 0;
  const all = [];

  while (cataloguePages < MAX_PAGES) {
    const html = await getPage(pageUrl);
    cataloguePages++;

    all.push(...findBookLinks(html, pageUrl));

    const next = findNextLink(html, pageUrl);
    if (!next) break;
    pageUrl = next;
  }

  const seen = new Set();
  const unique = [];
  for (const item of all) {
    if (!seen.has(item.url)) {
      seen.add(item.url);
      unique.push(item);
    }
  }
  console.log(`catalogue_pages=${cataloguePages}`);
  console.log(`discovered=${all.length}`);
  console.log(`unique_urls=${unique.length}`);

  return unique;
}
function extractBook(html, bookUrl, sourcePage) {
  const $ = cheerio.load(html);

  const title = $(".product_main h1").text().trim();

  const priceText = $(".product_main .price_color").first().text().trim();

  const availabilityText = $(".product_main .availability").first().text().trim();

  const ratingClass = $(".product_main .star-rating").first().attr("class") || "";
  const ratingText = ratingClass.replace("star-rating", "").trim();

  const descEl = $("#product_description").next("p");
  const description = descEl.length ? descEl.text().trim() : null;

  const fetchedAt = new Date().toISOString();

  return {
    title: title,
    product_url: bookUrl,
    price_text: priceText,
    availability_text: availabilityText,
    rating_text: ratingText,
    description: description,
    source_page: sourcePage,
    fetched_at: fetchedAt,
  };
}
function priceToNumber(priceText) {

  const cleaned = priceText.replace(/[^0-9.]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function absoluteUrl(url) {

  const u = new URL(url);
  return u.toString();
}

function cleanRecord(raw) {

  const priceGbp = priceToNumber(raw.price_text);

  return {

    product_url: absoluteUrl(raw.product_url),

    title: raw.title,
    price_text: raw.price_text,
    availability_text: raw.availability_text,
    rating_text: raw.rating_text,
    description: raw.description,

    price_gbp: priceGbp,

    source_page: raw.source_page,
    fetched_at: raw.fetched_at,
  };
}
const BookSchema = z.object({
  product_url: z.string().url().startsWith("https://"),
  title: z.string().min(1),
  price_text: z.string().min(1),
  availability_text: z.string().min(1),
  rating_text: z.string().min(1),
  description: z.string().nullable(),   
  price_gbp: z.number().nonnegative(),  
  source_page: z.string().url().startsWith("https://"),
  fetched_at: z.string().min(1),
});
function validateRecords(records) {
  const good = [];
  const bad = [];

  for (const rec of records) {
    const result = BookSchema.safeParse(rec);
    if (result.success) {
      good.push(result.data);
    } else {
      bad.push({
        record: rec,
        reason: result.error.issues.map((i) => i.message).join("; "),
      });
    }
  }

  return { good, bad };
}
function writeOutput(good, bad) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  fs.writeFileSync(BOOKS_FILE, JSON.stringify(good, null, 2));
  fs.writeFileSync(ERRORS_FILE, JSON.stringify(bad, null, 2));

  console.log(`valid_records=${good.length}`);
  console.log(`invalid_records=${bad.length}`);
  console.log(`wrote ${BOOKS_FILE}`);
  console.log(`wrote ${ERRORS_FILE}`);
}

async function fetchAllBooks(books) {
  const records = [];

  for (const book of books) {
    const html = await getPage(book.url);
    const record = extractBook(html, book.url, book.sourcePage);
    records.push(record);
  }

  return records;
}

// ----------- MAIN --------------- //
async function main() {
  const books = await collectBookLinks();
  const rawRecords = await fetchAllBooks(books);
  const cleanRecords = rawRecords.map(cleanRecord);

  const { good, bad } = validateRecords(cleanRecords);
  writeOutput(good, bad);

  console.log("");
  console.log("--- one clean record ---");
  console.log(JSON.stringify(good[0], null, 2));
}

main().catch((err) => {
  console.error("Run failed:", err.message);
  process.exit(1);
});