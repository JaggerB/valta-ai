# Valta Deployment Guide

This guide will help you deploy Valta to production so your co-founders can access and test the application.

## Recommended Deployment Setup

**Frontend (Next.js)**: Vercel (Free tier available)
**Backend (FastAPI)**: Railway or Render (Free tier available)

---

## Option 1: Deploy to Railway + Vercel (Recommended)

### Step 1: Deploy Backend to Railway

1. **Sign up for Railway**
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account and select the Valta repository
   - Choose the `valta/backend` folder as the root directory

3. **Set Environment Variables**
   In Railway dashboard, go to Variables tab and add:
   ```
   OPENAI_API_KEY=your_openai_key
   ANTHROPIC_API_KEY=your_anthropic_key
   SECRET_KEY=generate_a_random_secret_key
   DATABASE_URL=sqlite:///./valta.db
   ALLOWED_ORIGINS=*
   DEBUG=False
   LOG_LEVEL=INFO
   MAX_FILE_SIZE=52428800
   UPLOAD_DIRECTORY=uploads
   ```

4. **Deploy**
   - Railway will automatically detect the Dockerfile and deploy
   - Wait for deployment to complete
   - Copy your backend URL (e.g., `https://valta-backend.railway.app`)

### Step 2: Deploy Frontend to Vercel

1. **Sign up for Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub

2. **Import Project**
   - Click "Add New Project"
   - Import your Valta repository
   - Set Root Directory to `valta/frontend`
   - Framework Preset: Next.js (auto-detected)

3. **Set Environment Variables**
   In Vercel project settings, add:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app
   NEXT_PUBLIC_APP_NAME=Valta
   NEXT_PUBLIC_APP_VERSION=1.0.0
   ```
   **Important**: Replace `your-railway-backend-url` with the actual URL from Step 1.4

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Copy your frontend URL (e.g., `https://valta.vercel.app`)

### Step 3: Update CORS Settings

1. Go back to Railway dashboard
2. Update the `ALLOWED_ORIGINS` environment variable:
   ```
   ALLOWED_ORIGINS=https://valta.vercel.app,https://valta-*.vercel.app
   ```
   **Note**: This allows your Vercel preview deployments to work too

3. Redeploy the backend service

### Step 4: Share with Co-founders

Send your co-founders the Vercel URL: `https://valta.vercel.app`

They can now:
- Upload financial documents (PDF, XLSX, CSV)
- Ask questions about their data
- View AI-generated workbooks and analysis
- Monitor API usage in real-time

---

## Option 2: Deploy to Render + Vercel

### Step 1: Deploy Backend to Render

1. **Sign up for Render**
   - Go to [render.com](https://render.com)
   - Sign in with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Service**
   - Name: `valta-backend`
   - Root Directory: `valta/backend`
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Instance Type: Free

4. **Set Environment Variables**
   ```
   OPENAI_API_KEY=your_openai_key
   ANTHROPIC_API_KEY=your_anthropic_key
   SECRET_KEY=generate_a_random_secret_key
   DATABASE_URL=sqlite:///./valta.db
   ALLOWED_ORIGINS=*
   DEBUG=False
   LOG_LEVEL=INFO
   MAX_FILE_SIZE=52428800
   UPLOAD_DIRECTORY=uploads
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Copy your backend URL (e.g., `https://valta-backend.onrender.com`)

### Step 2: Follow Frontend Steps from Option 1

Follow "Step 2: Deploy Frontend to Vercel" from Option 1 above, but use your Render backend URL instead.

---

## Option 3: Docker Compose (Self-Hosted)

If you prefer to host on your own server (DigitalOcean, AWS, etc.):

1. **Create docker-compose.yml** in project root:

```yaml
version: '3.8'

services:
  backend:
    build: ./valta/backend
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - SECRET_KEY=${SECRET_KEY}
      - DATABASE_URL=sqlite:///./valta.db
      - ALLOWED_ORIGINS=http://localhost:3000
    volumes:
      - ./valta/backend/uploads:/app/uploads
      - ./valta/backend/valta.db:/app/valta.db

  frontend:
    build: ./valta/frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend
```

2. **Run**:
```bash
docker-compose up -d
```

---

## Important Security Notes

⚠️ **Before deploying to production:**

1. **Generate a Strong SECRET_KEY**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. **Never commit API keys to GitHub**
   - Ensure `.env` is in `.gitignore`
   - Use platform environment variables instead

3. **Set Proper CORS Origins**
   - Don't use `*` in production
   - Use specific domain: `https://valta.vercel.app`

4. **Database Considerations**
   - SQLite is fine for testing/demos
   - For production, consider PostgreSQL:
     ```
     DATABASE_URL=postgresql://user:pass@host/dbname
     ```
   - Railway and Render both offer free PostgreSQL databases

5. **File Uploads**
   - Free tier hosting has ephemeral storage (files may be deleted)
   - Consider using S3 or similar for persistent storage in production

---

## Monitoring & Costs

### Free Tier Limits

**Vercel Free**:
- 100 GB bandwidth/month
- 100 deployments/day
- Serverless function execution

**Railway Free Trial**:
- $5 credit (one-time)
- After that: Pay-as-you-go ($0.000463/GB-hour for RAM)

**Render Free**:
- 750 hours/month
- Service spins down after 15 min inactivity (takes ~30s to wake up)

### API Usage

The app tracks API usage in real-time via the sidebar widget:
- Monitor Claude/GPT costs
- Set monthly budget ($10 default)
- View remaining credits

**Estimated costs** (with Claude 3.7 Sonnet):
- Simple question: ~$0.02-0.05
- Complex workbook generation: ~$0.10-0.30
- $10/month ≈ 50-100 complex analyses

---

## Troubleshooting

### Backend won't start
- Check environment variables are set correctly
- Verify API keys are valid
- Check logs in Railway/Render dashboard

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS settings on backend
- Ensure backend is running (check health endpoint: `/health`)

### Files not uploading
- Check `MAX_FILE_SIZE` setting
- Verify `uploads/` directory exists
- Check file format (PDF, XLSX, CSV supported)

### API credits running out fast
- Check usage in sidebar widget
- Review API calls in backend logs
- Adjust monthly budget in `usage_tracker.py`

---

## Next Steps After Deployment

1. **Upload Test Documents**
   - Use sample P&L statements or financial reports
   - Test with various formats (PDF, Excel, CSV)

2. **Test Core Features**
   - Ask questions about uploaded documents
   - Generate workbooks with AI analysis
   - Try Startup Analysis dashboard

3. **Monitor Usage**
   - Watch API credits in sidebar
   - Check Railway/Render resource usage
   - Monitor for any errors in platform dashboards

4. **Gather Feedback**
   - Have co-founders test all features
   - Document any bugs or issues
   - Collect feature requests

---

## Support

If you encounter issues:
1. Check platform status pages (Railway, Vercel, Render)
2. Review application logs in platform dashboards
3. Check backend health endpoint: `https://your-backend-url/health`
4. Verify all environment variables are set correctly

---

**Quick Start Checklist**:
- [ ] Railway/Render account created
- [ ] Backend deployed with environment variables
- [ ] Backend URL copied
- [ ] Vercel account created
- [ ] Frontend deployed with backend URL
- [ ] CORS updated with frontend URL
- [ ] Test upload working
- [ ] Test AI analysis working
- [ ] Co-founders invited
- [ ] Usage monitoring confirmed working

Happy deploying! 🚀
