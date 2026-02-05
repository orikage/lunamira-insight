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

export interface ArticleScore {
  article_id: number;
  technical_density: number;
  trend_fit: number;
  total_score: number;
  explanation: string; // JSON string
  analyzed_at?: string;
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

  getAllTrends(): TechTrend[] {
    const query = this.db.query("SELECT * FROM tech_trends ORDER BY heat_score DESC");
    return query.all() as TechTrend[];
  }

  // Intelligence / Scores
  getUnscoredArticles(limit: number = 10): Article[] {
    const query = this.db.query(`
      SELECT a.* FROM articles a
      LEFT JOIN scores s ON a.id = s.article_id
      WHERE s.article_id IS NULL
      ORDER BY a.published_at DESC
      LIMIT $limit
    `);
    return query.all({ $limit: limit }) as Article[];
  }

  insertScore(score: ArticleScore) {
    const query = this.db.query(`
      INSERT INTO scores (article_id, technical_density, trend_fit, total_score, explanation, analyzed_at)
      VALUES ($article_id, $technical_density, $trend_fit, $total_score, $explanation, CURRENT_TIMESTAMP)
      ON CONFLICT(article_id) DO UPDATE SET
        technical_density = excluded.technical_density,
        trend_fit = excluded.trend_fit,
        total_score = excluded.total_score,
        explanation = excluded.explanation,
        analyzed_at = CURRENT_TIMESTAMP
    `);
    query.run({
      $article_id: score.article_id,
      $technical_density: score.technical_density,
      $trend_fit: score.trend_fit,
      $total_score: score.total_score,
      $explanation: score.explanation,
    });
  }

  getTopScoredArticles(limit: number = 50, sourceId?: number): (Article & ArticleScore & { source_name: string })[] {
    let sql = `
      SELECT a.*, s.technical_density, s.trend_fit, s.total_score, s.explanation, s.analyzed_at, src.name as source_name
      FROM articles a
      JOIN scores s ON a.id = s.article_id
      LEFT JOIN sources src ON a.source_id = src.id
    `;

    const params: any = { $limit: limit };

    if (sourceId !== undefined) {
      sql += ` WHERE a.source_id = $source_id`;
      params.$source_id = sourceId;
    }

    sql += ` ORDER BY s.total_score DESC LIMIT $limit`;

    const query = this.db.query(sql);
    return query.all(params) as any;
  }
}
