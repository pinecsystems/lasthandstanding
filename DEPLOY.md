# Last Hand Standing — Free Deployment Guide

## Architecture

```
┌─────────────┐     WebSocket      ┌──────────────┐
│  index.html  │ ──────────────────→ │  Node Server  │
│  (GitHub     │ ←────────────────── │  (Render)     │
│   Pages)     │    wss://...       │  Port 10000   │
└─────────────┘                     └──────────────┘
```

## Step 1: Deploy the Server (Render — free)

1. Push this repo to GitHub
2. Go to https://dashboard.render.com → **New +** → **Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Name**: `lhs-server`
   - **Region**: Oregon (or closest)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && node index.js`
   - **Plan**: **Free** ($0/month)
5. Click **Create Web Service**
6. Wait for deploy. You'll get a URL like: `https://lhs-server.onrender.com`

## Step 2: Deploy the Client (GitHub Pages — free)

1. Go to your repo on GitHub → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Click **Save**
5. Your site will be at `https://<username>.github.io/<repo-name>/`

## Step 3: Connect Client to Server

Open the online game. In the **Online Play** modal, there's a **Server** field at the bottom.

Enter: `wss://lhs-server.onrender.com` (replace with your actual Render URL)

The client remembers this URL in localStorage.

## Alternative: Configure it in the HTML

Edit `index.html` and change line ~378:
```js
const SERVER_URL = localStorage.getItem('lhs_server_url') || 'wss://lhs-server.onrender.com';
```

## Notes

- **Free tier limits**: Render free web services spin down after 15 mins of inactivity. First request after idle takes 30-60s to wake up.
- **Party Pool** (same-browser via BroadcastChannel) still works offline — no server needed.
- **Practice, Championship, AI Royale** all work offline without a server.
- The server only handles **Online Play** rooms.
