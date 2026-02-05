import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { LunamiraDB } from "../src/db";
import { createApp } from "../src/index";

describe("UI Endpoints", () => {
  let db: LunamiraDB;
  let app: any;

  beforeEach(() => {
    db = new LunamiraDB(":memory:");
    db.init();
    app = createApp(db);

    // Seed Data
    const sourceId = db.insertSource({ name: "TechCrunch", url: "https://techcrunch.com", priority: 1.0 });
    
    // Article 1 (High Score)
    const art1 = db.insertArticle({
        source_id: sourceId,
        title: "Revolutionary AI Model",
        url: "https://techcrunch.com/ai-revolution",
        summary: "Big news about AI.",
        published_at: new Date().toISOString(),
        type: "rss"
    });
    db.insertScore({
        article_id: art1,
        technical_density: 90,
        trend_fit: 95,
        total_score: 92,
        explanation: JSON.stringify({ summary: "Very important.", details: "Details here." }),
    });

    // Article 2 (Low Score)
    const art2 = db.insertArticle({
        source_id: sourceId,
        title: "Minor Update",
        url: "https://techcrunch.com/minor-update",
        summary: "Small fix.",
        published_at: new Date().toISOString(),
        type: "rss"
    });
    db.insertScore({
        article_id: art2,
        technical_density: 20,
        trend_fit: 30,
        total_score: 25,
        explanation: "Just a minor update.",
    });

    // Article 3 (Twitter)
    const art3 = db.insertArticle({
        source_id: sourceId,
        title: "Leaked Info",
        url: "https://twitter.com/leaker/status/123",
        summary: "Leak.",
        published_at: new Date().toISOString(),
        type: "tweet"
    });
    db.insertScore({
        article_id: art3,
        technical_density: 80,
        trend_fit: 90,
        total_score: 85,
        explanation: "High impact leak.",
    });
  });

  afterEach(() => {
    db.close();
  });

  test("GET / should return HTML with article list", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const html = await res.text();
    
    // Check for title
    expect(html).toContain("LUNAMIRA");
    expect(html).toContain("INSIGHT");
    
    // Check for articles
    expect(html).toContain("Revolutionary AI Model");
    expect(html).toContain("Minor Update");
    expect(html).toContain("Leaked Info");

    // Check for styling classes (Tactical UI)
    expect(html).toContain("text-tactical-lime");
    expect(html).toContain("bg-tactical-bg");
    expect(html).toContain("font-mono");
    
    // Check score ordering (High score first)
    const idx1 = html.indexOf("Revolutionary AI Model");
    const idx2 = html.indexOf("Minor Update");
    expect(idx1).toBeLessThan(idx2);
  });

  test("GET /article/:id should return detail HTML", async () => {
    // Get the ID of the first article (we inserted it first, so likely 1, but let's query DB to be safe)
    const article = db.getArticleByUrl("https://techcrunch.com/ai-revolution");
    expect(article).not.toBeNull();
    
    const res = await app.request(`/article/${article!.id}`);
    expect(res.status).toBe(200);
    const html = await res.text();

    expect(html).toContain("Revolutionary AI Model");
    expect(html).toContain("Analysis"); // Header in detail view
    expect(html).toContain("Very important."); // From explanation
    expect(html).toContain("92"); // Score
  });

  test("GET /article/:id with invalid ID should return 404", async () => {
    const res = await app.request("/article/9999");
    expect(res.status).toBe(404);
  });

  test("Twitter articles should have special styling", async () => {
     const res = await app.request("/");
     const html = await res.text();
     
     // We can't easily parse classes per element without a DOM parser, 
     // but we can check if the class exists in the document when we know a tweet is present.
     expect(html).toContain("border-tactical-cyan"); // Tweet styling
  });

  test("GET /?source_id=X should filter articles", async () => {
     // Find TechCrunch source ID
     const source = db.getAllSources().find(s => s.name === "TechCrunch");
     expect(source).not.toBeUndefined();
     
     // Request with filter
     const res = await app.request(`/?source_id=${source!.id}`);
     expect(res.status).toBe(200);
     const html = await res.text();
     
     // Should contain TechCrunch articles
     expect(html).toContain("Revolutionary AI Model");
     
     // Should NOT contain articles from other sources if we had any (currently we only seeded one source, but let's add another source to test proper filtering)
  });

  test("Filtering should exclude other sources", async () => {
      // Add another source and article
      const otherSourceId = db.insertSource({ name: "OtherNews", url: "https://other.com" });
      const otherArt = db.insertArticle({
          source_id: otherSourceId,
          title: "Other News Story",
          url: "https://other.com/story",
          published_at: new Date().toISOString(),
          type: "rss"
      });
      db.insertScore({
          article_id: otherArt,
          technical_density: 50,
          trend_fit: 50,
          total_score: 50,
          explanation: "Other.",
      });

      // Filter for TechCrunch only
      const techCrunchId = db.getAllSources().find(s => s.name === "TechCrunch")!.id;
      const res = await app.request(`/?source_id=${techCrunchId}`);
      const html = await res.text();

      expect(html).toContain("Revolutionary AI Model");
      expect(html).not.toContain("Other News Story");
  });
});
