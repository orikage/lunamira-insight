import { Hono } from 'hono'
import { html } from 'hono/html'

const app = new Hono()

const Layout = ({ children, title }: { children: any; title: string }) => html`
  <!DOCTYPE html>
  <html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | Lunamira Insight</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;800&display=swap" rel="stylesheet">
    <style>
      :root {
        --ak-yellow: #e2ff00;
        --ak-bg: #0a0a0a;
        --ak-panel: #141414;
        --ak-cyan: #00f0ff;
      }
      body {
        background-color: var(--ak-bg);
        color: #eee;
        font-family: 'JetBrains Mono', monospace;
      }
      .tactical-border {
        border-left: 4px solid var(--ak-yellow);
      }
      .glitch-hover:hover {
        animation: glitch 0.2s infinite;
      }
      @keyframes glitch {
        0% { transform: translate(0) }
        20% { transform: translate(-2px, 2px) }
        40% { transform: translate(-2px, -2px) }
        60% { transform: translate(2px, 2px) }
        80% { transform: translate(2px, -2px) }
        100% { transform: translate(0) }
      }
    </style>
  </head>
  <body class="min-h-screen">
    ${children}
  </body>
  </html>
`

app.get('/', (c) => {
  return c.html(
    <Layout title="Dashboard">
      <header class="p-10 border-b border-zinc-800 flex justify-between items-end bg-black/80 sticky top-0 backdrop-blur-md z-50">
        <div class="tactical-border pl-6">
          <div class="text-[10px] text-[#e2ff00] tracking-[4px] mb-2 uppercase">Neural Intelligence Node // v5.0</div>
          <h1 class="text-5xl font-extrabold tracking-tighter uppercase leading-none">Lunamira<br/>Insight</h1>
        </div>
        <div class="text-right text-[10px] text-[#00f0ff] leading-relaxed">
          SYSTEM_STATUS: ACTIVE<br/>
          CORE_ENGINE: HONO_ON_BUN<br/>
          DATA_INTEGRITY: VERIFIED
        </div>
      </header>
      
      <main class="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div class="p-8 bg-[#141414] border border-zinc-800 relative group transition-all hover:border-[#e2ff00]">
           <div class="flex justify-between text-[10px] text-[#e2ff00] mb-4">
             <span>[INITIALIZING]</span>
             <span class="px-2 border border-[#e2ff00]">WAITING_FOR_DATA</span>
           </div>
           <h2 class="text-xl font-bold mb-4 uppercase">System Ready</h2>
           <p class="text-zinc-500 text-sm leading-relaxed">
             Hono × Bun スタックによる高密度情報ポータルの起動準備が完了しました。
             バックエンドからのデータ同期を待機中です。
           </p>
        </div>
      </main>

      <footer class="p-10 text-center text-zinc-700 text-[10px] tracking-widest uppercase">
        -- [SYSTEM_OVERRIDE] BY LUNAMIRA // TECHNOLOGY_ONLY --
      </footer>
    </Layout>
  )
})

export default app
