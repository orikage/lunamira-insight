# Lunamira Insight v5.0: Technical Specification (Revised v2)

**Version:** 5.0.0
**Date:** 2026-02-05
**Runtime:** Bun
**Framework:** Hono
**Target System:** Local Low-Spec Server / Docker / SQLite

---

## 1. システム概要 & アーキテクチャ

Lunamira Insight v5.0は、**Bun × Hono** を核とした超軽量・高密度な技術情報キュレーションプラットフォームです。
Next.js などの重厚なフレームワークを排し、Proxmox/Docker 環境のリソースを最小限に抑えつつ、ミリ秒単位の応答速度とタクティカルな UI 体験を実現します。

### 1.1 アーキテクチャ図 (Data Flow)

```mermaid
graph TD
    subgraph Data Sources
        RSS[RSS/Atom Feeds (x50+)]
        HN[Hacker News API]
        TW_FLOW[Twitter Tech Flow (Search/Trending)]
    end

    subgraph "Backend Engine (Python/Bun)"
        Crawler[Async Crawler Engine - Python]
        FlowParser[Tech Trend Analyzer - Python]
    end

    subgraph "Storage Layer (SQLite)"
        DB[(LunamiraDB.sqlite)]
    end

    subgraph "Application Layer (Hono on Bun)"
        Server[Hono Web Server]
        Scorer[Quality Scoring Engine]
        Gemini[Gemini 3 Pro API]
    end

    subgraph "Presentation Layer (Hono/JSX)"
        UI[Tactical Dashboard UI]
        Styles[Tailwind CSS]
    end

    RSS --> Crawler
    HN --> Crawler
    TW_FLOW --> FlowParser
    
    Crawler -->|Raw Metadata| DB
    FlowParser -->|Market Trend Indicators| DB

    DB --> Server
    Server --> Scorer
    Scorer -->|Filtering/Ranking| Gemini
    Gemini --> Scorer
    
    Server --> UI
    UI -->|Rendered HTML| Client[Master Browser]
```

### 1.2 コアコンセプト
1.  **Hono × Bun × Docker:** 2026年の最軽量スタック。Node.jsより高速な実行環境（Bun）と、シンプルで型安全なエンジン（Hono）を採用。
2.  **SQLite Centric:** 全ての永続データをSQLiteで管理。ファイル1つでバックアップ可能。
3.  **No-JS UI (Partial Hydration):** クライアント側のJavaScriptを最小限にし、サーバー側でJSXを高速レンダリング。低スペック環境での快適さを追求。
4.  **Community-Driven Curation:** Twitter上の著名アカウントや技術トレンドから「エンジニア界隈の熱気」を抽出し、客観的なキュレーションを行う。

---

## 2. 技術スタック

| レイヤー | 採用技術 | 役割 |
|---|---|---|
| **Runtime** | Bun | 高速実行環境。TS直接実行、パッケージ管理。 |
| **Framework** | Hono | メインエンジン。ルーティング、API、JSX生成。 |
| **UI System** | Hono/JSX + Tailwind CSS | コンポーネント開発とスタイリング。 |
| **Database** | SQLite (Better-SQLite3 / Bun:sqlite) | 記事・履歴・トレンドの永続化。 |
| **Infrastructure** | Docker | パッケージングと環境の分離。 |
| **Intelligence** | Gemini 3 Pro | 記事の品質フィルタリングと要約。 |

---

## 3. データベース物理設計 (SQLite)

### 3.1 テーブル定義

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
    content_hash TEXT,
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

## 4. フロントエンド (Tactical UI)

コンセプト: **「アークナイツ・エンドフィールド」風 タクティカル・ブルータリズム**

### 4.1 デザイン原則
-   **Colors:** Background `#0a0a0a`, Primary `#e2ff00` (Acid Lime), Secondary `#00f0ff` (Cyan)
-   **Typography:** `JetBrains Mono`
-   **演出:** Hono/JSXによる高速表示。CSSアニメーションによるグリッチ演出、HUDステータス表示。

---

## 5. 運用プラン
-   **Docker Compose:** Webサーバー、クローラ、DBを統合管理。
-   **Deployment:** Cloudflare Tunnel を通じた安全な外部公開（任意）。
