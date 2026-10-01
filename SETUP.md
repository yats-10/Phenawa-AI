# AI Trial Room — Setup & Deployment Guide

---

## 1. Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL 14+ (local or hosted)
- An OpenAI API account with access to GPT Image 2.5
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

# OpenAI image editing
OPENAI_API_KEY=your_openai_api_key
OPENAI_IMAGE_MODEL=gpt-image-2.5-sunburst

# Admin seed
ADMIN_SEED_SECRET=pick_a_strong_seed_secret

# App
PORT=3001
NODE_ENV=development
```

**Getting each value:**
- `DATABASE_URL`: Your PostgreSQL connection string.
- `OPENAI_API_KEY`: [OpenAI API keys](https://platform.openai.com/api-keys) → Create API key. The default model is `gpt-image-2.5-sunburst`; set `OPENAI_IMAGE_MODEL=gpt-image-2.5-flare` for a faster alternative.
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
curl -X POST http://localhost:3001/admin/seed \
  -H "x-seed-secret: your_ADMIN_SEED_SECRET_value" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"choose_a_strong_password"}'
```

You should get:
```json
{ "message": "Admin account created" }
```

> Run this only once. A second seed request is rejected after the first admin exists.

### 2.5 Verify the API is running

Use the admin login endpoint with the credentials you just created. This project does not currently expose a public health endpoint.

---

## 3. Frontend Setup (`trial-room-app`)

### 3.1 Install dependencies

```bash
cd trial-room-app
npm install
```

### 3.2 Point to your backend

For local development, `src/environments/environment.ts` already points to `http://localhost:3001`.

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
# Open http://localhost:4300 in your browser
```

Open the URL shown by the development server. Do not open `src/app/pages/home/home.page.html` as a file: it is an Angular template and will show raw `{{ ... }}` placeholders without the running app.
The separate admin sign-in is at `http://localhost:4300/admin/login`.

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
OPENAI_API_KEY
OPENAI_IMAGE_MODEL=gpt-image-2.5-sunburst
ADMIN_SEED_SECRET
NODE_ENV=production
PORT=3001
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

In production, TypeORM sets `synchronize: false`. Apply reviewed database migrations before deploying schema changes; do not switch a production server to development mode to synchronize tables.

### 4.6 Seed admin on Railway

After deployment, get your Railway public URL (e.g. `https://xxx.up.railway.app`) and run:

```bash
curl -X POST https://xxx.up.railway.app/admin/seed \
  -H "x-seed-secret: your_ADMIN_SEED_SECRET_value" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"choose_a_strong_password"}'
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
5. App sends both images to the backend → OpenAI edits them into one try-on image → result is returned to the app. Generation metadata is recorded in PostgreSQL; the image itself is not saved there.
6. Shopkeeper can save to gallery or share directly with the customer.
7. Admin monitors daily usage from the dashboard.

---

## 9. Environment Variable Checklist

### Backend (`.env` / Railway Variables)
- [ ] `DATABASE_URL`
- [ ] `JWT_SECRET`
- [ ] `ADMIN_JWT_SECRET`
- [ ] `OPENAI_API_KEY`
- [ ] `OPENAI_IMAGE_MODEL` (optional; defaults to `gpt-image-2.5-sunburst`)
- [ ] `ADMIN_SEED_SECRET`
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

**OpenAI returns no image:**
- Verify `OPENAI_API_KEY` is valid and your organization has access to GPT Image models.
- Check backend logs for the HTTP status and the OpenAI usage record.
- The API uses one image edit call with two image inputs and a 1024×1536 JPEG output at medium quality.

**TypeORM schema out of sync:**
- In development: `synchronize: true` handles this automatically.
- In production: create and apply a reviewed migration before deploying the schema change.
