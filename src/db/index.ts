import { Database } from "bun:sqlite";
import { SCHEMA } from "./schema";

export interface Source {
  id?: number;
  name: string;
  url: string;
  priority?: number;
}

export interface Article {
  id?: number;
  source_id: number;
  title: string;
  url: string;
  summary?: string;
  published_at: string;
  type: "rss" | "tweet" | "api";
  content_hash?: string;
  is_reported?: number;
}

export interface TechTrend {
  keyword: string;
  heat_score: number;
  updated_at?: string;
}

export class LunamiraDB {
  private db: Database;

  constructor(path: string = "lunamira.sqlite") {
    this.db = new Database(path);
  }

  init() {
    this.db.run(SCHEMA);
  }

  close() {
    this.db.close();
  }

  getRawDb(): Database {
    return this.db;
  }

  // Sources
  insertSource(source: Source): number {
    const query = this.db.query(`
      INSERT INTO sources (name, url, priority)
      VALUES ($name, $url, $priority)
      RETURNING id
    `);
    const result = query.get({
      $name: source.name,
      $url: source.url,
      $priority: source.priority ?? 1.0,
    }) as { id: number };
    return result.id;
  }

  getSource(id: number): Source | null {
    const query = this.db.query("SELECT * FROM sources WHERE id = $id");
    return query.get({ $id: id }) as Source | null;
  }

  getAllSources(): Source[] {
    const query = this.db.query("SELECT * FROM sources");
    return query.all() as Source[];
  }

  // Articles
  insertArticle(article: Article): number {
    const query = this.db.query(`
      INSERT INTO articles (source_id, title, url, summary, published_at, type, content_hash, is_reported)
      VALUES ($source_id, $title, $url, $summary, $published_at, $type, $content_hash, $is_reported)
      RETURNING id
    `);
    const result = query.get({
      $source_id: article.source_id,
      $title: article.title,
      $url: article.url,
      $summary: article.summary ?? null,
      $published_at: article.published_at,
      $type: article.type,
      $content_hash: article.content_hash ?? null,
      $is_reported: article.is_reported ?? 0,
    }) as { id: number };
    return result.id;
  }

  getArticle(id: number): Article | null {
    const query = this.db.query("SELECT * FROM articles WHERE id = $id");
    return query.get({ $id: id }) as Article | null;
  }

  getArticleByUrl(url: string): Article | null {
    const query = this.db.query("SELECT * FROM articles WHERE url = $url");
    return query.get({ $url: url }) as Article | null;
  }

  // Tech Trends
  upsertTrend(keyword: string, heatScore: number) {
    const query = this.db.query(`
      INSERT INTO tech_trends (keyword, heat_score, updated_at)
      VALUES ($keyword, $heat_score, CURRENT_TIMESTAMP)
      ON CONFLICT(keyword) DO UPDATE SET
        heat_score = excluded.heat_score,
        updated_at = CURRENT_TIMESTAMP
    `);
    query.run({
      $keyword: keyword,
      $heat_score: heatScore,
    });
  }

  getTrend(keyword: string): TechTrend | null {
    const query = this.db.query("SELECT * FROM tech_trends WHERE keyword = $keyword");
    return query.get({ $keyword: keyword }) as TechTrend | null;
  }
}
