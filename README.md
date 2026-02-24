# frameio-sync

A Docker-based service that listens for Frame.io webhook events and automatically downloads new assets, new versions, and status-changed files to your local server.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
- [Frame.io API Token](#frameio-api-token)
- [Configuring Environment Variables](#configuring-environment-variables)
- [Setting Up the Frame.io Webhook](#setting-up-the-frameio-webhook)
- [Running the Service](#running-the-service)
- [Folder Structure of Downloads](#folder-structure-of-downloads)
- [Testing Your Webhook Locally](#testing-your-webhook-locally)
- [Verifying It's Working](#verifying-its-working)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Make sure the following are installed on your server before getting started:

- [Docker](https://docs.docker.com/get-docker/) (v20+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- A [Frame.io](https://frame.io) account with at least one project
- A publicly accessible server URL or domain (required for Frame.io to send webhooks). For local development, see [Testing Your Webhook Locally](#testing-your-webhook-locally).

---

## Project Setup

1. **Clone or create the project folder** on your server:

```bash
mkdir frameio-sync && cd frameio-sync
```

2. **Create the required folders:**

```bash
mkdir -p downloads data src
```

3. **Add all project files** (`src/server.js`, `src/frameio.js`, `src/downloader.js`, `src/state.js`, `src/logger.js`, `Dockerfile`, `docker-compose.yml`, `package.json`) as provided.

4. **Create your `.env` file** (see [Configuring Environment Variables](#configuring-environment-variables) below).

---

## Frame.io API Token

You need a **Developer Token** from the Frame.io Developer Portal to authenticate API requests. This is a separate site from the main Frame.io app.

1. Go to the [Frame.io Developer Portal](https://developer.frame.io) and sign in with your Frame.io credentials
2. To the right of the search bar: click Developer Tools, then click **Tokens**
3. Click **Create a Token**
4. Enter a **Description** (e.g. `frameio-sync`) to help you remember what the token is for
5. Under **Scopes**, select at minimum:
   - `asset.read`
6. Click **Create** and copy the token immediately — you will only see it once

Paste this token as `FRAMEIO_TOKEN` in your `.env` file.

---

## Configuring Environment Variables

Create a `.env` file in the root of the project:

```bash
touch .env
```

Then open it and fill in the values:

```env
# Your Frame.io developer token (required)
FRAMEIO_TOKEN=your_frameio_token_here

# Webhook signing secret from Frame.io (required for signature verification)
# You will get this after creating the webhook — see the next section
FRAMEIO_WEBHOOK_SECRET=your_webhook_secret_here

# Local path inside the container where videos are saved (default is fine)
DOWNLOAD_DIR=/app/downloads

# Port the webhook server listens on
PORT=3000
```

> **Never commit your `.env` file to version control.** Add it to `.gitignore`.

---

## Setting Up the Frame.io Webhook

Frame.io will send an HTTP POST request to your server every time a tracked event occurs. You need to register a webhook URL with Frame.io.

### Step 1 — Make sure your server is reachable

Your server must be accessible from the internet over HTTPS. If you have a domain pointed at your server, use that. For local development, see [Testing Your Webhook Locally](#testing-your-webhook-locally).

### Step 2 — Register the webhook in Frame.io

1. Log in to [Frame.io](https://.frame.io)
2. In the bottom left click your profile
3. Click Settings
4. Under Account, click Webhooks
5. Click New Webhook
6. Fill in the form:
   - **NAME:** `frameio-sync` or something else
   - **URL:** `https://your-server.com/webhook`
   - **Events:** Enable the following:
     - `file.created` — triggers when a new file is uploaded
     - `file.ready` — triggers when all transcodes are complete and the file is fully processed
     - `file.deleted` — triggers when a file is deleted
     - `file.versioned` — triggers when a new version of a file is created
   - **STATUS:** Set to Enabled
   - **WORKSPACE:** Select the workspace you would like the webhook to listen to
7. Click **Save**

### Step 3 — Copy the signing secret

After saving, Frame.io will display a **Signing Secret**. Copy it and paste it as `FRAMEIO_WEBHOOK_SECRET` in your `.env` file. This secret is used to verify that incoming webhook requests genuinely came from Frame.io.

---

## Running the Service

### Build and start

```bash
docker compose up --build -d
```

The `-d` flag runs it in the background. The service will now listen for webhook events on port `3000`.

I am testing

### View logs

```bash
docker compose logs -f
```

### Stop the service

```bash
docker compose down
```

### Restart after changing `.env` or code

```bash
docker compose down && docker compose up --build -d
```

---

## Folder Structure of Downloads

Assets are saved to the `./downloads` folder on your host machine, mirroring your Frame.io project structure:

```
downloads/
└── My Project/
    └── Campaign Shoot/
        ├── hero_video_v1.mp4
        ├── hero_video_v2.mp4
        └── b-roll_v1.mp4
```

- Each project gets its own folder
- Each Frame.io folder within the project gets a subfolder
- New versions are saved as separate files with a `_v2`, `_v3` suffix, preserving full version history
- Previously downloaded assets are tracked in `./data/state.json` and will never be re-downloaded

---

## Testing Your Webhook Locally

If your server isn't publicly accessible yet, you can use [ngrok](https://ngrok.com) to create a temporary public tunnel to your local machine.

1. **Install ngrok** from [ngrok.com/download](https://ngrok.com/download)

2. **Start the tunnel:**

```bash
ngrok http 3000
```

3. **Copy the HTTPS forwarding URL** that ngrok provides, e.g.:

```
https://multivocal-unhideously-danial.ngrok-free.dev/
```

4. **Use this as your webhook URL** in Frame.io:

```
https://multivocal-unhideously-danial.ngrok-free.dev/webhook
```

---

## Verifying It's Working

### Health check

Once the container is running, confirm the server is up:

```bash
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

### Trigger a test event

Upload a file to any project in Frame.io. Within a few seconds you should see log output like:

```
[2024-01-15T10:23:01.000Z] ℹ️  Received webhook event {"type":"file.created"}
[2024-01-15T10:23:01.000Z] ℹ️  Queued download {"assetId":"abc-123","reason":"file.created"}
[2024-01-15T10:23:02.000Z] ℹ️  Downloading: my_video_v1.mp4 {"reason":"file.created"}
[2024-01-15T10:23:05.000Z] ✅  Downloaded: my_video_v1.mp4 {"path":"/app/downloads/My Project/Folder/my_video_v1.mp4"}
```

And the file will appear in your local `./downloads` folder.

---

## Troubleshooting

**Webhook events aren't arriving**
- Confirm your server URL is publicly accessible and uses HTTPS
- Double-check the webhook URL registered in Frame.io matches your server exactly
- Check that port `3000` is open in your server's firewall

**`401 Invalid signature` errors in logs**
- Make sure `FRAMEIO_WEBHOOK_SECRET` in your `.env` matches the signing secret shown in Frame.io exactly, with no extra spaces
- Restart the container after updating `.env`

**Files aren't downloading**
- Confirm `FRAMEIO_TOKEN` is valid and hasn't expired
- Check that the token has the `asset.read` scope
- Some assets may still be processing when the webhook fires — the service will log a warning and skip them. They will download on the next version or status update event.

**Container won't start**
- Run `docker compose logs` to see the error
- Make sure the `.env` file exists and all required variables are set

**Downloads folder is empty after a test upload**
- Frame.io fires `file.created` only after processing is complete, which can take 30–60 seconds after upload
- Check the container logs for any error messages
