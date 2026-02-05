# Lunamira Insight v5.0: Technical Specification

**Version:** 5.0.0-draft
**Date:** 2026-02-05
**Target System:** Local Low-Spec Server / SQLite / SSG

---

## 1. システム概要 & アーキテクチャ

Lunamira Insight v5.0は、静的ビルド(SSG)とローカルSQLiteを中心とした、高効率・低レイテンシな技術情報キュレーションプラットフォームです。外部APIへの依存を最小限に抑えつつ、Gemini 3 Proを用いた高度なベクトル解析により、マスターの「現在の文脈」に即した情報をフィルタリングします。

### 1.1 アーキテクチャ図 (Data Flow)

```mermaid
graph TD
    subgraph Data Sources
        RSS[RSS/Atom Feeds (x50+)]
        HN[Hacker News API]
        TW[Twitter Logs (Local DB)]
    end

    subgraph "Ingestion Layer (Python)"
        Crawler[Async Crawler Engine]
        TwitterParser[Interest Extractor]
    end

    subgraph "Storage Layer (SQLite)"
        DB[(LunamiraDB.sqlite)]
    end

    subgraph "Intelligence Layer (Python/Gemini)"
        Embedder[Vector Embedding Worker]
        Scorer[Contextual Scoring Engine]
        Gemini[Gemini 3 Pro API]
    end

    subgraph "Presentation Layer (Node.js)"
        SSG[Next.js Builder]
        UI[Tactical Dashboard UI]
    end

    RSS --> Crawler
    HN --> Crawler
    TW --> TwitterParser
    
    Crawler -->|Raw Metadata| DB
    TwitterParser -->|User Context Vectors| DB

    DB --> Embedder
    Embedder -->|Text Chunks| Gemini
    Gemini -->|Vectors| Embedder
    Embedder -->|Vector Update| DB

    DB --> Scorer
    Scorer -->|Ranked Items| DB

    DB --> SSG
    SSG -->|Static HTML/JS| UI
```

---

## 2. データベース物理設計 (SQLite)

ファイルパス: `/data/lunamira_v5.db`
モード: WAL (Write-Ahead Logging) 有効化推奨。

### 2.1 テーブル定義

```sql
-- 収集ソース定義
CREATE TABLE sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    type TEXT CHECK(type IN ('rss', 'api_hn', 'api_custom')),
    fetch_interval_min INTEGER DEFAULT 60,
    last_fetched_at DATETIME,
    priority_weight REAL DEFAULT 1.0
);

-- 記事本体
CREATE TABLE articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER,
    external_id TEXT,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    summary TEXT,
    published_at DATETIME NOT NULL,
    crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    content_hash TEXT,
    FOREIGN KEY(source_id) REFERENCES sources(id)
);

-- 記事の埋め込みベクトル
CREATE TABLE article_vectors (
    article_id INTEGER PRIMARY KEY,
    embedding BLOB NOT NULL,
    FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- マスターの興味・文脈プロファイル
CREATE TABLE user_contexts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    context_type TEXT CHECK(context_type IN ('tweet_log', 'project_spec', 'manual_interest')),
    content TEXT,
    embedding BLOB NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    decay_factor REAL DEFAULT 1.0
);
```

---

## 3. インテリジェンス層 (アルゴリズム)

### 3.1 ベクトル化戦略
-   **モデル:** Gemini 3 Pro (Embedding model: `text-embeddings-004`)
-   **対象:** 記事の `title` + `summary`

### 3.2 重複排除
1.  **LSH (MinHash):** テキスト表層の類似度判定。
2.  **Cosine Similarity:** 類似度が **0.95以上** の記事は重複として統合。

---

## 4. フロントエンド (Tactical UI)

コンセプト: **「アークナイツ・エンドフィールド」風 タクティカル・ブルータリズム**

### 4.1 デザイン原則
-   **Colors:** Background `#0a0a0a`, Primary `#e2ff00`, Secondary `#00f0ff`
-   **Typography:** `JetBrains Mono`
-   **UI演出:** グリッチ効果、HUDステータス表示、タイプライター風要約

---

## 5. 運用プラン
-   **Cron:** 毎時実行。バックエンド処理 → SSGビルド → デプロイのサイクルを完結。
-   **Failover:** API制限時は時系列順に自動フォールバック。
