const levels = { info: "ℹ️", success: "✅", warn: "⚠️", error: "❌" };

export function log(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const icon = levels[level] || "•";
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[${timestamp}] ${icon} ${message}${metaStr}`);
}
