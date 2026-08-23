/**
 * Signal Tracker scraper.
 *
 * Design note: the original brief called for cheerio + axios HTML scraping
 * of TechCrunch, prnewswire, Mashable, and Engadget. All four publish RSS
 * feeds, and the brief itself says to prefer RSS over HTML scraping when
 * it's available — so RSS is used everywhere a feed exists. For sources
 * with no findable feed, `scrapeHtmlListing` below does real cheerio+axios
 * scraping: it pulls same-domain links with substantial link text off the
 * page. That's cruder than a feed (no reliable per-article date, so it
 * falls back to scrape time; no description) but it's an honest best
 * effort against a site's actual markup, and the health-check report will
 * flag it if a redesign breaks it.
 *
 * Every run:
 *   1. Reads the built-in sources below plus anything in sources.json.
 *   2. Fetches each source (RSS parse, or HTML scrape if type: 'html'),
 *      maps entries to the app's article shape.
 *   3. Merges with the existing public/data/articles.json, de-duplicated
 *      by id, newest 500 kept.
 *   4. Writes the result back out with a fresh generatedAt timestamp.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'public', 'data', 'articles.json');
const SOURCES_PATH = path.join(ROOT, 'sources.json');

const USER_AGENT =
  'SignalTrackerBot/1.0 (personal non-commercial news aggregator; contact via GitHub repo)';

const MAX_ARTICLES = 500;
const REQUEST_DELAY_MS = 1500;

// Built-in sources named in the brief. Swap or add feed URLs here as sites
// change theirs — check each site's own /feed or "RSS" footer link if one
// of these starts returning nothing.
const BUILT_IN_SOURCES = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', categories: ['tech'] },
  { name: 'Engadget', url: 'https://www.engadget.com/rss.xml', categories: ['tech', 'lifestyle'] },
  { name: 'Mashable', url: 'https://mashable.com/feeds/rss/all', categories: ['culture', 'tech', 'lifestyle'] },
  // The 5 prnewswire category feeds below (tech/food/energy/telecoms/
  // lifestyle) all came back 404 in your Actions run — the URL pattern
  // I'd guessed for them doesn't exist. PR Newswire does have one general
  // feed that works (prnewswire.com/rss/news-releases-list.rss), but it's
  // dominated by investor-lawsuit-alert spam with no per-category split,
  // so it's not swapped in here as a replacement. That leaves food, energy,
  // and telecoms with no dedicated source right now — say the word if you
  // want me to go find real trade-press feeds for those three.

  // Entertainment & pop culture
  { name: 'Vulture', url: 'http://feeds.feedburner.com/nymag/vulture', categories: ['entertainment'] },
  { name: 'The A.V. Club', url: 'https://www.avclub.com/rss', categories: ['entertainment'] },
  { name: 'Variety', url: 'https://variety.com/feed/', categories: ['entertainment'] },
  { name: 'The Hollywood Reporter', url: 'https://www.hollywoodreporter.com/feed/', categories: ['entertainment'] },
  { name: 'Pitchfork', url: 'https://pitchfork.com/rss/news/', categories: ['entertainment'] },
  { name: 'Rolling Stone', url: 'https://www.rollingstone.com/feed/', categories: ['entertainment'] },
  { name: 'Consequence', url: 'https://consequence.net/feed/', categories: ['entertainment'] },
  { name: 'IndieWire', url: 'https://www.indiewire.com/feed/', categories: ['entertainment'] },
  { name: 'Polygon', url: 'https://www.polygon.com/rss/index.xml', categories: ['entertainment'] },
  // The Ringer's feed 404'd and no working replacement URL was found — dropped.

  // Social media & internet culture
  { name: 'Know Your Meme', url: 'https://knowyourmeme.com/newsfeed.rss', categories: ['internet-culture'] },
  { name: 'Kotaku', url: 'https://kotaku.com/rss', categories: ['internet-culture'] },
  // Dazed's feed 404'd and no working replacement URL was found — dropped.
  { name: 'Highsnobiety', url: 'https://www.highsnobiety.com/feed/', categories: ['internet-culture', 'fashion'] },
  // Skipped: Garbage Day, Embedded (Ryan Broderick), Blackbird Spyplane —
  // no confirmed RSS URL. Add them here once you've found a working feed.

  // Society, sociology, anthropology
  { name: 'Aeon', url: 'https://aeon.co/feed.rss', categories: ['society'] },
  { name: 'Psyche', url: 'https://psyche.co/feed.rss', categories: ['society'] },
  // Corrected URL — the previous /feeds/all.atom path 404'd. This one
  // matches theconversation.com's confirmed feed pattern but wasn't
  // fetchable to double-check directly, so still worth watching.
  { name: 'The Conversation (UK)', url: 'https://theconversation.com/uk/articles.atom', categories: ['society'] },
  { name: 'Sapiens.org', url: 'https://www.sapiens.org/feed/', categories: ['society'] },
  { name: 'Real Life Mag', url: 'https://reallifemag.com/feed/', categories: ['society'] },
  { name: 'n+1', url: 'https://www.nplusonemag.com/feed/', categories: ['society'] },
  // The Baffler (403, blocked) and Boston Review (malformed XML the parser
  // couldn't read) — both dropped, no quick fix available for either.
  { name: 'Jacobin', url: 'https://jacobin.com/feed/', categories: ['society'] },
  // Skipped: Anthropology News (AAA) — no reliable public feed found.

  // General culture/ideas magazines
  { name: 'The Atlantic (Culture)', url: 'https://www.theatlantic.com/feed/channel/entertainment/', categories: ['culture'] },
  { name: 'The New Yorker', url: 'https://www.newyorker.com/feed/everything', categories: ['culture'] },
  { name: 'The New Republic', url: 'https://newrepublic.com/rss.xml', categories: ['culture'] },
  { name: 'New York Magazine (Intelligencer)', url: 'https://nymag.com/rss/intelligencer.xml', categories: ['culture'] },
  { name: 'Slate (Culture)', url: 'https://slate.com/feeds/culture.rss', categories: ['culture'] },
  { name: 'The Guardian (Culture)', url: 'https://www.theguardian.com/culture/rss', categories: ['culture'] },
  { name: 'London Review of Books', url: 'https://www.lrb.co.uk/feeds/rss', categories: ['culture'] },
  // Skipped: Harper's — no reliable public feed found.

  // Forums and discussion. Reddit's .rss endpoints are the most likely of
  // this whole batch to get blocked from a GitHub Actions IP — that's what
  // the health-check summary at the end of each run is for.
  { name: 'r/sociology', url: 'https://old.reddit.com/r/sociology/.rss', categories: ['forums', 'society'] },
  { name: 'r/anthropology', url: 'https://old.reddit.com/r/anthropology/.rss', categories: ['forums', 'society'] },
  { name: 'r/OutOfTheLoop', url: 'https://old.reddit.com/r/OutOfTheLoop/.rss', categories: ['forums'] },
  { name: 'r/CulturalStudies', url: 'https://old.reddit.com/r/CulturalStudies/.rss', categories: ['forums', 'culture'] },
  { name: 'r/SocialMedia', url: 'https://old.reddit.com/r/SocialMedia/.rss', categories: ['forums', 'internet-culture'] },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', categories: ['forums', 'tech'] },
  { name: 'Metafilter', url: 'https://www.metafilter.com/index.rdf', categories: ['forums'] },

  // Trend and youth culture
  { name: 'Trend Hunter', url: 'https://www.trendhunter.com/rss/current', categories: ['trends'] },
  // Skipped: Contagious and WGSN — paywalled, no open feed.

  // Added on request, checked individually:
  { name: 'Sixth Tone', url: 'https://www.sixthtone.com/rss', categories: ['culture', 'society'] },
  { name: 'AdWeek', url: 'https://www.adweek.com/feed/', categories: ['trends'] },
  { name: 'RSS.app (Culture)', url: 'https://rss.app/feeds/t21z0DlaT8iEl5Cs.xml', categories: ['culture'] },
  // Reddit's own RSS blocked a direct fetch attempt from this same tooling
  // during setup, before this ever reached GitHub Actions — a real signal,
  // not just caution. Included since you built it yourself, but expect the
  // health check to flag it.
  { name: 'r/news (multireddit)', url: 'https://www.reddit.com/user/the_malakinator/m/news.rss', categories: ['forums'] },
  // No confirmed feed found for mezha.net/eng — this is a WordPress-standard
  // /feed/ guess, unverified. If the health check flags it, the site likely
  // uses a different feed path or none at all.
  { name: 'Mezha (Eng)', url: 'https://mezha.net/eng/feed/', categories: ['society'] },
  // Bloomberg intentionally left out: its feed path disallows automated
  // access in robots.txt, and the original brief says not to scrape where
  // robots.txt forbids it. Add it to sources.json yourself if you want to
  // override that call.
  {
    name: 'Service95',
    url: 'https://www.service95.com/',
    categories: ['lifestyle', 'culture'],
    type: 'html',
  },
];

const parser = new Parser({
  headers: { 'User-Agent': USER_AGENT },
  timeout: 15000,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeId(link, title) {
  return crypto.createHash('sha1').update(link || title || '').digest('hex').slice(0, 16);
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400);
}

function extractImage(item) {
  if (item.enclosure?.url) return item.enclosure.url;
  const mediaContent = item['media:content'];
  if (mediaContent?.$?.url) return mediaContent.$.url;
  const html = item['content:encoded'] || item.content || '';
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    const items = (feed.items || []).map((item) => {
      const link = item.link || '';
      const title = item.title || 'Untitled';
      return {
        id: makeId(link, title),
        title,
        url: link,
        datePublished: item.isoDate || (item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()),
        category: source.categories,
        description: stripHtml(item.contentSnippet || item.content || item.summary || ''),
        author: item.creator || item.author || '',
        imageUrl: extractImage(item),
        source: source.name,
      };
    });
    return { items, error: null };
  } catch (err) {
    return { items: [], error: err.message };
  }
}

// Generic HTML scraper for sources with no RSS feed. Rather than guessing
// CSS selectors for a specific site's markup (fragile, breaks on redesign,
// and impossible to verify without seeing the site's actual class names),
// this pulls same-domain links with substantial link text off the page —
// a decent proxy for "headline links" on most listing/homepage layouts.
// Trade-offs vs a real feed: no reliable per-article publish date (uses
// scrape time instead) and no description/image.
async function scrapeHtmlListing(source) {
  try {
    const res = await axios.get(source.url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000,
    });
    const $ = cheerio.load(res.data);
    const host = new URL(source.url).hostname;
    const seen = new Set();
    const items = [];

    $('a[href]').each((_, el) => {
      if (items.length >= 25) return;
      const href = $(el).attr('href');
      if (!href) return;

      let url;
      try {
        url = new URL(href, source.url).href;
      } catch {
        return;
      }
      if (new URL(url).hostname !== host) return; // same-site links only

      const title = $(el).text().trim().replace(/\s+/g, ' ');
      // Filters out nav/footer/tag links, which tend to be short.
      if (!title || title.length < 15 || title.length > 200) return;
      if (seen.has(url)) return;
      seen.add(url);

      items.push({
        id: makeId(url, title),
        title,
        url,
        datePublished: new Date().toISOString(),
        category: source.categories,
        description: '',
        author: '',
        imageUrl: '',
        source: source.name,
      });
    });

    return { items, error: null };
  } catch (err) {
    return { items: [], error: err.message };
  }
}

async function loadCustomSources() {
  try {
    const raw = await readFile(SOURCES_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return (parsed.customSources || [])
      .filter((s) => s.type === 'rss' && s.url)
      .map((s) => ({ name: s.name || s.url, url: s.url, categories: s.categories || [] }));
  } catch (err) {
    console.warn(`[scraper] Could not read sources.json, skipping custom sources: ${err.message}`);
    return [];
  }
}

async function loadExistingArticles() {
  try {
    const raw = await readFile(DATA_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : parsed.articles || [];
  } catch {
    return [];
  }
}

// Flags any feed that came back broken or empty, so you don't have to check
// 40+ URLs by hand to find the ones that have drifted. Prints to the console
// either way, and — when run inside GitHub Actions — also writes to the job
// summary so it shows up as a readable table on the run's page, not just
// buried in the log.
function buildHealthReport(results) {
  const failed = results.filter((r) => r.status !== 'ok');
  const lines = [];

  lines.push('');
  lines.push('=== Feed health check ===');
  results.forEach((r) => {
    const icon = r.status === 'ok' ? '✓' : r.status === 'empty' ? '⚠' : '✗';
    const detail = r.status === 'error' ? r.error : `${r.count} item(s)`;
    lines.push(`${icon} ${r.name}: ${detail}`);
  });

  if (failed.length) {
    lines.push('');
    lines.push(`${failed.length} of ${results.length} source(s) need attention:`);
    failed.forEach((r) => {
      lines.push(`  - ${r.name} (${r.url}) — ${r.status === 'error' ? r.error : 'returned 0 items'}`);
    });
  } else {
    lines.push('');
    lines.push('All sources returned data.');
  }

  console.log(lines.join('\n'));

  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = results
      .map((r) => {
        const icon = r.status === 'ok' ? '✅' : r.status === 'empty' ? '⚠️' : '❌';
        const detail = r.status === 'error' ? r.error : `${r.count} item(s)`;
        return `| ${icon} | ${r.name} | ${detail} |`;
      })
      .join('\n');
    const summary = [
      '## Feed health check',
      failed.length
        ? `**${failed.length} of ${results.length} source(s) need attention.**`
        : '**All sources returned data.**',
      '',
      '| | Source | Result |',
      '|---|---|---|',
      rows,
    ].join('\n');
    return writeFile(process.env.GITHUB_STEP_SUMMARY, summary + '\n', { flag: 'a' });
  }
  return Promise.resolve();
}

async function main() {
  const customSources = await loadCustomSources();
  const allSources = [...BUILT_IN_SOURCES, ...customSources];

  console.log(`[scraper] Fetching ${allSources.length} source(s)...`);

  const fetched = [];
  const results = [];
  for (const source of allSources) {
    const strategy = source.type === 'html' ? scrapeHtmlListing : fetchFeed;
    const { items, error } = await strategy(source);
    const status = error ? 'error' : items.length === 0 ? 'empty' : 'ok';
    results.push({ name: source.name, url: source.url, status, count: items.length, error });
    console.log(
      `[scraper]   ${source.name}: ${error ? `error — ${error}` : `${items.length} item(s)`}`
    );
    fetched.push(...items);
    await sleep(REQUEST_DELAY_MS);
  }

  await buildHealthReport(results);

  const existing = await loadExistingArticles();
  const byId = new Map(existing.map((a) => [a.id, a]));
  fetched.forEach((a) => {
    if (!byId.has(a.id)) byId.set(a.id, a);
  });

  const merged = [...byId.values()]
    .sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished))
    .slice(0, MAX_ARTICLES);

  await mkdir(path.dirname(DATA_PATH), { recursive: true });
  await writeFile(
    DATA_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), articles: merged }, null, 2)
  );

  console.log(`[scraper] Wrote ${merged.length} article(s) to ${path.relative(ROOT, DATA_PATH)}`);
}

main().catch((err) => {
  console.error('[scraper] Fatal error:', err);
  process.exit(1);
});
