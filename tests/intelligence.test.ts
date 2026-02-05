import { describe, it, expect, mock, beforeAll, afterAll } from "bun:test";
import { ScoringEngine } from "../src/intelligence";
import { LunamiraDB } from "../src/db";

// Mock GoogleGenerativeAI
const mockGenerateContent = mock(async () => ({
  response: {
    text: () => JSON.stringify({
      summary: "AI-generated summary",
      technical_density: 85,
      trend_fit: 90,
      quality_score: 80,
      explanation: "Excellent deep dive."
    })
  }
}));

mock.module("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    constructor() {}
    getGenerativeModel() {
      return {
        generateContent: mockGenerateContent
      };
    }
  },
  SchemaType: {
    STRING: "STRING",
    NUMBER: "NUMBER",
    OBJECT: "OBJECT"
  }
}));

describe("ScoringEngine", () => {
  let db: LunamiraDB;
  let engine: ScoringEngine;

  beforeAll(() => {
    // Setup in-memory DB
    db = new LunamiraDB(":memory:");
    db.init();
    
    // Seed Data
    db.insertSource({ name: "Test Blog", url: "https://example.com/feed" });
    db.insertArticle({
      source_id: 1,
      title: "Deep Learning with Bun",
      url: "https://example.com/article1",
      published_at: new Date().toISOString(),
      type: "rss",
      summary: "A short summary."
    });
    db.upsertTrend("Bun", 100);

    engine = new ScoringEngine(db, "fake-api-key");
  });

  afterAll(() => {
    db.close();
  });

  it("should analyze unscored articles and save scores", async () => {
    await engine.processBatch(5);

    // Verify Gemini was called
    expect(mockGenerateContent).toHaveBeenCalled();

    // Check DB for scores
    const rawDb = db.getRawDb();
    const scores = rawDb.query("SELECT * FROM scores WHERE article_id = 1").all() as any[];
    
    expect(scores.length).toBe(1);
    expect(scores[0].technical_density).toBe(85);
    // 85 * 0.6 + 90 * 0.4 = 51 + 36 = 87
    expect(scores[0].total_score).toBe(87);
    
    // Parse explanation to check JSON structure
    const explanation = JSON.parse(scores[0].explanation);
    expect(explanation.summary).toBe("AI-generated summary");
  });

  it("should handle low quality articles by setting score to 0", async () => {
    // Override mock for this test
    mockGenerateContent.mockImplementationOnce(async () => ({
      response: {
        text: () => JSON.stringify({
          summary: "Spam",
          technical_density: 10,
          trend_fit: 10,
          quality_score: 20, // Low quality
          explanation: "Spam content"
        })
      }
    }));

    // Add another article
    db.insertArticle({
      source_id: 1,
      title: "Spam Article",
      url: "https://example.com/spam",
      published_at: new Date().toISOString(),
      type: "rss"
    });

    // Re-run batch
    await engine.processBatch(5);

    const rawDb = db.getRawDb();
    // Assuming article_id 2 is the new one
    const score = rawDb.query("SELECT * FROM scores WHERE article_id = 2").get() as any;
    
    expect(score).toBeDefined();
    expect(score.total_score).toBe(0);
  });
});
