# v1.1 Vercel Deployment Guide

**Date:** 2026-01-19  
**Branch:** feature/product-selector-v1.1  
**Commit:** 19685b8  
**Status:** ✅ Pushed to GitHub

---

## 🚀 Deployment Status

### Git Repository
- **GitHub:** https://github.com/serdarozerman-debug/8bitwearnew
- **Branch:** feature/product-selector-v1.1
- **Files:** 111 changed (v1.0 → v1.1)
- **Mockups:** 110 placeholder files

### Vercel Deployment
- **Dashboard:** https://vercel.com/dashboard
- **Auto Deploy:** Enabled (if GitHub integration exists)
- **Expected Time:** 2-5 minutes
- **Expected URL:** https://8bitwearnew.vercel.app

---

## 📋 Deployment Steps

### Auto Deployment (Recommended)
If Vercel GitHub integration is enabled:
1. Push detected automatically ✅
2. Build starts automatically
3. Deployment completes
4. URL: https://8bitwearnew.vercel.app

**Check Status:**
- Go to: https://vercel.com/dashboard
- Find: "8bitwearnew" project
- Tab: "Deployments"
- Status: Building / Ready

### Manual Deployment
If auto deployment doesn't work:

1. **Go to Vercel Dashboard:**
   ```
   https://vercel.com/dashboard
   ```

2. **Select Project:**
   - Click on "8bitwearnew"

3. **Create New Deployment:**
   - Tab: "Deployments"
   - Button: "Create Deployment"
   - Select Branch: feature/product-selector-v1.1
   - Click: "Deploy"

4. **Or Change Production Branch:**
   - Tab: "Settings"
   - Section: "Git"
   - Production Branch: main → feature/product-selector-v1.1
   - Save

---

## ⚙️ Vercel Configuration

### vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60,
      "memory": 3008
    }
  }
}
```

**Purpose:**
- `maxDuration: 60s` - AI conversion can take up to 60 seconds
- `memory: 3008MB` - Sharp image processing needs more memory
- Applies to all API routes under `app/api/`

### Environment Variables
**Required:**
```bash
OPENAI_API_KEY=sk-proj-...
REPLICATE_API_TOKEN=r8_...
```

**Optional:**
```bash
DATABASE_URL=postgresql://...
NEXT_PUBLIC_APP_URL=https://8bitwearnew.vercel.app
```

**How to Add:**
1. Vercel Dashboard → Project
2. Settings → Environment Variables
3. Add each variable
4. Select: Production, Preview, Development
5. Save
6. Redeploy if needed

---

## 🧪 Post-Deployment Testing

### Test Checklist
1. **Homepage:**
   ```
   https://8bitwearnew.vercel.app
   ```
   - ✅ Loads without errors
   - ✅ Product grid visible

2. **Product Detail Page:**
   ```
   https://8bitwearnew.vercel.app/products/premium-tisort
   ```
   - ✅ Left panel: Product/Angle/Color/Size selectors
   - ✅ Canvas: Mockup visible
   - ✅ Right panel: Tools visible

3. **AI Conversion:**
   - Upload a photo
   - ✅ Loading states appear
   - ✅ AI conversion completes (60s timeout)
   - ✅ Pixel art appears on canvas (40-50px)

4. **Text Tool:**
   - Add text
   - ✅ Max 15px font size enforced
   - ✅ Drag & drop works
   - ✅ Resize handles work

5. **Multi-Angle:**
   - Upload image
   - ✅ Dialog: "Başka açı eklemek ister misiniz?"
   - ✅ Add new angle
   - ✅ Switch between angles (state preserved)

6. **Color & Mockup:**
   - Change color selector
   - ✅ Mockup updates automatically
   - ✅ Fallback to white-tshirt.png if mockup missing

7. **Element List:**
   - Add multiple elements (images + text)
   - ✅ List shows all elements
   - ✅ Click to select
   - ✅ Delete works

---

## 🐛 Troubleshooting

### Build Errors

**Error:** `sharp` build failure
```
Error: Could not load the "sharp" module...
```

**Solution:**
- ✅ `vercel.json` already configured
- Increase memory to 3008MB
- Use Next.js Image Optimization API

**Error:** Timeout (10s exceeded)
```
Error: FUNCTION_INVOCATION_TIMEOUT
```

**Solution:**
- ✅ `maxDuration: 60` already set in vercel.json
- Ensure Vercel Pro plan (Hobby: 10s, Pro: 60s)

**Error:** Module not found
```
Error: Cannot find module '@/lib/product-config'
```

**Solution:**
- Check `tsconfig.json` paths
- Verify file exists in repo
- Redeploy

### Runtime Errors

**Error:** Environment variables not set
```
Error: OPENAI_API_KEY is not defined
```

**Solution:**
1. Vercel Dashboard → Settings → Environment Variables
2. Add missing variables
3. Redeploy

**Error:** Mockup images 404
```
GET /mockups/tshirt/white/front-chest.png 404
```

**Solution:**
- ✅ Fallback to `/white-tshirt.png` already in code
- Check if mockup files pushed to GitHub
- Verify `public/mockups/` structure

**Error:** AI conversion fails
```
Error: OpenAI API error
```

**Solution:**
- Check `OPENAI_API_KEY` is valid
- Check API usage/quota
- Check Vercel logs for details

### Performance Issues

**Issue:** Slow page load

**Solutions:**
- Optimize mockup images (compress)
- Use Next.js Image component
- Enable CDN caching

**Issue:** AI conversion timeout

**Solutions:**
- Already set to 60s (max for Pro)
- Consider using queue system
- Add timeout message to user

---

## 📊 Deployment Logs

### How to View Logs
1. Vercel Dashboard → Project
2. Tab: "Deployments"
3. Click on deployment
4. Tab: "Logs"

### Common Log Patterns

**Successful Build:**
```
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
Build completed
```

**AI API Call:**
```
[AI Convert] Starting conversion...
[AI Convert] Vision analysis...
[AI Convert] DALL-E 3 generation...
[AI Convert] Post-processing...
[AI Convert] ✅ Success
```

**Error:**
```
Error: FUNCTION_INVOCATION_TIMEOUT
Error: MODULE_NOT_FOUND
Error: INTERNAL_SERVER_ERROR
```

---

## 🔄 Rollback Plan

### If v1.1 Fails

**Option 1: Rollback to v1.0**
```bash
git checkout v1.0
git push origin v1.0:feature/product-selector-v1.1 --force
```

**Option 2: Use v1.0 Backup**
```bash
cp components/CustomDesignEditor.v1.0.backup.tsx components/CustomDesignEditor.tsx
git add .
git commit -m "Rollback to v1.0"
git push
```

**Option 3: Vercel Dashboard Rollback**
1. Vercel Dashboard → Deployments
2. Find previous successful deployment
3. Click "..." menu
4. "Promote to Production"

---

## 📈 Monitoring

### Metrics to Watch
- **Build Time:** Should be < 2 minutes
- **Function Duration:** AI routes should complete < 60s
- **Error Rate:** Should be < 1%
- **Response Time:** Pages should load < 2s

### Vercel Analytics
- Dashboard → Analytics
- Track page views
- Monitor performance
- Check error rates

### Custom Logging
Check logs for:
- `[AI Convert]` - AI conversion steps
- `[Upload]` - Image upload status
- `ERROR:` - Any errors

---

## 🎯 Success Criteria

Deployment is successful if:
- ✅ Build completes without errors
- ✅ All pages load (homepage, product detail)
- ✅ AI conversion works (upload → pixel art)
- ✅ Drag & drop works
- ✅ Resize handles work
- ✅ Multi-angle works
- ✅ Element list works
- ✅ No console errors in browser
- ✅ All environment variables loaded

---

## 📞 Support

**Vercel Issues:**
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support

**Project Issues:**
- Check: VERSION_1.1_FEATURES.md
- Check: VERSION_1.0_RESTORE.md
- Rollback to v1.0 if needed

---

## 🎉 Next Steps

After successful deployment:

1. **Test thoroughly** on live URL
2. **Monitor logs** for first 24 hours
3. **Collect user feedback**
4. **Plan v1.2** features
5. **Add real mockup images** (replace placeholders)
6. **Optimize performance** (image compression, caching)
7. **Add analytics** (user behavior tracking)

---

**Deployment Date:** 2026-01-19  
**Deployed By:** AI Assistant + User  
**Status:** ✅ Ready for Testing
