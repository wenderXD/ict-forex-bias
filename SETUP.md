# Setup Guide — ICT Forex Bias Website

Follow these steps exactly. You don't need any coding knowledge — just copy and paste.

---

## What you need
- A computer with internet access
- About 30 minutes

---

## Step 1 — Install required software

### 1a. Install Node.js
1. Go to https://nodejs.org
2. Click the big green "LTS" button to download
3. Run the installer, click Next → Next → Install
4. When done, open **Command Prompt** (press Win+R, type `cmd`, press Enter)
5. Type `node --version` and press Enter — you should see a version number like `v20.x.x`

### 1b. Install Python
1. Go to https://www.python.org/downloads/
2. Click "Download Python 3.11.x" (the yellow button)
3. **IMPORTANT**: On the installer first screen, check the box "Add Python to PATH"
4. Click "Install Now"
5. In Command Prompt, type `python --version` — you should see `Python 3.11.x`

### 1c. Install Git
1. Go to https://git-scm.com/download/win
2. Download and run the installer, click Next for everything (defaults are fine)
3. In Command Prompt, type `git --version` — you should see a version number

---

## Step 2 — Create a GitHub account (free)
1. Go to https://github.com
2. Click "Sign up" and create a free account
3. Verify your email address

---

## Step 3 — Upload the project to GitHub

1. Go to https://github.com/new
2. Repository name: `ict-forex-bias`
3. Set it to **Public**
4. Click **"Create repository"**
5. You'll see a page with setup instructions — **ignore them**

Now open **Command Prompt** and run these commands one by one:

```
cd "V:\New folder (2)\ict-forex-bias"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ict-forex-bias.git
git push -u origin main
```

**Replace `YOUR_USERNAME`** with your actual GitHub username.

When asked for a username and password: use your GitHub username, and for password use a **Personal Access Token**:
- Go to https://github.com/settings/tokens/new
- Note: `ict-forex-bias deploy`
- Expiration: No expiration
- Check the box: `repo`
- Click "Generate token"
- Copy the token and paste it as your password

---

## Step 4 — Deploy the website on Vercel (free tier works perfectly)

1. Go to https://vercel.com and sign up with your GitHub account
2. Click **"Add New Project"**
3. Find `ict-forex-bias` in the list and click **"Import"**
4. Vercel will auto-detect it as a Next.js project
5. Click **"Deploy"** — no settings need to change
6. Wait 1–2 minutes. Your website is live!
7. Vercel gives you a URL like `ict-forex-bias.vercel.app` — that's your website

Every time GitHub Actions commits new bias data, Vercel will **automatically redeploy** within 1 minute.

---

## Step 5 — Run the first analysis manually

You don't have to wait until Monday morning. Trigger it right now:

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/ict-forex-bias`
2. Click the **"Actions"** tab
3. Click **"Daily ICT Bias Analysis"** in the left sidebar
4. Click **"Run workflow"** → **"Run workflow"** (green button)
5. Wait 2–3 minutes
6. Go back to your Vercel URL — the website now shows today's bias!

---

## Step 6 — Custom domain (optional, if you bought hosting/domain)

If you bought a domain (e.g., from Namecheap, GoDaddy, etc.):

1. In Vercel, go to your project → **Settings** → **Domains**
2. Type your domain name and click **Add**
3. Vercel will show you DNS records to add
4. Go to your domain registrar's DNS settings and add those records
5. Wait up to 24 hours for DNS to propagate

---

## How it works automatically

Every weekday at **06:00 UTC** (7:00 AM London time in winter, 8:00 AM in summer):

```
GitHub Actions wakes up
  → Downloads latest OHLCV data (yfinance)
  → Runs ICT analysis on all 12 instruments
  → Saves results to data/bias/YYYY-MM-DD.json
  → Commits to GitHub
  → Vercel detects the commit and redeploys
  → Your website shows fresh bias within minutes
```

No action needed from you.

---

## Troubleshooting

**GitHub Actions failed?**
- Go to Actions tab → click the failed run → click the failed step → read the error
- Most common issue: Python package not installing → file a GitHub issue on this repo

**Website shows "No bias data"?**
- Trigger a manual run (Step 5 above)

**Domain not working?**
- DNS can take up to 24 hours. Wait and check again.

---

## Questions?
Open an issue on GitHub: https://github.com/YOUR_USERNAME/ict-forex-bias/issues
