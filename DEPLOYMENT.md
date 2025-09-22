# 🚀 ClearVitals Deployment Guide

## Deploy to Vercel - Complete Guide

### Prerequisites
- Vercel account (free at vercel.com)
- GitHub account
- OpenAI API key

### Step 1: Deploy Backend (FastAPI) to Vercel

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/clearvitals.git
   git push -u origin main
   ```

2. **Deploy Backend to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - **Root Directory:** Set to `clear-vitals/api`
   - **Framework Preset:** Python
   - **Build Command:** Leave empty
   - **Output Directory:** Leave empty
   - **Install Command:** `pip install -r requirements.txt`

3. **Environment Variables for Backend:**
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `PYTHON_VERSION`: 3.9

### Step 2: Deploy Frontend (Next.js) to Vercel

1. **Deploy Frontend to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - **Root Directory:** Set to `clear-vitals/frontend`
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

2. **Environment Variables for Frontend:**
   - `NEXT_PUBLIC_API_URL`: Your backend Vercel URL (e.g., `https://clearvitals-api.vercel.app`)

### Step 3: Update API URL

After deploying the backend, update the frontend's environment variable:
- Go to your frontend project in Vercel dashboard
- Go to Settings → Environment Variables
- Add `NEXT_PUBLIC_API_URL` with your backend URL
- Redeploy the frontend

### Step 4: Test Deployment

1. Visit your frontend URL
2. Enter your OpenAI API key
3. Upload a PDF file
4. Test the chat functionality

### URLs Structure:
- **Frontend:** `https://clearvitals.vercel.app`
- **Backend:** `https://clearvitals-api.vercel.app`

### Troubleshooting:
- Make sure both projects are deployed successfully
- Check environment variables are set correctly
- Verify API URLs are accessible
- Check Vercel function logs for errors

### Cost:
- Vercel free tier includes:
  - 100GB bandwidth
  - 100GB-hours serverless function execution
  - Perfect for development and small projects
