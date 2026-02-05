import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { LunamiraDB } from './db';
import type { FC } from 'hono/jsx';
import { html } from 'hono/html';

// --- Configuration & Styles ---
const THEME = {
  bg: '#0a0a0a',
  primary: '#e2ff00', // Acid Lime
  secondary: '#00f0ff', // Cyan
  font: 'JetBrains Mono',
};

const TAILWIND_SCRIPT = html`
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          tactical: {
            bg: '${THEME.bg}',
            lime: '${THEME.primary}',
            cyan: '${THEME.secondary}',
            dark: '#111111',
            panel: '#0f0f0f',
          }
        },
        fontFamily: {
          mono: ['"${THEME.font}"', 'monospace'],
        },
        animation: {
          'glitch': 'glitch 0.3s cubic-bezier(.25, .46, .45, .94) both infinite',
          'scanline': 'scanline 8s linear infinite',
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
        keyframes: {
          glitch: {
            '0%': { transform: 'translate(0)' },
            '20%': { transform: 'translate(-2px, 2px)' },
            '40%': { transform: 'translate(-2px, -2px)' },
            '60%': { transform: 'translate(2px, 2px)' },
            '80%': { transform: 'translate(2px, -2px)' },
            '100%': { transform: 'translate(0)' },
          },
          scanline: {
            '0%': { transform: 'translateY(-100%)' },
            '100%': { transform: 'translateY(100%)' },
          }
        }
      }
    }
  }
</script>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap" rel="stylesheet">
<style type="text/tailwindcss">
  @layer utilities {
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
    .text-glow {
        text-shadow: 0 0 5px rgba(226, 255, 0, 0.5);
    }
    .text-glow-cyan {
        text-shadow: 0 0 5px rgba(0, 240, 255, 0.5);
    }
    .border-glow {
        box-shadow: 0 0 5px rgba(226, 255, 0, 0.3);
    }
    .clip-corner {
        clip-path: polygon(
            0 0, 
            100% 0, 
            100% calc(100% - 10px), 
            calc(100% - 10px) 100%, 
            0 100%
        );
    }
  }
  body {
    background-color: ${THEME.bg};
    color: #e5e5e5;
    background-image: 
        linear-gradient(rgba(18, 18, 18, 0.8) 1px, transparent 1px),
        linear-gradient(90deg, rgba(18, 18, 18, 0.8) 1px, transparent 1px);
    background-size: 20px 20px;
  }
  .scanline-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
        to bottom,
        rgba(255,255,255,0),
        rgba(255,255,255,0) 50%,
        rgba(0,0,0,0.1) 50%,
        rgba(0,0,0,0.1)
    );
    background-size: 100% 4px;
    pointer-events: none;
    z-index: 50;
    opacity: 0.3;
  }
</style>
`;

// --- Components ---

const Layout: FC<{ children: any; title?: string }> = ({ children, title = "LUNAMIRA // INSIGHT" }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        {TAILWIND_SCRIPT}
      </head>
      <body class="font-mono h-screen flex flex-col overflow-hidden selection:bg-tactical-lime selection:text-black">
        <div class="scanline-overlay"></div>
        
        {/* Header HUD */}
        <header class="border-b border-white/10 bg-tactical-bg/90 backdrop-blur-sm z-40 shrink-0">
          <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <a href="/" class="flex items-center gap-4 hover:opacity-80 transition-opacity">
                <div class="w-2 h-2 bg-tactical-lime animate-pulse"></div>
                <h1 class="text-2xl font-bold tracking-tighter text-white">
                  LUNAMIRA <span class="text-tactical-lime text-glow">INSIGHT</span>
                </h1>
              </a>
              <div class="hidden md:flex items-center gap-2 text-xs text-white/40 border-l border-white/10 pl-4 ml-4">
                <span>SYS.STATUS</span>
                <span class="text-tactical-cyan">ONLINE</span>
                <span>::</span>
                <span>DB.CONN</span>
                <span class="text-tactical-cyan">ACTIVE</span>
              </div>
            </div>
            <div class="flex items-center gap-6 text-xs uppercase tracking-widest">
                <div class="flex flex-col items-end">
                    <span class="text-white/40">PHASE 4</span>
                    <span class="text-tactical-lime">TACTICAL UI</span>
                </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main class="flex-1 overflow-y-auto scrollbar-hide relative">
            <div class="max-w-7xl mx-auto p-4 md:p-8">
                {children}
            </div>
        </main>
      </body>
    </html>
  );
};

