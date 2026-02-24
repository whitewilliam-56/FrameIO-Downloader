import Fastify from "fastify";
import crypto from "crypto";
import { queueAssetDownload } from "./downloader.js";
import { log } from "./logger.js";

const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.FRAMEIO_WEBHOOK_SECRET;

// Events we care about
const TRACKED_EVENTS = new Set([
  "file.created",    // New file uploaded
  "file.ready",      // All transcodes complete, file fully processed
  "file.deleted",    // File deleted
  "file.versioned",  // New version of an existing file
]);

function verifySignature(rawBody, signature, timestamp) {
  // Temporarily disabled for debugging
  return true;
}

export async function startServer() {
  const fastify = Fastify({ logger: false, trustProxy: true });

  // Parse raw body for signature verification
  fastify.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
    done(null, body);
  });

  fastify.get("/", async () => ({ message: "Frame.io Sync Server", status: "running" }));

  fastify.get("/health", async () => ({ status: "ok" }));

  fastify.post("/webhook", async (req, reply) => {
    const signature = req.headers["x-frameio-signature"] || "";
    const timestamp = req.headers["x-frameio-request-timestamp"] || "";
    const rawBody = req.body;

    if (!verifySignature(rawBody.toString(), signature, timestamp)) {
      log("warn", "Invalid webhook signature — request rejected");
      return reply.code(401).send({ error: "Invalid signature" });
    }

    const payload = JSON.parse(rawBody.toString());
    const { type, resource, workspace, project } = payload;

    log("info", `Received webhook event`, { type, assetId: resource?.id });

    if (!TRACKED_EVENTS.has(type)) {
      log("info", `Ignoring untracked event type`, { type });
      return reply.code(200).send({ ok: true });
    }

    const assetId = resource?.id;
    if (!assetId) {
      log("warn", "Webhook payload missing asset ID", { type });
      return reply.code(400).send({ error: "Missing asset ID" });
    }

    await queueAssetDownload(assetId, type, { workspaceId: workspace?.id, projectId: project?.id });

    return reply.code(200).send({ ok: true });
  });

  await fastify.listen({ port: PORT, host: "0.0.0.0" });
  log("success", `Webhook server listening on port ${PORT}`);
}

startServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
