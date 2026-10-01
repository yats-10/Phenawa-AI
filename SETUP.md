# Phenawa AI — Setup & Deployment

Monorepo with two deployables:

| Folder | What it is | Hosted on |
|---|---|---|
| `trial-room-api` | NestJS + TypeORM + Postgres API | Railway |
| `trial-room-app` | Ionic/Angular 17 SPA (also the Capacitor Android shell) | Vercel |

---

## 1. Prerequisites

- Node.js 20.x for the API and Node.js 22.x for the Android app toolchain
- PostgreSQL 14+ for local development
- An OpenAI API key with access to GPT Image models
- Railway and Vercel accounts
- Java 21 and Android SDK Platform 36 + Build Tools 36 for Android builds

---

## 2. Local development

### 2.1 Backend

```bash
cd trial-room-api
npm install
cp .env.example .env     # then fill in every value
createdb trial_room      # or: psql -U postgres -c "CREATE DATABASE trial_room;"
npm run start:dev
```

The API runs migrations on boot, so the tables appear on first start. Leave
`CORS_ORIGINS` empty locally — empty means "allow every browser origin", which
is what the dev server needs.

Seed the first admin once:

```bash
curl -X POST http://localhost:3001/admin/seed \
  -H "x-seed-secret: $ADMIN_SEED_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"choose_a_strong_password"}'
```

A second seed request is rejected once an admin exists.

### 2.2 Frontend

```bash
cd trial-room-app
npm install
npm start          # http://localhost:4300
```

`src/environments/environment.ts` already points at `http://localhost:3001`.
Admin sign-in is at `/admin/login`.

Do not open `src/app/pages/**/*.html` directly as files — they are Angular
templates and render as raw `{{ }}` without the dev server.

---

## 3. Database schema (migrations)

`synchronize` is **off in every environment**. The schema is owned by the
migrations in `src/migrations/`, and `migrationsRun: true` applies pending ones
at boot — so a deploy never starts against a stale schema and never silently
alters a column.

After changing an entity:

```bash
cd trial-room-api
npm run migration:generate -- src/migrations/DescribeTheChange
```

Then **register it** in `src/app.module.ts` (`migrations: [...]`) — the array is
explicit so the compiled bundle always contains the migrations it needs. Review
the generated SQL, commit it, and the next deploy applies it.

Other commands: `npm run migration:run`, `npm run migration:revert`.

---

## 4. Railway — backend

### 4.1 Create the service

Railway dashboard → **New Project** → **Deploy from GitHub repo** → this repo.
Because the repo is a monorepo, open the service's **Settings** and set:

- **Root Directory**: `trial-room-api`

Build and deploy commands come from `trial-room-api/railway.json`; Node 20 is
pinned in `nixpacks.toml`. Nothing else to configure there.

### 4.2 Add Postgres

Project → **New** → **Database** → **PostgreSQL**.

### 4.3 Variables

On the API service → **Variables**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference, not a literal) |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | 64-char random string |
| `ADMIN_JWT_SECRET` | a *different* 64-char random string |
| `JWT_EXPIRES_IN` | `30d` |
| `ADMIN_JWT_EXPIRES_IN` | `24h` |
| `ADMIN_SEED_SECRET` | strong random string |
| `OPENAI_API_KEY` | your OpenAI key |
| `OPENAI_IMAGE_MODEL` | `gpt-image-2.5-sunburst` |
| `ADMIN_PHONE` | support number shown on expiry |
| `MAX_DAILY_ALERT_THRESHOLD` | `80` |
| `CORS_ORIGINS` | set after the Vercel domain exists (section 5.3) |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Do **not** set `PORT` — Railway injects it, and the app binds to `0.0.0.0` on
whatever it provides.

`DATABASE_SSL` is optional. Unset, TLS is decided from the host: plain for
`localhost` and `*.railway.internal`, TLS everywhere else.

### 4.4 Expose and verify

Settings → **Networking** → **Generate Domain**. Then:

```bash
curl https://<your-service>.up.railway.app/health
# {"status":"ok","database":"up"}
```

`/health` is the configured healthcheck path, so a deploy that cannot reach the
database never goes live.

### 4.5 Seed the admin

```bash
curl -X POST https://<your-service>.up.railway.app/admin/seed \
  -H "x-seed-secret: <ADMIN_SEED_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"choose_a_strong_password"}'
```

---

## 5. Vercel — frontend

### 5.1 Point the app at the API

Edit `trial-room-app/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://<your-service>.up.railway.app',
  adminPhone: '9817352522',
};
```

This is baked in at build time, so **changing it requires a redeploy**.

### 5.2 Create the project

Vercel → **Add New** → **Project** → import this repo, then set:

