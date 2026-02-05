import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { RssCrawler } from "../src/crawler";
import { LunamiraDB } from "../src/db";
import Parser from "rss-parser";
import { Database } from "bun:sqlite";

describe("RssCrawler", () => {
  let db: LunamiraDB;
  let crawler: RssCrawler;
  let mockParser: Parser;

  beforeEach(() => {
    // Use in-memory DB for tests
    db = new LunamiraDB(":memory:");
    db.init();

    // Mock Parser
    mockParser = new Parser();
    mockParser.parseURL = mock(async (url: string) => {
      // Default mock implementation
      return { items: [] } as any;
    });

    crawler = new RssCrawler(db, mockParser);
  });

  afterEach(() => {
    db.close();
  });

  it("should fetch articles from sources and save them", async () => {
    // Setup source
    const sourceId = db.insertSource({
      name: "Test Feed",
      url: "http://example.com/rss",
      priority: 1
    });

    // Setup mock feed response
    const mockFeed = {
      items: [
        {
          title: "New Article",
          link: "http://example.com/article1",
          pubDate: "2025-01-01T10:00:00Z",
          contentSnippet: "Summary 1"
        },
        {
          title: "Another Article",
          link: "http://example.com/article2",
          isoDate: "2025-01-02T10:00:00Z",
          contentSnippet: "Summary 2"
        }
      ]
    };
    (mockParser.parseURL as any).mockResolvedValue(mockFeed);

    const results = await crawler.run();

    // Verify results
    expect(results).toHaveLength(1);
    expect(results[0].added).toBe(2);
    expect(results[0].errors).toHaveLength(0);

    // Verify DB
    const articles = db.getRawDb().query("SELECT * FROM articles").all() as any[];
    expect(articles).toHaveLength(2);
    expect(articles[0].title).toBe("New Article");
    expect(articles[1].title).toBe("Another Article");
  });

  it("should ignore duplicate articles (application side check)", async () => {
    // Setup source
    const sourceId = db.insertSource({
      name: "Test Feed",
      url: "http://example.com/rss",
    });

    // Pre-insert an article
    db.insertArticle({
      source_id: sourceId,
      title: "Existing Article",
      url: "http://example.com/article1",
      published_at: "2025-01-01T10:00:00Z",
      type: "rss"
    });

    // Setup mock feed with one new and one existing
    const mockFeed = {
      items: [
        {
          title: "Existing Article",
          link: "http://example.com/article1", // Duplicate
          isoDate: "2025-01-01T10:00:00Z"
        },
        {
          title: "New Article",
          link: "http://example.com/article2", // New
          isoDate: "2025-01-02T10:00:00Z"
        }
      ]
    };
    (mockParser.parseURL as any).mockResolvedValue(mockFeed);

    const results = await crawler.run();

    expect(results[0].added).toBe(1); // Only 1 added
    const articles = db.getRawDb().query("SELECT * FROM articles").all();
    expect(articles).toHaveLength(2); // 1 existing + 1 new
  });

  it("should handle broken RSS feeds gracefully", async () => {
     db.insertSource({
      name: "Broken Feed",
      url: "http://broken.com/rss",
    });

    (mockParser.parseURL as any).mockRejectedValue(new Error("Network Error"));

    const results = await crawler.run();

    expect(results[0].added).toBe(0);
    expect(results[0].errors).toHaveLength(1);
    expect(results[0].errors[0]).toContain("Network Error");
  });

  it("should handle multiple sources in parallel", async () => {
    db.insertSource({ name: "Feed 1", url: "http://feed1.com" });
    db.insertSource({ name: "Feed 2", url: "http://feed2.com" });

    (mockParser.parseURL as any).mockImplementation(async (url: string) => {
      if (url === "http://feed1.com") {
        return { items: [{ title: "A1", link: "http://feed1.com/1" }] };
      }
      if (url === "http://feed2.com") {
        return { items: [{ title: "A2", link: "http://feed2.com/1" }] };
      }
      return { items: [] };
    });

    const results = await crawler.run();

    expect(results).toHaveLength(2);
    const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
    expect(totalAdded).toBe(2);
  });
});
