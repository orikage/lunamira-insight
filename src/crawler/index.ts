import Parser from 'rss-parser';
import { LunamiraDB, type Article, type Source } from '../db';

interface CrawlResult {
  source: string;
  added: number;
  errors: string[];
}

export class RssCrawler {
  private db: LunamiraDB;
  private parser: Parser;

  constructor(db: LunamiraDB, parser?: Parser) {
    this.db = db;
    this.parser = parser || new Parser();
  }

  async run(): Promise<CrawlResult[]> {
    const sources = this.db.getAllSources();
    console.log(`[Crawler] Found ${sources.length} sources.`);

    const results = await Promise.allSettled(
      sources.map(source => this.processSource(source))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          source: sources[index].name,
          added: 0,
          errors: [String(result.reason)]
        };
      }
    });
  }

  private async processSource(source: Source): Promise<CrawlResult> {
    const result: CrawlResult = {
      source: source.name,
      added: 0,
      errors: []
    };

    if (!source.id) {
      result.errors.push("Source ID missing");
      return result;
    }

    try {
      const feed = await this.parser.parseURL(source.url);

      for (const item of feed.items) {
        if (!item.link || !item.title) continue;

        // Check for duplicates (Application side check)
        const existing = this.db.getArticleByUrl(item.link);
        if (existing) {
          continue;
        }

        const publishedAt = item.isoDate || (item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString());

        const article: Article = {
          source_id: source.id,
          title: item.title,
          url: item.link,
          summary: item.contentSnippet || item.content,
          published_at: publishedAt,
          type: 'rss',
          content_hash: undefined // Could implement hashing if needed
        };

        try {
          this.db.insertArticle(article);
          result.added++;
        } catch (e) {
          // DB Constraint check might fail if race condition or other issue
          if (String(e).includes('UNIQUE constraint failed')) {
            // Duplicate ignored
          } else {
            result.errors.push(`Failed to insert article ${item.link}: ${e}`);
          }
        }
      }
    } catch (e) {
      result.errors.push(`Failed to parse feed ${source.url}: ${e}`);
    }

    return result;
  }
}
