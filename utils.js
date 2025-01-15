import { SECURITY_CONFIG } from "./config.js";
import puppeteer from "puppeteer";

export function sanitizeHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/g, "")
    .replace(/javascript:/gi, "")
    .replace(/data:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function setupPageSecurity(page) {
  await page.setBypassCSP(true); // Allow loading resources
  await page.setRequestInterception(true);

  page.on("request", (request) => {
    if (request.isNavigationRequest()) {
      const headers = request.headers();
      headers["Content-Security-Policy"] = SECURITY_CONFIG.CSP_DIRECTIVES;
      request.continue({ headers });
    } else if (["image", "stylesheet", "font", "media"].includes(request.resourceType())) {
      request.continue();
    } else {
      request.abort();
    }
  });
}

const rateLimiter = new Map();
export function checkRateLimit(ip) {
  const now = Date.now();
  const { WINDOW_MS, MAX_REQUESTS } = SECURITY_CONFIG.RATE_LIMIT;

  if (!rateLimiter.has(ip)) {
    rateLimiter.set(ip, [now]);
    return true;
  }

  const requests = rateLimiter.get(ip);
  const windowStart = now - WINDOW_MS;

  while (requests.length && requests[0] < windowStart) {
    requests.shift();
  }

  if (requests.length >= MAX_REQUESTS) {
    return false;
  }

  requests.push(now);
  return true;
}

export async function initializeBrowserPool(browserConfig) {
  const browserPool = [];
  for (let i = 0; i < browserConfig.POOL_SIZE; i++) {
    const browser = await puppeteer.launch(browserConfig.LAUNCH_OPTIONS);
    browserPool.push(browser);
  }
  return browserPool;
}

export function getNextBrowser(browserPool, currentIndex, poolSize) {
  const browser = browserPool[currentIndex];
  return {
    browser,
    nextIndex: (currentIndex + 1) % poolSize,
  };
}

export async function closeAllBrowsers(browserPool) {
  for (const browser of browserPool) {
    await browser.close().catch(() => {});
  }
}

export async function setupPage(page) {
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(window, "Notification", { value: undefined });
    navigator.geolocation = undefined;
    navigator.clipboard = undefined;
    window.PaymentRequest = undefined;
  });
}
