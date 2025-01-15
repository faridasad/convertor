export const SERVER_CONFIG = {
  PORT: 3008,
  BODY_LIMIT: 5 * 1024 * 1024, // 5MB limit
  LOGGER: true,
};

export const CORS_CONFIG = {
  origin: ["*"],
  methods: ["POST"],
  allowedHeaders: ["Content-Type"],
  credentials: true,
  maxAge: 600,
};

export const PDF_CONFIG = {
  MAX_HTML_SIZE: 5 * 1024 * 1024, // 5MB limit
  MAX_EXECUTION_TIME: 30000,
  VIEWPORT: {
    width: 1200,
    height: 800,
    deviceScaleFactor: 1,
  },
  PDF_OPTIONS: {
    format: "A4",
    printBackground: true,
    margin: {
      top: "5px",
      right: "5px",
      bottom: "5px",
      left: "5px",
    },
    preferCSSPageSize: true,
  },
};

export const BROWSER_CONFIG = {
  POOL_SIZE: 3,
  LAUNCH_OPTIONS: {
    pipe: true,
    headless: "new",
    args: [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-web-security",
      "--disable-features=IsolateOrigins",
      "--disable-extensions",
      "--disable-sync",
      "--disable-translate",
      "--hide-scrollbars",
      "--mute-audio",
      "--no-first-run",
      "--safebrowsing-disable-auto-update",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-domain-reliability",
      "--disable-breakpad",
      "--disable-component-update",
      "--disable-notifications",
    ],
    ignoreHTTPSErrors: true,
  },
};

export const SECURITY_CONFIG = {
  CSP_DIRECTIVES: [
    "default-src 'none'",
    "img-src * data: blob: 'self'",
    "style-src 'self' 'unsafe-inline' https:",
    "font-src 'self' https:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
  ].join("; "),
  RATE_LIMIT: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 10, // Max requests per minute
  },
};