const ArticleCard: FC<{ article: any; rank: number }> = ({ article, rank }) => {
  const isTwitter = article.type === 'tweet';
  const scoreColor = article.total_score >= 80 ? 'text-tactical-lime' : article.total_score >= 50 ? 'text-tactical-cyan' : 'text-white/50';
  const borderColor = isTwitter ? 'border-tactical-cyan/50 hover:border-tactical-cyan' : 'border-white/10 hover:border-tactical-lime';
  const glowClass = isTwitter ? 'shadow-[0_0_15px_rgba(0,240,255,0.1)]' : 'hover:shadow-[0_0_15px_rgba(226,255,0,0.15)]';

  return (
    <div 
      class={`group relative border bg-tactical-panel/50 backdrop-blur-sm p-4 transition-all duration-200 cursor-pointer overflow-hidden ${borderColor} ${glowClass}`}
      onClick={`openDetail(${article.id})`}
    >
        {/* Decorative Corner */}
        <div class="absolute top-0 right-0 w-8 h-8">
             <div class={`absolute top-0 right-0 w-full h-full border-t border-r transition-colors duration-200 ${isTwitter ? 'border-tactical-cyan' : 'border-white/20 group-hover:border-tactical-lime'}`}></div>
             <div class="absolute top-0 right-0 w-0 h-0 border-t-[10px] border-r-[10px] border-t-transparent border-r-transparent group-hover:border-r-tactical-lime/50 transition-all"></div>
        </div>
        
        {/* Rank & Score */}
        <div class="flex justify-between items-start mb-2">
            <span class="text-xs font-bold text-white/30">#{String(rank).padStart(2, '0')}</span>
            <div class="flex flex-col items-end">
                <span class={`text-2xl font-bold tracking-tighter ${scoreColor} text-glow`}>
                    {article.total_score}
                </span>
                <span class="text-[10px] text-white/40 uppercase">Score</span>
            </div>
        </div>

        {/* Title */}
        <h3 class="text-sm font-bold text-white leading-tight mb-3 group-hover:text-tactical-lime transition-colors line-clamp-2 min-h-[2.5em]">
            {article.title}
        </h3>

        {/* Meta Grid */}
        <div class="grid grid-cols-2 gap-2 text-[10px] text-white/50 uppercase border-t border-white/5 pt-2 mt-2">
            <div>
                <span class="block text-white/30">Source</span>
                <span class="truncate block text-tactical-cyan">{article.source_name || 'UNKNOWN'}</span>
            </div>
            <div class="text-right">
                <span class="block text-white/30">Type</span>
                <span class={isTwitter ? 'text-blue-400' : 'text-white/70'}>{article.type}</span>
            </div>
        </div>
        
        {/* Tech Density Indicator */}
        <div class="mt-3 flex items-center gap-1">
            <div class="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                    class="h-full bg-tactical-lime/50" 
                    style={{ width: `${article.technical_density}%` }}
                ></div>
            </div>
            <span class="text-[9px] text-white/30">DENSITY</span>
        </div>

        {/* Hover Effect Overlay */}
        <div class="absolute inset-0 bg-tactical-lime/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200"></div>
    </div>
  );
};

// --- Factory & Exports ---

