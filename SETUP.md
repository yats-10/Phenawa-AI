# AI Trial Room — Setup & Deployment Guide

---

## 1. Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL 14+ (local or hosted)
- A Google Cloud project with **Gemini API** enabled
- A Cloudflare account with **R2** enabled and a bucket created
- (Optional) Railway account for backend hosting
- (Optional) Vercel account for frontend hosting
- Android Studio (for Android APK build)

---

## 2. Backend Setup (`trial-room-api`)

### 2.1 Install dependencies

```bash
cd trial-room-api
npm install
```

### 2.2 Configure environment

Copy `.env.example` to `.env` and fill in every value:

```bash
cp .env.example .env
```

```env
# Database — local example
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/trial_room

# JWT secrets — use long random strings
JWT_SECRET=change_me_to_a_long_random_secret_at_least_64_chars
ADMIN_JWT_SECRET=change_me_to_a_different_long_random_secret

# Google Gemini
GEMINI_API_KEY=AIza...

# Cloudflare R2
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=trial-room-images
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxx.r2.dev

# Admin seed
ADMIN_SEED_SECRET=pick_a_strong_seed_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ChangeMe@1234

# App
PORT=3000
NODE_ENV=development
```

**Getting each value:**
- `DATABASE_URL`: Your PostgreSQL connection string.
- `GEMINI_API_KEY`: [Google AI Studio](https://aistudio.google.com/app/apikey) → Create API key.
- R2 values: Cloudflare Dashboard → R2 → your bucket → Manage R2 API Tokens. `R2_PUBLIC_URL` is the bucket's public URL (enable public access in the bucket settings).
- Generate secure secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### 2.3 Create the database

```bash
# If using local PostgreSQL
psql -U postgres -c "CREATE DATABASE trial_room;"
```

TypeORM `synchronize: true` will auto-create all tables on first run.

### 2.4 Seed the first admin account

Start the dev server first:

```bash
npm run start:dev
```

Then in a new terminal, seed the admin:

```bash
curl -X POST http://localhost:3000/admin/seed \
  -H "x-seed-secret: your_ADMIN_SEED_SECRET_value"
```

You should get:
```json
{ "message": "Admin seeded successfully" }
```

> Run this only once. Calling it again with the same username returns a safe "already exists" message.

### 2.5 Verify the API is running

```bash
curl http://localhost:3000/health
# or just open http://localhost:3000 in a browser
```

---

## 3. Frontend Setup (`trial-room-app`)

### 3.1 Install dependencies

```bash
cd trial-room-app
npm install
```

### 3.2 Point to your backend

For local development, `src/environments/environment.ts` already points to `http://localhost:3000`.

For production, edit `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-railway-app.up.railway.app'  // ← your Railway URL
};
```

### 3.3 Run the web app

```bash
npm start
# Opens at http://localhost:8100
```

---

## 4. Railway Backend Deployment

### 4.1 Create a Railway project

```bash
npm install -g @railway/cli
railway login
cd trial-room-api
railway init
railway up
```

Or use the Railway web dashboard: New Project → Deploy from GitHub repo → select `trial-room-api`.

### 4.2 Add a PostgreSQL database in Railway

Dashboard → your project → New → Database → PostgreSQL.

Railway automatically sets `DATABASE_URL` in your project environment.

### 4.3 Set environment variables in Railway

Dashboard → your project → Variables → add all values from your `.env` **except** `DATABASE_URL` (Railway sets that automatically):

```
JWT_SECRET
ADMIN_JWT_SECRET
GEMINI_API_KEY
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
ADMIN_SEED_SECRET
ADMIN_USERNAME
ADMIN_PASSWORD
NODE_ENV=production
PORT=3000
```

### 4.4 Create `railway.toml` (optional — manual config)

```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm run start:prod"
restartPolicyType = "on_failure"
```

### 4.5 Set `NODE_ENV=production`

In production, TypeORM sets `synchronize: false`. Run migrations manually if needed, or temporarily set `NODE_ENV=development` after a schema change, then switch back.

### 4.6 Seed admin on Railway

After deployment, get your Railway public URL (e.g. `https://xxx.up.railway.app`) and run:

```bash
curl -X POST https://xxx.up.railway.app/admin/seed \
  -H "x-seed-secret: your_ADMIN_SEED_SECRET_value"
```

---

## 5. Vercel Frontend Deployment

### 5.1 Build the production bundle

Ensure `environment.prod.ts` has your Railway URL, then:

```bash
cd trial-room-app
npm run build:prod
# Output → www/
```

### 5.2 Deploy via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

When prompted:
- **Build command**: `npm run build:prod`
- **Output directory**: `www`
- **Install command**: `npm install`

### 5.3 Create `vercel.json` for SPA routing

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Place this in `trial-room-app/vercel.json`.

---

## 6. Android APK Build (Capacitor)

### 6.1 Prerequisites

- Android Studio installed with SDK Platform 33+
- Java 17+ JDK

### 6.2 Sync Capacitor

```bash
cd trial-room-app
npm run build:prod
npx cap sync android
```

This copies the `www/` web bundle into the Android project and installs native plugins.

### 6.3 Open in Android Studio

```bash
npx cap open android
```

### 6.4 Update `AndroidManifest.xml`

Add internet permission (Capacitor usually adds this, but verify):

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### 6.5 Build the APK

In Android Studio:
- **Debug APK**: Build → Build Bundle(s)/APK(s) → Build APK(s)
- **Release APK**: Build → Generate Signed Bundle/APK → APK → create/use a keystore → release build

Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## 7. Key API Endpoints Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | None | Shopkeeper login |
| POST | `/tryon/generate` | JWT | Generate try-on image |
| GET | `/fabrics` | JWT | List fabrics |
| POST | `/fabrics` | JWT | Upload new fabric |
| DELETE | `/fabrics/:id` | JWT | Delete fabric |
| GET | `/history?page=1&limit=20` | JWT | Paginated history |
| POST | `/admin/login` | None | Admin login |
| POST | `/admin/seed` | Seed secret header | Create first admin |
| GET | `/admin/users` | Admin JWT | List all shops |
| POST | `/admin/users` | Admin JWT | Create shop account |
| PATCH | `/admin/users/:id` | Admin JWT | Update shop |
| GET | `/admin/users/:id/stats` | Admin JWT | Shop statistics |

---

## 8. Daily Usage Flow

1. **Admin** logs into the dashboard → creates a shop account with an expiry date.
2. **Shopkeeper** logs in on mobile with their username/password.
3. Shopkeeper captures/uploads a customer photo and a fabric photo (or selects from their catalogue).
4. Selects garment type → taps "Try It On".
5. App sends both images to the backend → Gemini generates the try-on → result is stored in R2 → displayed in-app.
6. Shopkeeper can save to gallery or share directly with the customer.
7. Admin monitors daily usage from the dashboard.

---

## 9. Environment Variable Checklist

### Backend (`.env` / Railway Variables)
- [ ] `DATABASE_URL`
- [ ] `JWT_SECRET`
- [ ] `ADMIN_JWT_SECRET`
- [ ] `GEMINI_API_KEY`
- [ ] `R2_ACCOUNT_ID`
- [ ] `R2_ACCESS_KEY_ID`
- [ ] `R2_SECRET_ACCESS_KEY`
- [ ] `R2_BUCKET_NAME`
- [ ] `R2_PUBLIC_URL`
- [ ] `ADMIN_SEED_SECRET`
- [ ] `ADMIN_USERNAME`
- [ ] `ADMIN_PASSWORD`
- [ ] `NODE_ENV`

### Frontend
- [ ] `src/environments/environment.prod.ts` → `apiUrl` set to Railway URL

---

## 10. Common Issues & Fixes

**CORS error in browser dev:**
The backend enables CORS for all origins by default (see `main.ts`). If you restrict origins in production, add your Vercel domain to the `origin` array.

**Camera not working on Android:**
- Make sure `@capacitor/camera` is in `package.json` and synced: `npx cap sync android`
- Camera permission must be granted on first use

**Gemini returns no image:**
- Verify `GEMINI_API_KEY` is valid and the Gemini API is enabled in your Google Cloud project
- The model `gemini-2.0-flash-preview-image-generation` must be available in your region
- Check backend logs for the full error response from Google's API

**Images not loading after upload:**
- Verify `R2_PUBLIC_URL` is the correct public bucket URL (not the API URL)
- Ensure the R2 bucket has **Public Access** enabled in Cloudflare dashboard

**TypeORM schema out of sync:**
- In development: `synchronize: true` handles this automatically
- In production: temporarily set `NODE_ENV=development`, restart once to apply changes, then set back to `production`
