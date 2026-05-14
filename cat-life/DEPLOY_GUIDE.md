# 🚀 Deploy Cat Life to GitHub Pages

This guide walks you through publishing your site for free at:
`https://<your-username>.github.io/cat-life/`

---

## Step 1 — Install Git (if not installed)

Download from: https://git-scm.com/download/win  
After installing, open **PowerShell** and verify:

```
git --version
```

---

## Step 2 — Create a GitHub Account

Go to https://github.com and sign up (free).

---

## Step 3 — Create a New Repository

1. Click **+** → **New repository**
2. Name it: `cat-life`
3. Set it to **Public**
4. Leave everything else at default (no README, no .gitignore)
5. Click **Create repository**

---

## Step 4 — Push Your Code

Open **PowerShell**, navigate to your project, and run these commands:

```powershell
cd C:\Users\akarief\.gemini\antigravity\scratch\cat-life

git init
git add .
git commit -m "Initial commit: Cat Life website"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cat-life.git
git push -u origin main
```

> ⚠️ Replace `YOUR_USERNAME` with your actual GitHub username.

---

## Step 5 — Enable GitHub Pages

1. Go to your repo on GitHub: `https://github.com/YOUR_USERNAME/cat-life`
2. Click **Settings** tab
3. In the left sidebar, click **Pages**
4. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**

---

## Step 6 — Wait & Visit Your Site

GitHub will build and deploy your site in about **1–2 minutes**.

Your live URL will be:
```
https://YOUR_USERNAME.github.io/cat-life/
```

You'll see a banner on the Pages settings page with the live link once it's ready.

---

## Updating Your Site Later

Whenever you make changes, just run:

```powershell
cd C:\Users\akarief\.gemini\antigravity\scratch\cat-life

git add .
git commit -m "Update: describe your changes here"
git push
```

GitHub Pages will automatically redeploy within a minute or two.

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| Site shows 404 | Make sure `index.html` is in the root of the repo |
| Changes not showing | Wait 1–2 min and hard refresh (`Ctrl+Shift+R`) |
| Git asks for password | Use a **Personal Access Token** from GitHub Settings → Developer settings |

---

> 💡 **Tip:** Your cat data is saved in `localStorage`, which means it's stored in each browser separately. If you want shared/cloud data, consider adding a backend later.
