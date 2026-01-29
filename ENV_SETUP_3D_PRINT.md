# 3D Print Pipeline - Environment Variables

Add these to your `.env.local`:

```bash
# Supplier email for 3D print notifications
SUPPLIER_EMAIL=supplier@example.com

# App URL for internal API calls (use your Vercel URL in production)
NEXT_PUBLIC_APP_URL=http://localhost:3200
```

For Vercel deployment, add via:
```bash
vercel env add SUPPLIER_EMAIL
vercel env add NEXT_PUBLIC_APP_URL
```
