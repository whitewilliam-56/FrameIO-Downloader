import fs from "fs";
import path from "path";

const STATE_FILE = "/app/data/state.json";

function load() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch {
    // Corrupted state — start fresh
  }
  return { downloadedAssets: {} };
}

function save(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function hasBeenDownloaded(assetId, versionId) {
  const state = load();
  return state.downloadedAssets[assetId] === versionId;
}

export function markDownloaded(assetId, versionId, filename) {
  const state = load();
  state.downloadedAssets[assetId] = versionId;
  save(state);
}
