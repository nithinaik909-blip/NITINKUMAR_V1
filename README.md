# PCB Finder — Vercel Deployment Guide

## What's in this project

```
pcb-finder/
├── components/
│   └── PCBFinder.jsx       ← Your app (API URL patched to use proxy)
├── pages/
│   ├── index.jsx            ← Main page
│   └── api/
│       └── claude.js        ← Secure API proxy (hides your key)
├── .env.local.example       ← API key template
├── .gitignore
├── next.config.js
└── package.json
```

---

## Step 1 — Get your Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Click **API Keys** → **Create Key**
4. Copy your key (starts with `sk-ant-...`)

---

## Step 2 — Upload to GitHub

1. Go to https://github.com and create a **New Repository** (name it `pcb-finder`)
2. Upload all files from this folder into the repo
3. Make sure `.env.local` is NOT uploaded (it's in .gitignore for safety)

---

## Step 3 — Deploy on Vercel

1. Go to https://vercel.com and sign up with your GitHub account
2. Click **Add New Project**
3. Select your `pcb-finder` GitHub repo
4. Click **Deploy** (Vercel auto-detects Next.js)

---

## Step 4 — Add your API Key on Vercel

This is the most important step — your key stays secret on Vercel's servers.

1. In Vercel dashboard → your project → **Settings**
2. Click **Environment Variables**
3. Add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-your-real-key-here`
4. Click **Save**
5. Go to **Deployments** → click **Redeploy**

---

## Step 5 — Done! 🎉

Your app is live at: `https://pcb-finder-xxxx.vercel.app`

---

## How the API key is protected

```
Browser (your users)
      ↓  sends image
/api/claude  ← runs on Vercel's server (key never visible to browser)
      ↓  adds your secret API key
Anthropic API
      ↓  returns analysis
Browser shows results
```

---

## Costs

| Item | Cost |
|------|------|
| Vercel Hobby hosting | FREE |
| Anthropic API | ~$0.01–0.05 per PCB image analyzed |