export function createApp(db: LunamiraDB) {
    const app = new Hono();

    app.get('/', (c) => {
      const sourceId = c.req.query('source_id') ? parseInt(c.req.query('source_id')!) : undefined;
      const articles = db.getTopScoredArticles(50, sourceId);
      const sources = db.getAllSources();
      
      return c.html(
        <Layout>
          <div class="flex flex-col gap-8">
            {/* Dashboard Stats */}
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="border border-white/10 bg-white/5 p-3">
                    <span class="text-[10px] text-white/40 uppercase block">Total Intel</span>
                    <span class="text-xl text-white font-bold">{articles.length}</span>
                </div>
                 <div class="border border-white/10 bg-white/5 p-3">
                    <span class="text-[10px] text-white/40 uppercase block">Avg Score</span>
                    <span class="text-xl text-tactical-lime font-bold">
                        {Math.round(articles.reduce((acc, a) => acc + a.total_score, 0) / (articles.length || 1))}
                    </span>
                </div>
                <div class="border border-white/10 bg-white/5 p-3">
                    <span class="text-[10px] text-white/40 uppercase block">High Priority</span>
                    <span class="text-xl text-tactical-cyan font-bold">
                        {articles.filter(a => a.total_score > 70).length}
                    </span>
                </div>
                <div class="border border-white/10 bg-white/5 p-3">
                    <span class="text-[10px] text-white/40 uppercase block">Active Filters</span>
                    <span class="text-xl text-white font-bold">
                        {sourceId ? '1' : '0'}
                    </span>
                </div>
            </div>

            {/* Source Filter Bar */}
            <div class="flex flex-wrap gap-2 text-xs">
                 <a href="/" 
                    class={`px-3 py-1 border transition-colors uppercase ${!sourceId ? 'bg-tactical-lime text-black border-tactical-lime font-bold' : 'border-white/20 text-white/50 hover:border-tactical-lime hover:text-white'}`}>
                    ALL SOURCES
                 </a>
                 {sources.map(s => (
                     <a href={`/?source_id=${s.id}`} 
                        class={`px-3 py-1 border transition-colors uppercase ${sourceId === s.id ? 'bg-tactical-lime text-black border-tactical-lime font-bold' : 'border-white/20 text-white/50 hover:border-tactical-lime hover:text-white'}`}>
                        {s.name}
                     </a>
                 ))}
            </div>

            {/* Article Grid */}
            <div>
                <div class="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                    <h2 class="text-lg font-bold text-white flex items-center gap-2">
                        <span class="w-1 h-4 bg-tactical-lime block"></span>
                        PRIORITY FEED
                    </h2>
                    <span class="text-xs text-white/30">SORTED BY: RELEVANCE_SCORE</span>
                </div>
                
                {articles.length === 0 ? (
                    <div class="text-center py-20 text-white/30 border border-white/10 border-dashed">
                        NO INTELLIGENCE FOUND FOR CURRENT FILTER
                    </div>
                ) : (
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {articles.map((article, i) => (
                            <ArticleCard article={article} rank={i + 1} />
                        ))}
                    </div>
                )}
            </div>
          </div>

          {/* Client-side Interaction Script */}
          <script dangerouslySetInnerHTML={{ __html: `
            function openDetail(id) {
                fetch('/article/' + id)
                    .then(res => res.text())
                    .then(html => {
                        const container = document.getElementById('detail-container');
                        container.innerHTML = html;
                        container.classList.remove('translate-x-full');
                    });
            }
            function closeDetail() {
                document.getElementById('detail-container').classList.add('translate-x-full');
            }
          `}} />

          {/* Slide-over Panel Container */}
          <div 
            id="detail-container"
            class="fixed top-16 right-0 w-full md:w-[600px] h-[calc(100vh-4rem)] bg-[#0f0f0f]/95 backdrop-blur-xl border-l border-white/10 transform translate-x-full transition-transform duration-300 z-50 overflow-y-auto shadow-2xl"
          >
            {/* Content loaded via HTMX/Fetch */}
          </div>
        </Layout>
      );
    });

    app.get('/article/:id', (c) => {
      const id = parseInt(c.req.param('id'));
      const article = db.getTopScoredArticles(1000).find(a => a.id === id);

      if (!article) return c.text('Not Found', 404);
      
      // Parse explanation safely
      let explanation = article.explanation;
      try {
         const parsed = JSON.parse(explanation);
         if (parsed.summary) explanation = parsed.summary + "\\n\\n" + (parsed.details || "");
      } catch (e) {
         // use raw string
      }

      return c.html(
        <div class="h-full flex flex-col">
            {/* Header */}
            <div class="p-6 border-b border-white/10 flex justify-between items-start bg-black/40">
                <div>
                    <span class="text-xs text-tactical-lime uppercase tracking-widest mb-1 block">Intel Detail // ID: {article.id}</span>
                    <h2 class="text-xl font-bold text-white leading-tight">{article.title}</h2>
                </div>
                <button onclick="closeDetail()" class="text-white/50 hover:text-white transition-colors">
                    [CLOSE]
                </button>
            </div>

            {/* Content */}
            <div class="p-6 flex-1 overflow-y-auto">
                 {/* Stats Row */}
                 <div class="flex gap-4 mb-6 border-b border-white/5 pb-6">
                     <div class="text-center">
                         <div class="text-[10px] text-white/30 uppercase">Score</div>
                         <div class="text-3xl font-bold text-tactical-lime">{article.total_score}</div>
                     </div>
                     <div class="w-px bg-white/10"></div>
                     <div class="text-center">
                         <div class="text-[10px] text-white/30 uppercase">Trend Fit</div>
                         <div class="text-xl font-bold text-white">{article.trend_fit}%</div>
                     </div>
                     <div class="w-px bg-white/10"></div>
                      <div class="text-center">
                         <div class="text-[10px] text-white/30 uppercase">Tech Density</div>
                         <div class="text-xl font-bold text-white">{article.technical_density}%</div>
                     </div>
                 </div>

                 {/* Explanation */}
                 <div class="prose prose-invert prose-sm max-w-none">
                     <h3 class="text-sm font-bold text-tactical-cyan uppercase mb-2 border-l-2 border-tactical-cyan pl-2">Analysis</h3>
                     <div class="text-white/80 whitespace-pre-wrap font-mono text-xs leading-relaxed bg-white/5 p-4 rounded border border-white/5">
                        {explanation}
                     </div>
                 </div>

                 {/* Metadata */}
                 <div class="mt-8 space-y-2 text-xs text-white/40">
                     <div class="flex justify-between">
                         <span>Source URL:</span>
                         <a href={article.url} target="_blank" class="text-tactical-lime hover:underline truncate max-w-[200px]">{article.url}</a>
                     </div>
                     <div class="flex justify-between">
                         <span>Published:</span>
                         <span>{new Date(article.published_at).toLocaleString()}</span>
                     </div>
                      <div class="flex justify-between">
                         <span>Analyzed:</span>
                         <span>{new Date(article.analyzed_at || "").toLocaleString()}</span>
                     </div>
                 </div>
                 
                 {/* Action */}
                 <div class="mt-8">
                    <a href={article.url} target="_blank" class="block w-full text-center bg-tactical-lime text-black font-bold py-3 hover:bg-white transition-colors uppercase text-sm">
                        Open Source Link
                    </a>
                 </div>
            </div>
        </div>
      );
    });

    return app;
}

const app = createApp(new LunamiraDB());

export default {
    port: 3000,
    fetch: app.fetch,
};
