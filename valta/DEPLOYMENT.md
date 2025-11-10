# Valta Deployment Guide - Railway

This guide will help you deploy Valta to Railway and share it with your friends.

## Quick Start

1. **Sign up for Railway**: Go to [railway.app](https://railway.app) and sign up with GitHub
2. **Create a new project**: Click "New Project" in Railway dashboard
3. **Add PostgreSQL**: Click "New" → "Database" → "PostgreSQL"
4. **Deploy Backend**: Click "New" → "GitHub Repo" → Select your repo
5. **Deploy Frontend**: Click "New" → "GitHub Repo" → Select your repo (same repo, different service)

## Service Configuration

### Backend Service Settings

1. **Root Directory**: Set to `valta/backend`
2. **Watch Paths**: Set to `valta/backend/**`
3. **Environment Variables**:
   ```bash
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   OPENAI_API_KEY=your_openai_key_here
   ANTHROPIC_API_KEY=your_anthropic_key_here
   ALLOWED_ORIGINS=https://${{Frontend.RAILWAY_PUBLIC_DOMAIN}}
   PORT=${{PORT}}
   ```
4. **Important**: Mark `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` as **SEALED** for security

### Frontend Service Settings

1. **Root Directory**: Set to `valta/frontend`
2. **Watch Paths**: Set to `valta/frontend/**`
3. **Environment Variables**:
   ```bash
   NEXT_PUBLIC_API_URL=https://${{Backend.RAILWAY_PUBLIC_DOMAIN}}
   ```

### PostgreSQL Database

- Automatically configured when you add PostgreSQL service
- Connection string is automatically provided to backend via `${{Postgres.DATABASE_URL}}`

## File Uploads Storage

For persistent file storage, add a **Volume** to the backend service:

1. Go to Backend Service → Settings → Volumes
2. Click "New Volume"
3. Set mount path: `/app/uploads`
4. Save

The volume ensures uploaded files persist across deployments.

## Environment Variables Reference

### Backend Variables (from `.env.example`)

```bash
# Database - automatically provided by Railway
DATABASE_URL=${{Postgres.DATABASE_URL}}

# AI API Keys - add your actual keys here
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...

# CORS - references frontend domain
ALLOWED_ORIGINS=https://${{Frontend.RAILWAY_PUBLIC_DOMAIN}}

# Port - automatically provided by Railway
PORT=${{PORT}}

# Optional: Pinecone (if you enable vector search)
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
```

### Frontend Variables

```bash
# Backend API URL - references backend domain
NEXT_PUBLIC_API_URL=https://${{Backend.RAILWAY_PUBLIC_DOMAIN}}
```

## Deployment Steps

### 1. Push Configuration Files

The `railway.json` files are already created. Just commit and push:

```bash
git add valta/backend/railway.json valta/frontend/railway.json
git commit -m "Add Railway deployment configuration"
git push
```

### 2. Configure Services in Railway Dashboard

**For Backend:**
- Settings → Root Directory: `valta/backend`
- Settings → Watch Paths: `valta/backend/**`
- Variables → Add all backend environment variables listed above

**For Frontend:**
- Settings → Root Directory: `valta/frontend`
- Settings → Watch Paths: `valta/frontend/**`
- Variables → Add frontend environment variables listed above

### 3. Deploy

Railway automatically deploys when you push to GitHub. Watch the deployment logs in the Railway dashboard.

### 4. Get Your URLs

After deployment:
- Backend URL: `https://your-backend.up.railway.app`
- Frontend URL: `https://your-frontend.up.railway.app`

Share the **Frontend URL** with your friends!

## Troubleshooting

### CORS Errors
- Make sure `ALLOWED_ORIGINS` in backend includes your frontend's Railway domain
- Check that frontend is using correct `NEXT_PUBLIC_API_URL`

### Database Connection Errors
- Verify `DATABASE_URL` is set to `${{Postgres.DATABASE_URL}}`
- Make sure PostgreSQL service is running

### File Upload Issues
- Create a Volume for `/app/uploads` in backend service
- Check volume is mounted correctly

### Build Failures
- Check Root Directory is set correctly (`valta/backend` or `valta/frontend`)
- Verify Watch Paths match (`valta/backend/**` or `valta/frontend/**`)

## Cost Considerations

Railway offers:
- **Free Trial**: $5 of free credits to start
- **Hobby Plan**: $5/month for basic usage
- **Pro Plan**: $20/month for production apps

For sharing with friends, the Hobby plan should be sufficient.

## Security Best Practices

1. **Sealed Variables**: Always mark API keys as SEALED in Railway
2. **CORS**: Keep `ALLOWED_ORIGINS` restricted to your frontend domain only
3. **Environment Separation**: Never commit `.env` files to Git
4. **HTTPS**: Railway provides automatic HTTPS for all domains

## Next Steps

After deployment:
1. Test all features (upload, analysis, chat)
2. Monitor usage in Railway dashboard
3. Set up custom domain (optional, requires Pro plan)
4. Configure error monitoring (Sentry, etc.)

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Valta Issues: Check your repository's issues page
