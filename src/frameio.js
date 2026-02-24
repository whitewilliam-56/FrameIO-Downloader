import axios from "axios";
import { log } from "./logger.js";

const BASE_URL = "https://api.frame.io/v2";

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.FRAMEIO_TOKEN}`,
    "Content-Type": "application/json",
  },
});

export async function getAsset(assetId, context = {}) {
  try {
    log("info", "Fetching asset from Frame.io V2 API", { assetId });
    
    const { data } = await client.get(`/assets/${assetId}`);
    log("info", "Asset fetched successfully", { assetId, type: data.type });
    return data;
  } catch (err) {
    log("error", "Failed to fetch asset", { assetId, status: err.response?.status, error: err.message, responseData: err.response?.data });
    throw err;
  }
}

export async function getDownloadUrl(assetId, context = {}) {
  try {
    const { data } = await client.get(`/assets/${assetId}`);
    return data.original || data.downloads?.original;
  } catch (err) {
    log("error", "Failed to get download URL", { assetId, error: err.message });
    throw err;
  }
}
