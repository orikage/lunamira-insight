export const SCHEMA = `
-- 収集ソース
CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    priority REAL DEFAULT 1.0
);

-- 記事・情報の蓄積
CREATE TABLE IF NOT EXISTS articles (
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
CREATE TABLE IF NOT EXISTS tech_trends (
    keyword TEXT PRIMARY KEY,
    heat_score REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;
