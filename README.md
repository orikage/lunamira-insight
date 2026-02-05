# Lunamira Insight v5.0: Technical Specification (Revised)

**Version:** 5.0.0
**Date:** 2026-02-05
**Target System:** Local Low-Spec Server / SQLite / SSG

---

## 1. システム概要 & アーキテクチャ

Lunamira Insight v5.0は、静的ビルド(SSG)とローカル**SQLite**を中心とした、高効率・低レイテンシな技術情報キュレーションプラットフォームです。
過度なパーソナライズ（ユーザーの個人的なツイートからの推論）を廃止し、**「技術コミュニティ全体の流れ（Twitter Flow）」**と**「信頼できるソース」**を統合して客観的な技術ニュースを提供します。

### 1.1 アーキテクチャ図 (Data Flow)

```mermaid
graph TD
    subgraph Data Sources
        RSS[RSS/Atom Feeds (x50+)]
        HN[Hacker News API]
        TW_FLOW[Twitter Tech Flow (Search/Trending)]
    end

    subgraph "Ingestion Layer (Python)"
        Crawler[Async Crawler Engine]
        FlowParser[Tech Trend Analyzer]
    end

    subgraph "Storage Layer (SQLite)"
        DB[(LunamiraDB.sqlite)]
    end

    subgraph "Intelligence Layer (Python/Gemini)"
        Scorer[Quality Scoring Engine]
        Gemini[Gemini 3 Pro API]
    end

    subgraph "Presentation Layer (Node.js)"
        SSG[Next.js Builder]
        UI[Tactical Dashboard UI]
    end

    RSS --> Crawler
    HN --> Crawler
    TW_FLOW --> FlowParser
    
    Crawler -->|Raw Metadata| DB
    FlowParser -->|Market Trend Indicators| DB

    DB --> Scorer
    Scorer -->|Filtering/Ranking| DB

    DB --> SSG
    SSG -->|Static HTML/JS| UI
```

### 1.2 コアコンセプト
1.  **Local-First & Static:** サーバーサイドでの動的レンダリングを廃止。全てを静的ファイルとして配信し、サーバー負荷を極限まで下げる。
2.  **SQLite Focused:** データベースはSQLite一段に絞り、複雑な外部DB（Vector DB等）は使用しない。
3.  **Community-Driven Curation:** マスター個人の発言ではなく、Twitter上の著名な技術アカウントや活発な技術トピックから「今のエンジニア界隈の熱気」を抽出し、キュレーションに反映させる。

---

## 2. データベース物理設計 (SQLite)

### 2.1 テーブル定義

```sql
-- 収集ソース
CREATE TABLE sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    priority REAL DEFAULT 1.0
);

-- 記事・情報の蓄積
CREATE TABLE articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    summary TEXT,
    published_at DATETIME NOT NULL,
    type TEXT CHECK(type IN ('rss', 'tweet', 'api')),
    content_hash TEXT, -- 重複排除用
    is_reported INTEGER DEFAULT 0,
    FOREIGN KEY(source_id) REFERENCES sources(id)
);

-- キーワードトレンド
CREATE TABLE tech_trends (
    keyword TEXT PRIMARY KEY,
    heat_score REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. インテリジェンス層 (アルゴリズム)

### 3.1 重複排除
-   **URL・タイトルハッシュ一致:** 同一情報の再表示を完全にブロック。

### 3.2 スコアリング
-   **Community Heat:** Twitter等で話題になっているキーワードを含む記事に加点。
-   **Freshness:** 公開日時が新しいものを優先。
-   **Quality Filter:** Gemini 3 Proが「中身のないポエム記事」を自動で低スコア化。

---

## 4. フロントエンド (Tactical UI)

コンセプト: **「アークナイツ・エンドフィールド」風 タクティカル・ブルータリズム**

### 4.1 デザイン原則
-   **Colors:** Background `#0a0a0a`, Primary `#e2ff00` (Acid Lime), Secondary `#00f0ff` (Cyan)
-   **UI演出:** グリッチ効果、HUDステータス表示、タイプライター風要約表示

---

## 5. 運用プラン
-   **Cron:** 毎時実行。バックエンド処理 → SSGビルド → デプロイのサイクルを完結。
-   **Persistence:** `news-state.json` および SQLite により永続的な既読管理を実現。
