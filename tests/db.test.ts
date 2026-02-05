import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { LunamiraDB } from "../src/db";

describe("LunamiraDB", () => {
  let db: LunamiraDB;

  beforeEach(() => {
    // Use in-memory DB for testing to ensure isolation and speed
    db = new LunamiraDB(":memory:");
    db.init();
  });

  afterEach(() => {
    db.close();
  });

  test("should initialize tables correctly", () => {
    // We can verify table existence by querying sqlite_master
    const tables = db.getRawDb().query("SELECT name FROM sqlite_master WHERE type='table'").all().map((row: any) => row.name);
    expect(tables).toContain("sources");
    expect(tables).toContain("articles");
    expect(tables).toContain("tech_trends");
  });

  test("should insert and retrieve a source", () => {
    const source = {
      name: "TechCrunch",
      url: "https://techcrunch.com",
      priority: 1.5,
    };
    const id = db.insertSource(source);
    expect(id).toBeNumber();
    expect(id).toBeGreaterThan(0);

    const retrieved = db.getSource(id);
    expect(retrieved).not.toBeNull();
    if (retrieved) {
        expect(retrieved.name).toBe(source.name);
        expect(retrieved.url).toBe(source.url);
        expect(retrieved.priority).toBe(source.priority);
    }
  });

  test("should prevent duplicate source URLs", () => {
    const source = {
      name: "TechCrunch",
      url: "https://techcrunch.com",
      priority: 1.0,
    };
    db.insertSource(source);
    
    expect(() => {
      db.insertSource(source);
    }).toThrow(); 
  });

  test("should insert and retrieve an article", () => {
    const sourceId = db.insertSource({ name: "Src", url: "http://src.com" });
    const article = {
      source_id: sourceId,
      title: "New AI Model",
      url: "http://src.com/ai-model",
      summary: "It is fast.",
      published_at: "2026-02-05T12:00:00Z",
      type: "rss" as const,
    };

    const id = db.insertArticle(article);
    expect(id).toBeNumber();

    const retrieved = db.getArticle(id);
    expect(retrieved).not.toBeNull();
    if (retrieved) {
        expect(retrieved.title).toBe(article.title);
        expect(retrieved.url).toBe(article.url);
        expect(retrieved.is_reported).toBe(0); // Default value
    }
  });

  test("should handle duplicate article URLs (constraint violation)", () => {
     const sourceId = db.insertSource({ name: "Src", url: "http://src.com" });
     const article = {
       source_id: sourceId,
       title: "New AI Model",
       url: "http://src.com/ai-model",
       summary: "It is fast.",
       published_at: "2026-02-05T12:00:00Z",
       type: "rss" as const,
     };
 
     db.insertArticle(article);
     expect(() => {
         db.insertArticle(article);
     }).toThrow();
  });

  test("should insert and update tech trends", () => {
      db.upsertTrend("AI", 10.5);
      let trend = db.getTrend("AI");
      expect(trend).not.toBeNull();
      expect(trend?.heat_score).toBe(10.5);

      db.upsertTrend("AI", 20.0);
      trend = db.getTrend("AI");
      expect(trend?.heat_score).toBe(20.0);
  });
  
  test("should return null for non-existent records", () => {
      expect(db.getSource(999)).toBeNull();
      expect(db.getArticle(999)).toBeNull();
      expect(db.getTrend("NonExistent")).toBeNull();
  });

  test("should reject invalid article type", () => {
    const sourceId = db.insertSource({ name: "Src", url: "http://src.com" });
    const article = {
      source_id: sourceId,
      title: "New AI Model",
      url: "http://src.com/ai-model-2",
      published_at: "2026-02-05T12:00:00Z",
      type: "invalid_type" as any, // Bypass TS check
    };

    expect(() => {
        db.insertArticle(article);
    }).toThrow();
  });
});
