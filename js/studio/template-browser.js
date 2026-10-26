/* Template Browser & Codebase Scaffold Engine untuk PRD Studio.
   Katalog template starter nyata (file tree, perintah instalasi, env var, fitur)
   yang selaras dengan 4-pilar stack, plus generator scaffold markdown.
   ES5 murni tanpa bundler. */
(function () {
  var esc = (window.Exporter && window.Exporter.escMd) || function (x) { return String(x || ''); };

  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  var TEMPLATES = [
    {
      id: 'nextjs-saas',
      name: 'Next.js SaaS Starter',
      stack: { frontend: 'Next.js (App Router)', backend: 'Node.js (Hono / Fastify)', database: 'Neon (Serverless Postgres)', deployment: 'Vercel' },
      repo: 'https://github.com/vercel/next.js/tree/canary/examples/with-prisma',
      tier: 'production',
      features: ['Auth (NextAuth)', 'Prisma ORM', 'Stripe billing', 'Tailwind + shadcn/ui', 'Edge middleware'],
      fileTree: [
        'app/',
        '  layout.tsx',
        '  page.tsx',
        '  (auth)/login/page.tsx',
        '  (dashboard)/layout.tsx',
        '  api/webhooks/stripe/route.ts',
        'lib/',
        '  prisma.ts',
        '  auth.ts',
        'prisma/',
        '  schema.prisma',
        '  migrations/',
        'components/',
        '  ui/ (shadcn)',
        '.env.example',
        'package.json'
      ],
      installCmd: 'npx create-next-app@latest my-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"',
      envVars: ['DATABASE_URL', 'NEXTAUTH_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
      scaffoldSteps: ['Install deps', 'Setup Prisma migrate', 'Konfigurasi env', 'Jalankan dev server', 'Deploy ke Vercel']
    },
    {
      id: 'tanstack-saas',
      name: 'TanStack Start SaaS',
      stack: { frontend: 'TanStack Start', backend: 'Node.js (Hono / Fastify)', database: 'PostgreSQL', deployment: 'Docker' },
      repo: 'https://github.com/TanStack/router/tree/main/examples/react/start-basic',
      tier: 'production',
      features: ['Server functions', 'Type-safe routing', 'SSR streaming', 'Hono API', 'Docker compose'],
      fileTree: [
        'src/',
        '  routes/',
        '    __root.tsx',
        '    index.tsx',
        '    api/$.ts',
        '  components/',
        'server/',
        '  hono.ts',
        'db/',
        '  schema.sql',
        'docker-compose.yml',
        'Dockerfile',
        '.env.example'
      ],
      installCmd: 'npm create @tanstack/start@latest my-app',
      envVars: ['DATABASE_URL', 'JWT_SECRET', 'PORT'],
      scaffoldSteps: ['npm install', 'docker compose up -d', 'npm run db:migrate', 'npm run dev', 'docker build & push']
    },
    {
      id: 'vite-supabase',
      name: 'Vite + Supabase BaaS',
      stack: { frontend: 'React (Vite SPA)', backend: 'Supabase (BaaS)', database: 'Supabase Postgres', deployment: 'Cloudflare Pages' },
      repo: 'https://github.com/supabase/supabase/tree/master/examples/user-management/react-user-management',
      tier: 'lean',
      features: ['Supabase Auth', 'Row Level Security', 'Realtime subscriptions', 'Storage buckets', 'Edge functions'],
      fileTree: [
        'src/',
        '  App.tsx',
        '  components/Auth.tsx',
        '  lib/supabase.ts',
        'supabase/',
        '  migrations/',
        '  functions/',
        '.env.example',
        'vite.config.ts',
        'package.json'
      ],
      installCmd: 'npm create vite@latest my-app -- --template react-ts && cd my-app && npm install @supabase/supabase-js',
      envVars: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
      scaffoldSteps: ['Buat project Supabase', 'Set env vars', 'npm run dev', 'Deploy ke Cloudflare Pages']
    },
    {
      id: 'expo-mobile',
      name: 'Expo Mobile (Turso)',
      stack: { frontend: 'Expo (React Native)', backend: 'Node.js (Hono / Fastify)', database: 'Turso (libSQL)', deployment: 'Railway' },
      repo: 'https://github.com/expo/expo/tree/main/templates/expo-template-blank-typescript',
      tier: 'mobile',
      features: ['Expo Router', 'Turso local-first', 'Drizzle ORM', 'EAS Build', 'Push notifications'],
      fileTree: [
        'app/',
        '  _layout.tsx',
        '  index.tsx',
        'lib/',
        '  db.ts',
        '  schema.ts',
        'drizzle/',
        '  migrations/',
        'app.json',
        'package.json'
      ],
      installCmd: 'npx create-expo-app@latest my-app --template blank-typescript',
      envVars: ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN'],
      scaffoldSteps: ['npx expo install', 'Setup Turso DB', 'npx drizzle-kit generate', 'eas build', 'Deploy backend ke Railway']
    },
    {
      id: 'vanilla-cf',
      name: 'Vanilla + Cloudflare D1',
      stack: { frontend: 'HTML CSS JS vanilla', backend: 'Cloudflare Workers', database: 'Cloudflare D1', deployment: 'Cloudflare Pages' },
      repo: 'https://github.com/cloudflare/workers-sdk/tree/main/templates/worker-typescript',
      tier: 'lean',
      features: ['Zero build', 'D1 SQLite', 'Workers KV', 'Pages Functions', 'Wrangler CLI'],
      fileTree: [
        'src/',
        '  index.ts',
        '  routes/',
        'public/',
        '  index.html',
        '  app.js',
        '  styles.css',
        'wrangler.toml',
        'package.json'
      ],
      installCmd: 'npm create cloudflare@latest my-app -- --type hello-world',
      envVars: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'],
      scaffoldSteps: ['wrangler d1 create', 'wrangler kv namespace create', 'npm run dev', 'wrangler deploy']
    },
    {
      id: 'python-fastapi',
      name: 'Python FastAPI + Postgres',
      stack: { frontend: 'React (Vite SPA)', backend: 'Python (FastAPI)', database: 'PostgreSQL', deployment: 'Docker' },
      repo: 'https://github.com/tiangolo/full-stack-fastapi-template',
      tier: 'production',
      features: ['FastAPI async', 'SQLModel ORM', 'JWT auth', 'Alembic migrations', 'Docker compose', 'Pytest'],
      fileTree: [
        'backend/',
        '  app/',
        '    main.py',
        '    api/',
        '    models/',
        '    core/',
        '  alembic/',
        '  tests/',
        '  Dockerfile',
        'frontend/',
        '  src/',
        'docker-compose.yml',
        '.env.example'
      ],
      installCmd: 'git clone https://github.com/tiangolo/full-stack-fastapi-template.git my-app',
      envVars: ['POSTGRES_SERVER', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'SECRET_KEY', 'FIRST_SUPERUSER'],
      scaffoldSteps: ['docker compose up -d', 'alembic upgrade head', 'uvicorn app.main:app --reload', 'pytest']
    },
    {
      id: 'go-echo',
      name: 'Go Echo + PostgreSQL',
      stack: { frontend: 'Vue.js / Nuxt', backend: 'Go (Echo / Fiber)', database: 'PostgreSQL', deployment: 'Fly.io' },
      repo: 'https://github.com/labstack/echo/tree/master/examples',
      tier: 'production',
      features: ['Echo framework', 'GORM ORM', 'JWT middleware', 'Air hot reload', 'Docker multi-stage'],
      fileTree: [
        'cmd/server/main.go',
        'internal/',
        '  handler/',
        '  model/',
        '  repository/',
        'migrations/',
        'Dockerfile',
        'docker-compose.yml',
        'go.mod'
      ],
      installCmd: 'mkdir my-app && cd my-app && go mod init my-app && go get github.com/labstack/echo/v4',
      envVars: ['DATABASE_URL', 'JWT_SECRET', 'PORT'],
      scaffoldSteps: ['go mod tidy', 'docker compose up -d', 'go run cmd/server/main.go', 'fly deploy']
    },
    {
      id: 'rust-axum',
      name: 'Rust Axum + SQLx',
      stack: { frontend: 'SvelteKit', backend: 'Rust (Axum)', database: 'PostgreSQL', deployment: 'Fly.io' },
      repo: 'https://github.com/tokio-rs/axum/tree/main/examples',
      tier: 'enterprise',
      features: ['Axum router', 'SQLx compile-time queries', 'Tower middleware', 'Tracing', 'Docker'],
      fileTree: [
        'src/',
        '  main.rs',
        '  routes/',
        '  models/',
        'migrations/',
        'Cargo.toml',
        'Dockerfile',
        'docker-compose.yml'
      ],
      installCmd: 'cargo new my-app && cd my-app',
      envVars: ['DATABASE_URL', 'RUST_LOG'],
      scaffoldSteps: ['cargo add axum sqlx tokio', 'sqlx migrate run', 'cargo run', 'fly deploy']
    }
  ];

  function matchTemplate(stack) {
    stack = stack || {};
    var best = null, score = -1;
    TEMPLATES.forEach(function (t) {
      var s = 0;
      if (stack.frontend && t.stack.frontend === stack.frontend) s += 2;
      if (stack.backend && t.stack.backend === stack.backend) s += 2;
      if (stack.database && t.stack.database === stack.database) s += 2;
      if (stack.deployment && t.stack.deployment === stack.deployment) s += 1;
      if (s > score) { score = s; best = t; }
    });
    return best;
  }

  function templatesByTier(tier) {
    if (!tier) return TEMPLATES.slice();
    return TEMPLATES.filter(function (t) { return t.tier === tier; });
  }

  function templatesByStack(stack) {
    stack = stack || {};
    return TEMPLATES.filter(function (t) {
      var ok = true;
      if (stack.frontend && t.stack.frontend !== stack.frontend) ok = false;
      if (stack.backend && t.stack.backend !== stack.backend) ok = false;
      if (stack.database && t.stack.database !== stack.database) ok = false;
      if (stack.deployment && t.stack.deployment !== stack.deployment) ok = false;
      return ok;
    });
  }

  function scaffoldMarkdown(template, spec) {
    template = template || TEMPLATES[0];
    spec = spec || {};
    var name = (spec.meta && spec.meta.nama) || (spec.summary && spec.summary.productName) || 'Produk';
    var lines = [];
    lines.push('# SCAFFOLD: ' + template.name);
    lines.push('');
    lines.push('_Template ID: ' + template.id + ' | Tier: ' + template.tier + '_');
    lines.push('');
    lines.push('## Stack 4 Pilar');
    lines.push('- Frontend: ' + template.stack.frontend);
    lines.push('- Backend: ' + template.stack.backend);
    lines.push('- Database: ' + template.stack.database);
    lines.push('- Deployment: ' + template.stack.deployment);
    lines.push('');
    lines.push('## Fitur Bawaan Template');
    template.features.forEach(function (f) { lines.push('- ' + f); });
    lines.push('');
    lines.push('## Struktur File');
    lines.push('```');
    template.fileTree.forEach(function (f) { lines.push(f); });
    lines.push('```');
    lines.push('');
    lines.push('## Perintah Instalasi');
    lines.push('```bash');
    lines.push(template.installCmd);
    lines.push('```');
    lines.push('');
    lines.push('## Variabel Environment');
    template.envVars.forEach(function (v) { lines.push('- `' + v + '`'); });
    lines.push('');
    lines.push('## Langkah Scaffold');
    template.scaffoldSteps.forEach(function (s, i) { lines.push((i + 1) + '. ' + s); });
    lines.push('');
    lines.push('## Referensi Repo');
    lines.push(template.repo);
    lines.push('');
    lines.push('## Produk Target');
    lines.push(name);
    return lines.join('\n');
  }

  function fileTreeText(template) {
    return (template.fileTree || []).join('\n');
  }

  window.TemplateBrowser = {
    TEMPLATES: TEMPLATES,
    matchTemplate: matchTemplate,
    templatesByTier: templatesByTier,
    templatesByStack: templatesByStack,
    scaffoldMarkdown: scaffoldMarkdown,
    fileTreeText: fileTreeText
  };
})();
