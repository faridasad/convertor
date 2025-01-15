import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import { SERVER_CONFIG, CORS_CONFIG, PDF_CONFIG, BROWSER_CONFIG } from "./config.js";
import { sanitizeHtml, setupPageSecurity, checkRateLimit, initializeBrowserPool, getNextBrowser, closeAllBrowsers, setupPage } from "./utils.js";

let browserPool = [];
let currentBrowserIndex = 0;

const fastify = Fastify({
  logger: SERVER_CONFIG.LOGGER,
  bodyLimit: SERVER_CONFIG.BODY_LIMIT,
});

await fastify.register(fastifyCors, CORS_CONFIG);

const html2pdfSchema = {
  body: {
    type: "object",
    required: ["html"],
    properties: {
      html: {
        type: "string",
        maxLength: PDF_CONFIG.MAX_HTML_SIZE,
        minLength: 1,
      },
    },
  },
};

fastify.post("/html2pdf", {
  schema: html2pdfSchema,
  handler: async (request, reply) => {
    let page = null;

    if (!checkRateLimit(request.ip)) {
      reply.status(429).send({ error: "Too many requests" });
      return;
    }

    try {
      const { html } = request.body;
      const sanitizedHtml = sanitizeHtml(html);
      const { browser, nextIndex } = getNextBrowser(browserPool, currentBrowserIndex, BROWSER_CONFIG.POOL_SIZE);
      currentBrowserIndex = nextIndex;

      page = await browser.newPage();
      await setupPageSecurity(page);
      await page.setDefaultTimeout(PDF_CONFIG.MAX_EXECUTION_TIME);
      await setupPage(page);
      await page.setViewport(PDF_CONFIG.VIEWPORT);
      await page.setJavaScriptEnabled(false);

      await Promise.race([
        page.setContent(sanitizedHtml, {
          waitUntil: ["domcontentloaded"],
          timeout: PDF_CONFIG.MAX_EXECUTION_TIME,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Content loading timeout")), PDF_CONFIG.MAX_EXECUTION_TIME)),
      ]);

      const pdfBuffer = await page.pdf({
        ...PDF_CONFIG.PDF_OPTIONS,
        timeout: PDF_CONFIG.MAX_EXECUTION_TIME,
      });

      reply
        .header("Content-Type", "application/pdf")
        .header("Content-Length", pdfBuffer.length)
        .header("Content-Disposition", "attachment; filename=ActivityReport.pdf")
        .header("X-Content-Type-Options", "nosniff")
        .send(pdfBuffer);
    } catch (error) {
      throw new Error("Failed to generate PDF");
    } finally {
      if (page) {
        await page.close().catch(() => {});
      }
    }
  },
});

fastify.setErrorHandler((error, request, reply) => {
  reply.status(500).send({
    error: "Failed to generate PDF",
    requestId: request.id,
  });
});

["SIGTERM", "SIGINT", "SIGUSR2"].forEach((signal) => {
  process.on(signal, async () => {
    await fastify.close();
    await closeAllBrowsers(browserPool);
    process.exit(0);
  });
});

const start = async () => {
  try {
    browserPool = await initializeBrowserPool(BROWSER_CONFIG);
    fastify.listen({
      port: SERVER_CONFIG.PORT,
    });
  } catch (err) {
    console.log(err);

    await closeAllBrowsers(browserPool);
    process.exit(1);
  }
};

start();