- **Root Directory**: `trial-room-app`

Build command, install command, output directory and routing all come from
`trial-room-app/vercel.json`. The output directory is `www/browser` — Angular 17's
application builder nests the browser bundle one level below `outputPath`.

### 5.3 Close the CORS loop

Once Vercel gives you the domain, set on the Railway API service:

```
CORS_ORIGINS=https://<your-project>.vercel.app,https://*.vercel.app
```

The `*.` entry matches one subdomain label, which covers preview deployments.
Add your custom domain to the list when you attach one. Requests with no
`Origin` header — the Android build, curl, health probes — are always allowed;
CORS only constrains browsers.

---

## 6. Android app (Capacitor)

The native project is in `trial-room-app/android` and targets Android API 36.
Use Node 22, Java 21, Android SDK Platform 36 and Build Tools 36.
On this Mac, the command-line toolchain installed for the build is available with:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```

### Local emulator test

Start the API on your Mac at port 3001, then:

```bash
cd trial-room-app
npm ci
npm run android:apk:local
```

The installable debug APK is at
`android/app/build/outputs/apk/debug/app-debug.apk`. This build calls
`http://10.0.2.2:3001`, which maps to the host Mac only inside an Android
emulator. The debug manifest allows this HTTP connection. It will not work on
a physical phone.

### Local Android phone over USB

Enable USB debugging on the phone, connect it to the Mac, and keep the local API
running on port 3001. Then:

```bash
cd trial-room-app
npm run android:apk:usb
adb reverse tcp:3001 tcp:3001
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

The phone build calls `http://localhost:3001` through the USB reverse tunnel.
Repeat `adb reverse` after reconnecting the phone. This is a debug-only build;
it will not reach the API when the phone is disconnected.

### Physical device or Play Store build

Deploy and verify a public HTTPS API first. Set that URL when syncing the app:

```bash
cd trial-room-app
PHENAWA_API_URL=https://your-api.example.com npm run android:sync:release
npx cap open android
```

In Android Studio, use **Build → Generate Signed Bundle / APK**. Choose an
Android App Bundle (`.aab`) for Google Play or an APK for direct distribution.
Store the signing keystore outside Git. Release builds use HTTPS only. Test
camera, gallery selection, generation, save to gallery, and sharing on a real
device before distributing.

---

## 7. API reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Liveness + database check |
| POST | `/auth/login` | None | Shopkeeper login |
| POST | `/tryon/generate` | JWT | Generate try-on image |
| GET | `/tryon/count` | JWT | Generation count for the signed-in shop |
| GET | `/fabrics` | JWT | List the shop's fabrics |
| POST | `/fabrics` | JWT | Save a fabric |
| DELETE | `/fabrics/:id` | JWT | Delete a fabric |
| POST | `/admin/login` | None | Admin login |
| POST | `/admin/seed` | `x-seed-secret` header | Create the first admin (once) |
| GET | `/admin/users` | Admin JWT | List shops |
| POST | `/admin/users` | Admin JWT | Create a shop account |
| PATCH | `/admin/users/:id` | Admin JWT | Update a shop |
| GET | `/admin/users/:id/stats` | Admin JWT | Shop statistics |

---

## 8. Daily flow

1. Admin creates a shop account with an expiry date.
2. Shopkeeper signs in on mobile.
3. Shopkeeper captures a customer photo and a fabric photo (or picks one from
   the saved catalogue).
4. Picks a garment type → **Try It On**.
5. Both images go to the API, OpenAI composes the try-on, the result comes back
   to the app. Generation metadata is stored in Postgres.
6. Shopkeeper saves or shares the result.

Catalogue fabric images are stored base64 in Postgres. Generated customer
images are returned to the app and are not saved in the database.

---

## 9. Troubleshooting

**Browser requests fail with a CORS error.**
The exact origin must be in `CORS_ORIGINS` — scheme included, no trailing slash.
The API logs `Blocked CORS request from origin: ...` for every rejection.

**Frontend still calls localhost (or the old URL) in production.**
`environment.prod.ts` is compiled into the bundle. Update it and redeploy; a
Vercel environment variable will not change it.

**Deploy is marked unhealthy on Railway.**
`/health` reports `database: down`, or the app never booted. Check that
`DATABASE_URL` is the `${{Postgres.DATABASE_URL}}` reference and look for a
failed migration in the deploy logs — a migration error aborts startup by design.

**`uuid_generate_v4()` does not exist.**
The initial migration creates the `uuid-ossp` extension. If it was skipped, run
`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` against the database and redeploy.

**OpenAI returns no image.**
Check the key and model access, then the API logs for the HTTP status. The call
sends two images and asks for a 1024×1536 JPEG.
