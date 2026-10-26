/* PRD Template Library untuk PRD Studio.
   Koleksi template PRD per industri/use-case dengan pre-fill wizard
   dan scaffold defaults. ES5 murni tanpa bundler. */
(function () {
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  var TEMPLATES = [
    {
      id: 'saas-b2b',
      name: 'SaaS B2B Platform',
      industry: 'SaaS',
      description: 'Platform SaaS untuk bisnis (subscription, multi-tenant, RBAC).',
      answers: {
        productName: 'SaaS Platform',
        productType: 'Aplikasi web',
        primaryUser: 'Admin perusahaan',
        roles: 'Super Admin, Admin, Member',
        mustHave: 'Login SSO\nDashboard admin\nManajemen user & role\nBilling & subscription\nAudit log',
        wontHave: 'Mobile native (v1)',
        whyNow: 'Permintaan pasar B2B meningkat',
        mainFlow: 'Login -> Dashboard -> Kelola user -> Billing',
        failFlow: 'Login gagal -> reset password -> retry',
        navStructure: 'Sidebar + topbar',
        visualNeeds: 'Dashboard chart, tabel data, modal form',
        nfr: 'Response < 2s, uptime 99.9%, GDPR compliant',
        platform: ['Web'],
        audio: ['Tanpa audio']
      },
      entities: [
        { label: 'Tenant', fields: [{ n: 'id', t: 'string' }, { n: 'name', t: 'string' }, { n: 'plan', t: 'string' }] },
        { label: 'User', fields: [{ n: 'id', t: 'string' }, { n: 'email', t: 'string' }, { n: 'role', t: 'string' }, { n: 'tenantId', t: 'string' }] },
        { label: 'Subscription', fields: [{ n: 'id', t: 'string' }, { n: 'tenantId', t: 'string' }, { n: 'plan', t: 'string' }, { n: 'status', t: 'string' }] }
      ],
      endpoints: [
        { m: 'POST', p: '/api/auth/login', d: 'Login user' },
        { m: 'GET', p: '/api/users', d: 'List users' },
        { m: 'POST', p: '/api/users', d: 'Create user' },
        { m: 'GET', p: '/api/billing/subscription', d: 'Get subscription' }
      ]
    },
    {
      id: 'ecommerce',
      name: 'E-Commerce Store',
      industry: 'Retail',
      description: 'Toko online dengan katalog, cart, checkout, dan payment.',
      answers: {
        productName: 'Toko Online',
        productType: 'Aplikasi web',
        primaryUser: 'Pembeli online',
        roles: 'Customer, Admin, Seller',
        mustHave: 'Katalog produk\nKeranjang belanja\nCheckout & payment\nTracking order\nReview produk',
        wontHave: 'Live chat (v1)',
        whyNow: 'Pertumbuhan e-commerce',
        mainFlow: 'Browse -> Add to cart -> Checkout -> Payment -> Tracking',
        failFlow: 'Payment gagal -> retry -> cancel',
        navStructure: 'Header nav + footer',
        visualNeeds: 'Product grid, cart drawer, checkout form',
        nfr: 'Page load < 3s, payment secure (PCI-DSS)',
        platform: ['Web', 'Mobile'],
        audio: ['Tanpa audio']
      },
      entities: [
        { label: 'Product', fields: [{ n: 'id', t: 'string' }, { n: 'name', t: 'string' }, { n: 'price', t: 'number' }, { n: 'stock', t: 'int' }] },
        { label: 'Cart', fields: [{ n: 'id', t: 'string' }, { n: 'userId', t: 'string' }, { n: 'items', t: 'array' }] },
        { label: 'Order', fields: [{ n: 'id', t: 'string' }, { n: 'userId', t: 'string' }, { n: 'total', t: 'number' }, { n: 'status', t: 'string' }] }
      ],
      endpoints: [
        { m: 'GET', p: '/api/products', d: 'List products' },
        { m: 'POST', p: '/api/cart/add', d: 'Add to cart' },
        { m: 'POST', p: '/api/orders', d: 'Create order' },
        { m: 'GET', p: '/api/orders/:id', d: 'Get order' }
      ]
    },
    {
      id: 'mobile-app',
      name: 'Mobile App (React Native/Expo)',
      industry: 'Mobile',
      description: 'Aplikasi mobile cross-platform dengan offline support.',
      answers: {
        productName: 'Mobile App',
        productType: 'Aplikasi mobile',
        primaryUser: 'End user mobile',
        roles: 'User, Admin',
        mustHave: 'Onboarding\nHome feed\nProfile management\nPush notification\nOffline mode',
        wontHave: 'Web version (v1)',
        whyNow: 'Mobile-first strategy',
        mainFlow: 'Onboard -> Home -> Action -> Profile',
        failFlow: 'Network error -> offline cache -> retry',
        navStructure: 'Bottom tab navigation',
        visualNeeds: 'Card list, bottom sheet, swipe actions',
        nfr: 'App size < 50MB, offline capable, 60fps',
        platform: ['Mobile'],
        audio: ['Tanpa audio']
      },
      entities: [
        { label: 'User', fields: [{ n: 'id', t: 'string' }, { n: 'name', t: 'string' }, { n: 'avatar', t: 'string' }] },
        { label: 'Post', fields: [{ n: 'id', t: 'string' }, { n: 'userId', t: 'string' }, { n: 'content', t: 'string' }, { n: 'createdAt', t: 'string' }] }
      ],
      endpoints: [
        { m: 'POST', p: '/api/auth/register', d: 'Register' },
        { m: 'GET', p: '/api/feed', d: 'Get feed' },
        { m: 'POST', p: '/api/posts', d: 'Create post' }
      ]
    },
    {
      id: 'internal-tool',
      name: 'Internal Tool / Admin Dashboard',
      industry: 'Internal',
      description: 'Tool internal untuk operasional tim (CRUD, reporting).',
      answers: {
        productName: 'Internal Tool',
        productType: 'Aplikasi web',
        primaryUser: 'Tim internal',
        roles: 'Admin, Operator, Viewer',
        mustHave: 'CRUD data master\nReporting & export\nRole-based access\nAudit trail',
        wontHave: 'Public API (v1)',
        whyNow: 'Efisiensi operasional',
        mainFlow: 'Login -> Dashboard -> CRUD -> Export report',
        failFlow: 'Validation error -> show message -> fix',
        navStructure: 'Sidebar menu',
        visualNeeds: 'Data table, form, chart',
        nfr: 'Internal network only, response < 1s',
        platform: ['Web'],
        audio: ['Tanpa audio']
      },
      entities: [
        { label: 'Record', fields: [{ n: 'id', t: 'string' }, { n: 'name', t: 'string' }, { n: 'status', t: 'string' }, { n: 'createdAt', t: 'string' }] }
      ],
      endpoints: [
        { m: 'GET', p: '/api/records', d: 'List records' },
        { m: 'POST', p: '/api/records', d: 'Create record' },
        { m: 'PUT', p: '/api/records/:id', d: 'Update record' },
        { m: 'DELETE', p: '/api/records/:id', d: 'Delete record' }
      ]
    },
    {
      id: 'landing-page',
      name: 'Landing Page / Marketing Site',
      industry: 'Marketing',
      description: 'Landing page untuk produk/campaign dengan CTA dan form.',
      answers: {
        productName: 'Landing Page',
        productType: 'Landing page',
        primaryUser: 'Pengunjung website',
        roles: 'Visitor, Admin',
        mustHave: 'Hero section\nFeature highlights\nTestimoni\nCTA & lead form\nFAQ',
        wontHave: 'User account (v1)',
        whyNow: 'Campaign launch',
        mainFlow: 'Visit -> Scroll -> CTA -> Submit form -> Thank you',
        failFlow: 'Form error -> inline validation -> retry',
        navStructure: 'Single page scroll',
        visualNeeds: 'Hero banner, feature cards, testimonial carousel',
        nfr: 'Lighthouse score > 90, mobile responsive',
        platform: ['Web'],
        audio: ['Tanpa audio']
      },
      entities: [
        { label: 'Lead', fields: [{ n: 'id', t: 'string' }, { n: 'name', t: 'string' }, { n: 'email', t: 'string' }, { n: 'source', t: 'string' }] }
      ],
      endpoints: [
        { m: 'POST', p: '/api/leads', d: 'Submit lead form' }
      ]
    },
    {
      id: 'api-service',
      name: 'REST API Service',
      industry: 'Backend',
      description: 'Microservice / API backend tanpa UI.',
      answers: {
        productName: 'API Service',
        productType: 'API / Backend',
        primaryUser: 'Developer / konsumer API',
        roles: 'API Consumer, Admin',
        mustHave: 'Authentication (API key/JWT)\nCRUD endpoints\nRate limiting\nDocumentation (OpenAPI)\nHealth check',
        wontHave: 'Web UI (v1)',
        whyNow: 'Integrasi sistem',
        mainFlow: 'Auth -> Request -> Response -> Log',
        failFlow: '401/403/429 -> error response -> retry',
        navStructure: 'N/A (API only)',
        visualNeeds: 'Swagger UI',
        nfr: 'Response < 200ms p99, rate limit 1000/min',
        platform: ['Web'],
        audio: ['Tanpa audio']
      },
      entities: [
        { label: 'Resource', fields: [{ n: 'id', t: 'string' }, { n: 'data', t: 'object' }, { n: 'createdAt', t: 'string' }] }
      ],
      endpoints: [
        { m: 'GET', p: '/api/v1/resources', d: 'List resources' },
        { m: 'POST', p: '/api/v1/resources', d: 'Create resource' },
        { m: 'GET', p: '/api/v1/resources/:id', d: 'Get resource' },
        { m: 'DELETE', p: '/api/v1/resources/:id', d: 'Delete resource' }
      ]
    }
  ];

  function listTemplates() {
    return TEMPLATES.map(function (t) {
      return { id: t.id, name: t.name, industry: t.industry, description: t.description };
    });
  }

  function getTemplate(id) {
    for (var i = 0; i < TEMPLATES.length; i++) {
      if (TEMPLATES[i].id === id) return TEMPLATES[i];
    }
    return null;
  }

  function templatesByIndustry(industry) {
    return TEMPLATES.filter(function (t) { return t.industry === industry; });
  }

  function industries() {
    var set = {};
    TEMPLATES.forEach(function (t) { set[t.industry] = true; });
    return Object.keys(set);
  }

  function applyTemplate(template, answers) {
    answers = answers || {};
    var t = (typeof template === 'string') ? getTemplate(template) : template;
    if (!t) return answers;
    // Merge template answers into answers (template as default, user answers override)
    Object.keys(t.answers || {}).forEach(function (k) {
      if (answers[k] === undefined || answers[k] === null || answers[k] === '') {
        answers[k] = t.answers[k];
      }
    });
    return answers;
  }

  function templateSpec(template) {
    var t = (typeof template === 'string') ? getTemplate(template) : template;
    if (!t) return null;
    return {
      meta: { productName: t.answers.productName, stackPref: 'HTML CSS JS vanilla' },
      answers: t.answers,
      entities: t.entities || [],
      endpoints: t.endpoints || [],
      templateId: t.id,
      templateName: t.name
    };
  }

  window.PRDTemplateLibrary = {
    TEMPLATES: TEMPLATES,
    listTemplates: listTemplates,
    getTemplate: getTemplate,
    templatesByIndustry: templatesByIndustry,
    industries: industries,
    applyTemplate: applyTemplate,
    templateSpec: templateSpec
  };
})();
