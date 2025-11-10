# Valta Deployment Guide - Railway + Vercel

## Overview
This guide will walk you through deploying Valta so anyone can access it via a public URL.

**Deployment Stack:**
- Backend (FastAPI): Railway
- Frontend (Next.js): Vercel
- Estimated time: 20-30 minutes
- Estimated cost: $5-10/month

---

## Prerequisites

Before starting, you'll need:
1. GitHub account
2. Your OpenAI API key
3. Your Anthropic API key
4. Credit card for Railway (required even for trial, not charged unless you exceed free credits)

---

## Part 1: Set Up GitHub Repository (REQUIRED)

Both Railway and Vercel deploy from GitHub, so you need to push your code first.

### Step 1.1: Initialize Git Repository

```bash
cd "/Users/jaggerbellagarda/Valta 2"
git init
git add .
git commit -m "Initial commit - Valta AI Financial Assistant"
```

### Step 1.2: Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `valta-ai` (or any name you prefer)
3. Keep it **Private** (recommended since it will contain API keys in environment variables)
4. Click "Create repository"

### Step 1.3: Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/valta-ai.git
git branch -M main
git push -u origin main
```

**Replace `YOUR_USERNAME` with your actual GitHub username**

---

## Part 2: Deploy Backend to Railway

### Step 2.1: Sign Up for Railway

1. Go to [railway.app](https://railway.app)
2. Click "Login" → "Login with GitHub"
3. Authorize Railway to access your GitHub

### Step 2.2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Select your `valta-ai` repository
4. Railway will create a new project

### Step 2.3: Configure Backend Service

1. In the Railway dashboard, click on your service
2. Go to **Settings**:
   - **Root Directory**: `valta/backend`
   - **Watch Paths**: `valta/backend/**`
3. Click "Save"

### Step 2.4: Set Environment Variables

1. Go to **Variables** tab
2. Click "Add Variable" and add each of these:

```bash
# Required - Your API Keys
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE

# Database - SQLite for now (we'll upgrade later if needed)
DATABASE_URL=sqlite:///./valta.db

# Security - Generate a random secret
SECRET_KEY=PASTE_GENERATED_SECRET_HERE

# CORS - We'll update this after deploying frontend
ALLOWED_ORIGINS=*

# Application Settings
DEBUG=False
LOG_LEVEL=INFO
MAX_FILE_SIZE=52428800
UPLOAD_DIRECTORY=uploads

# Port (Railway automatically provides this)
PORT=${{PORT}}
```

**To generate SECRET_KEY**, run this in your terminal:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Step 2.5: Deploy Backend

1. Railway should automatically start deploying
2. Wait for the build to complete (3-5 minutes)
3. Once deployed, click on your service
4. Go to **Settings** → **Networking** → **Generate Domain**
5. **COPY YOUR BACKEND URL** (e.g., `https://valta-backend-production-xxxx.up.railway.app`)

**✅ Backend is now live!**

Test it: Visit `YOUR_BACKEND_URL/health` - you should see `{"status":"healthy"}`

---

## Part 3: Deploy Frontend to Vercel

### Step 3.1: Sign Up for Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" → "Continue with GitHub"
3. Authorize Vercel

### Step 3.2: Import Project

1. Click "Add New..." → "Project"
2. Find your `valta-ai` repository and click "Import"
3. Configure project:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: Click "Edit" → Select `valta/frontend`
   - Leave other settings as default

### Step 3.3: Set Environment Variables

Before deploying, click "Environment Variables" and add:

```bash
NEXT_PUBLIC_API_URL=YOUR_BACKEND_URL_FROM_STEP_2.5
```

**IMPORTANT**: Replace `YOUR_BACKEND_URL_FROM_STEP_2.5` with the actual Railway URL you copied earlier (e.g., `https://valta-backend-production-xxxx.up.railway.app`)

**DO NOT include a trailing slash**

### Step 3.4: Deploy Frontend

1. Click "Deploy"
2. Wait for build to complete (2-3 minutes)
3. Once deployed, Vercel will show you your live URL
4. **COPY YOUR FRONTEND URL** (e.g., `https://valta-ai.vercel.app`)

**✅ Frontend is now live!**

---

## Part 4: Update CORS Settings

Now that frontend is deployed, update the backend to only allow requests from your frontend domain.

### Step 4.1: Update Railway Environment Variable

1. Go back to Railway dashboard
2. Click on your backend service
3. Go to **Variables** tab
4. Find `ALLOWED_ORIGINS` and click to edit
5. Replace the value with your Vercel URL:

```bash
ALLOWED_ORIGINS=https://valta-ai.vercel.app,https://valta-ai-*.vercel.app
```

**Replace `valta-ai` with your actual Vercel project name**

The `*` allows preview deployments to work too.

### Step 4.2: Redeploy Backend

Railway will automatically redeploy when you change environment variables. Wait 1-2 minutes for the redeployment.

---

## Part 5: Test Your Deployment

### Step 5.1: Visit Your App

Open your Vercel URL in a browser: `https://valta-ai.vercel.app`

### Step 5.2: Test Core Features

1. **Upload a Document**
   - Try uploading a PDF or Excel file
   - Check if it uploads successfully

2. **Ask a Question**
   - After upload, ask a question about your document
   - Verify AI responses work

3. **Check API Usage**
   - Look at the sidebar widget showing API usage

If everything works, **congratulations!** Your app is live! 🎉

---

## Part 6: Share with Others

Your app is now publicly accessible. Share this URL with anyone:

```
https://valta-ai.vercel.app
```

**Note**: They can use the app, but they won't see each other's documents (each user has their own session).

---

## Costs & Monitoring

### Platform Costs

**Railway:**
- Free: $5 trial credit (one-time)
- After trial: ~$5/month for basic usage
- Charged based on actual resource usage

**Vercel:**
- Free: 100GB bandwidth/month
- Free: Unlimited deployments
- Should stay free for demos/testing

### API Costs (Important!)

Your OpenAI and Anthropic API keys will be charged based on usage:

**Estimated costs:**
- Simple question: $0.02-0.05
- Complex analysis: $0.10-0.30
- Workbook generation: $0.20-0.50

**Monthly budget recommendation**: $10-20 for light testing

**Monitor usage in:**
- Your app's sidebar widget
- [OpenAI Usage Dashboard](https://platform.openai.com/usage)
- [Anthropic Console](https://console.anthropic.com)

---

## Troubleshooting

### Frontend shows "Failed to connect to API"

**Fix:**
1. Check `NEXT_PUBLIC_API_URL` in Vercel is correct
2. Verify backend is running (visit `/health` endpoint)
3. Check CORS settings in Railway

### Backend shows "Database error"

**Fix:**
1. Check `DATABASE_URL` is set correctly in Railway
2. For now, SQLite should work fine

### File uploads not working

**Fix:**
1. Check file size < 50MB
2. Verify `UPLOAD_DIRECTORY=uploads` is set in Railway

### API calls returning errors

**Fix:**
1. Verify API keys are correct in Railway Variables
2. Check you have credits in OpenAI/Anthropic accounts
3. Look at Railway logs for specific error messages

---

## Next Steps

### Optional Enhancements

1. **Add PostgreSQL Database** (for production)
   - In Railway, add PostgreSQL service
   - Update `DATABASE_URL` to use PostgreSQL

2. **Add Persistent File Storage**
   - In Railway, add a Volume to `/app/uploads`
   - Or integrate S3 for cloud storage

3. **Custom Domain**
   - In Vercel, add your custom domain
   - Update CORS settings accordingly

4. **Monitor Errors**
   - Integrate Sentry for error tracking
   - Set up uptime monitoring

---

## Getting Help

If you run into issues:

1. **Check Logs:**
   - Railway: Click service → View logs
   - Vercel: Click deployment → Function logs

2. **Check Health Endpoints:**
   - Backend: `https://your-backend.railway.app/health`
   - Frontend: Should load without errors

3. **Common Issues:**
   - CORS errors → Check `ALLOWED_ORIGINS` matches frontend URL
   - Build errors → Check Root Directory is set correctly
   - API errors → Verify API keys are valid

---

## Security Checklist

Before sharing publicly:

- [ ] API keys stored in environment variables (not in code)
- [ ] `SECRET_KEY` is randomly generated
- [ ] `ALLOWED_ORIGINS` is set to specific domain (not `*`)
- [ ] `DEBUG=False` in production
- [ ] Repository is private on GitHub
- [ ] File upload size limits are set (`MAX_FILE_SIZE`)

---

## Summary

You've deployed:
- ✅ Backend on Railway: `https://valta-backend-xxxx.railway.app`
- ✅ Frontend on Vercel: `https://valta-ai.vercel.app`
- ✅ Connected with proper CORS
- ✅ Secured with environment variables

**Share this URL with anyone:** `https://valta-ai.vercel.app`

**Total monthly cost:** ~$5-10 (plus API usage)

Happy deploying! 🚀
