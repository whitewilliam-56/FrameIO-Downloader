import fs from "fs";
import path from "path";
import axios from "axios";
import { pipeline } from "stream/promises";
import { getAsset, getDownloadUrl } from "./frameio.js";
import { hasBeenDownloaded, markDownloaded } from "./state.js";
import { log } from "./logger.js";
import PQueue from "p-queue";

const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || "/app/downloads";

// Limit to 3 concurrent downloads
const queue = new PQueue({ concurrency: 3 });

export async function queueAssetDownload(assetId, reason, context) {
  queue.add(() => downloadAsset(assetId, reason, context));
  log("info", `Queued download`, { assetId, reason, context, queueSize: queue.size });
}

async function downloadAsset(assetId, reason, context = {}) {
  try {
    let asset;
    try {
      asset = await getAsset(assetId, context);
    } catch (err) {
      // If asset fetch fails, create a minimal asset object with just ID
      // This handles cases where the API endpoint isn't available for this token type
      log("warn", "Could not fetch full asset details, using minimal info", { assetId });
      asset = { id: assetId, name: assetId, type: "file" };
    }

    // Skip non-file assets (folders, etc.)
    if (asset.type !== "file") {
      log("info", "Skipping non-file asset", { assetId, type: asset.type });
      return;
    }

    const versionId = asset.version_id || asset.id;

    if (hasBeenDownloaded(assetId, versionId)) {
      log("info", "Asset already downloaded, skipping", { assetId, versionId });
      return;
    }

    const downloadUrl = await getDownloadUrl(assetId, context);
    if (!downloadUrl) {
      log("warn", "No download URL available yet (asset may still be processing)", { assetId });
      return;
    }

    // Mirror the Frame.io folder structure locally
    const projectFolder = sanitizePath(asset.project?.name || "unknown-project");
    const assetFolder = sanitizePath(asset.parent?.name || "root");
    const outputDir = path.join(DOWNLOAD_DIR, projectFolder, assetFolder);
    fs.mkdirSync(outputDir, { recursive: true });

    // Append version number to filename to keep history
    const ext = path.extname(asset.name);
    const base = path.basename(asset.name, ext);
    const version = asset.version_number ? `_v${asset.version_number}` : "";
    const filename = `${base}${version}${ext}`;
    const filePath = path.join(outputDir, filename);

    log("info", `Downloading: ${filename}`, { reason, assetId });

    try {
      const response = await axios.get(downloadUrl, { responseType: "stream" });
      const total = parseInt(response.headers["content-length"] || "0", 10);
      let downloaded = 0;

      response.data.on("data", (chunk) => {
        downloaded += chunk.length;
        if (total) {
          const pct = ((downloaded / total) * 100).toFixed(1);
          process.stdout.write(`\r  → ${filename}: ${pct}%`);
        }
      });

      await pipeline(response.data, fs.createWriteStream(filePath));
      console.log("");

      markDownloaded(assetId, versionId, filename);
      log("success", `Downloaded: ${filename}`, { path: filePath, reason });
    } catch (err) {
      log("error", "Download failed", { filename, error: err.message });
    }
  } catch (err) {
    log("error", "Fatal error in download", { assetId, error: err.message });
  }
}

function sanitizePath(name) {
  return name.replace(/[^a-zA-Z0-9_\-. ]/g, "_");
}
