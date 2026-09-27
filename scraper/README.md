# The Polite Scraper (FlyRank Internship — A9)

A small Node.js scraper that reads the first three catalogue pages of
Books to Scrape, visits all 60 book pages and turns the messy HTML into
clean, checked JSON.

## Target classification

**Site:** https://books.toscrape.com/

The site itself says it is a sandbox built so people can practise
scraping on it. That statement is my permission, and this is the only
kind of site this project touches.

**Why this site:** it is a practice sandbox, not a real business. Nobody
is harmed by reading it, and the data exists for exactly this purpose.

**Scope:** the first 3 catalogue pages only (page-1.html, page-2.html,
page-3.html). That is 60 book pages in total. I do not follow any other
links and I do not crawl the rest of the site.

**What I collect:** title, product URL, price text, availability text,
rating text, description, source page and fetch time — one record per book.

**How I behave:** an honest user-agent with a link to this repo, a
timeout on every request, at least 500 ms between real requests, and a
local cache so development does not hit the site over and over.

**robots.txt check:** requested https://books.toscrape.com/robots.txt —
no robots file found (404).

## How to run

Requires **Node.js 18 or newer** (uses the built-in `fetch`).

```bash
git clone https://github.com/AjdinFazlihodzicUNZE/FlyrankW5A9---polite_scraper.git
cd FlyrankW5A9---polite_scraper/scraper
npm install
npm start
```

After the run you get:

- `output/books.json` — 60 clean records
- `output/errors.json` — empty when everything validates
- `output/run-report.json` — the report for the run

First run downloads 60 book pages (about a minute). Every later run reads
from `cache/` and takes a few seconds.

To prove that one broken page does not crash the run: open
`src/index.js`, change `const ADD_BROKEN_URL = false;` to `true`, run
`npm start` again. The run still finishes with 60 good records and
`run-report.json` shows `failed_pages: 1`. Set it back to `false`
afterwards.

## Record schema

Each record in `output/books.json` follows this shape:

| Field | Type | Notes |
|---|---|---|
| `product_url` | string (https URL) | Canonical identity of the record |
| `title` | string | Non-empty |
| `price_text` | string | Raw price as it appears on the page, e.g. `"£51.77"` |
| `availability_text` | string | e.g. `"In stock (22 available)"` |
| `rating_text` | string | e.g. `"Three"` |
| `description` | string or null | `null` when the book has no description |
| `price_gbp` | number | Cleaned price, e.g. `51.77` |
| `source_page` | string (https URL) | Which catalogue page the book was found on |
| `fetched_at` | string | ISO timestamp from the run |

The schema is enforced with [Zod](https://zod.dev/). Records that fail
validation go to `output/errors.json` with a reason, and never reach
`output/books.json`.

## Politeness rules

- **User-agent:** every real request sends
  `FlyRankInternship-A9/1.0 (+https://github.com/AjdinFazlihodzicUNZE/FlyrankW5A9---polite_scraper)`.
  A site owner who sees the request can find this repo.
- **Timeout:** every request gives up after 10 seconds.
- **Delay:** at least 500 ms between two real requests to the site.
  Cached pages do not count — they never leave the machine.
- **Cache:** the first time a page is fetched, it is saved under `cache/`.
  During development the scraper reads from disk instead of asking the
  site again.
- **Retry:** one retry on network errors and 5xx responses. Never on
  **404** (the page does not exist) or **403** (the site said no).

## Why no browser

The data this assignment needs is already in the HTML the server sends.
A headless browser (Playwright, Puppeteer) would download the same HTML
and then run a JavaScript engine on top of it — slower, heavier, and
unnecessary here. The result would be identical.

## Run report (proof of a real run)

This is the `output/run-report.json` from the last run:

```json
{
  "started_at": "2026-09-27T13:50:11.658Z",
  "finished_at": "2026-09-27T13:50:11.913Z",
  "duration_seconds": 0.26,
  "pages_fetched": 0,
  "cache_hits": 63,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages": 0,
  "failed_urls": []
}
```

## One honest limitation

The selectors are tied to Books to Scrape's HTML structure. If the site
changes its layout, extraction would silently produce wrong or empty
values — which is why every record is validated against the schema
before it is stored. The run report is what makes that visible: a drop
in `valid_records` is the first sign something changed.

## Ethics note

Use an official API when one exists. Never bypass logins, paywalls or
blocks. Collect only what you need, and identify yourself honestly in
the user-agent. If a site says no, stop asking.