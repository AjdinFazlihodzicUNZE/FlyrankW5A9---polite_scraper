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