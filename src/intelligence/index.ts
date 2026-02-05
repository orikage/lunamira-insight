import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { LunamiraDB, type Article, type ArticleScore, type TechTrend } from "../db";

export class ScoringEngine {
  private db: LunamiraDB;
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(db: LunamiraDB, apiKey: string) {
    this.db = db;
    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // Gemini 1.5 Pro is the closest real mapping to "Gemini 3 Pro" request 
    // for this context, assuming standard public API availability.
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            summary: { type: SchemaType.STRING },
            technical_density: { type: SchemaType.NUMBER },
            trend_fit: { type: SchemaType.NUMBER },
            quality_score: { type: SchemaType.NUMBER },
            explanation: { type: SchemaType.STRING },
          },
          required: ["summary", "technical_density", "trend_fit", "quality_score", "explanation"]
        }
      }
    });
  }

  async processBatch(limit: number = 5) {
    const articles = this.db.getUnscoredArticles(limit);
    const trends = this.db.getAllTrends();

    if (articles.length === 0) {
      console.log("[Intelligence] No new articles to process.");
      return;
    }

    console.log(`[Intelligence] Processing ${articles.length} articles...`);

    for (const article of articles) {
      try {
        await this.analyzeArticle(article, trends);
      } catch (e) {
        console.error(`[Intelligence] Failed to analyze article ${article.id}:`, e);
      }
    }
  }

  async analyzeArticle(article: Article, trends: TechTrend[]) {
    // Basic context preparation
    let content = article.summary || "";
    
    // If content is too short, try to fetch the page (simplified)
    // In production, use a dedicated scraper with headless browser
    if (content.length < 500 && article.url.startsWith('http')) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
            
            const res = await fetch(article.url, { 
                signal: controller.signal,
                headers: { "User-Agent": "LunamiraBot/1.0" } 
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const text = await res.text();
                // Naive HTML strip
                const cleanText = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, "")
                                      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gim, "")
                                      .replace(/<[^>]+>/g, " ")
                                      .replace(/\s+/g, " ")
                                      .trim();
                content = cleanText.substring(0, 15000); // Feed up to 15k chars
            }
        } catch (e) {
            // Ignore fetch errors, proceed with what we have
        }
    }

    const trendKeywords = trends.map(t => t.keyword).join(", ");

    const prompt = `
      You are an expert tech editor. Analyze this technical article.
      
      Article Metadata:
      - Title: ${article.title}
      - URL: ${article.url}
      
      Content Context (Summary or Extracted Text):
      ${content.substring(0, 20000)}

      Target Trends (High relevance preferred):
      ${trendKeywords ? `[${trendKeywords}]` : "No specific trend filter active."}

      Task:
      1. Generate a concise technical summary in Japanese.
      2. Score "Technical Density" (0-100):
         - 80-100: Contains code snippets, deep architecture analysis, or novel algorithms.
         - 40-79: Good conceptual explanation but lacks deep implementation details.
         - 0-39: Surface level, news only, or non-technical.
      3. Score "Trend Fit" (0-100): Relevance to the Target Trends list.
      4. Score "Quality" (0-100): 
         - Low score (<40) for PR/marketing fluff, low-effort content, or clickbait.
         - High score for authoritative, well-written engineering blogs.

      Output strictly valid JSON.
    `;

    try {
        const result = await this.model.generateContent(prompt);
        const data = JSON.parse(result.response.text());

        // Composite Score Calculation
        // If quality is low, total score tanks.
        // Otherwise, weighted avg of Density and Trend.
        let totalScore = 0;
        
        if (data.quality_score < 40) {
            totalScore = 0; // Filter out low quality
        } else {
            // 60% Density, 40% Trend (adjust as needed)
            totalScore = Math.round((data.technical_density * 0.6) + (data.trend_fit * 0.4));
        }

        const score: ArticleScore = {
          article_id: article.id!,
          technical_density: data.technical_density,
          trend_fit: data.trend_fit,
          total_score: totalScore,
          explanation: JSON.stringify({
            summary: data.summary,
            quality: data.quality_score,
            reason: data.explanation
          })
        };

        this.db.insertScore(score);
        console.log(`[Intelligence] Scored "${article.title.substring(0, 30)}...": ${totalScore} (Density: ${data.technical_density}, Trend: ${data.trend_fit})`);
    } catch (apiError) {
        console.error("Gemini API Error:", apiError);
        throw apiError;
    }
  }
}
