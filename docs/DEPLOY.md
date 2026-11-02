# Deploying

The app is on Vercel, the API on Render, the database on Neon and files on Cloudflare R2. The app works without any of the last three: it just can't sync.

Requests go `browser → Vercel → (rewrite) → Render`, so the app and API share one origin and session cookies stay first-party. File bytes skip all that and go straight between the browser and R2.

## 1. Neon

1. Create a project. Copy the **pooled** connection string, which includes `sslmode=require`.

## 2. Cloudflare R2

1. Create a private bucket with no public access.
2. Create an R2 API token with read and write access to that bucket. Note the account ID, access key ID and secret.
3. In the bucket's CORS settings, add your Vercel domain:

```json
[{ "AllowedOrigins": ["https://YOUR-APP.vercel.app"], "AllowedMethods": ["GET", "PUT"], "AllowedHeaders": ["Content-Type"], "MaxAgeSeconds": 3600 }]
```

## 3. Render

1. New → Blueprint, and pick this repository. It reads `render.yaml`.
2. Fill in the secrets: `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
3. Deploy. Migrations run on each start. The server lives in `server/` rather than `api/` on purpose: Vercel would turn a root `api/` folder into functions. `https://YOUR-SERVICE.onrender.com/api/health` should answer `{"status":"ok"}`.

`render.yaml` names no plan, so choose one when you create the service. A free instance sleeps when idle and takes about a minute to wake; the app keeps working and syncs once it's up.

## 4. Vercel

1. Put your Render address in `vercel.json`, in place of `life-dashboard-api.onrender.com`, if the service has a different name.
2. Import the repository. Vercel reads `vercel.json`; no environment variables are needed.

## 5. Check it on the real thing

The automated tests use an in-memory Postgres and file store, so these only show up here:

- [ ] Create an account on the Vercel address. In devtools, the `ld_session` cookie is `HttpOnly`, `Secure`, `SameSite=Strict`.
- [ ] Add a task on a laptop, then sign in on a phone and see it.
- [ ] Add a photo on one device and see it on the other. If this fails, check the R2 CORS settings first.
- [ ] Save a very long Library page. If the push fails with a size error, the rewrite has a lower body limit than `MAX_BATCH_BYTES` in `shared/src/sync.ts`.
- [ ] From two networks, make 11 failed sign-ins with different emails on one. The other network should still be able to sign in. If both get locked out, `TRUST_PROXY_HOPS` is wrong: every person looks like one address.
- [ ] Let the API sleep, then open the app and confirm it stays usable while it wakes.

## Limits to know about

- There's no password reset by email or email verification yet. Anyone can register any address, and a forgotten password needs a manual fix in the database.
- Each account can store 1 GB of files (`USER_FILE_QUOTA_BYTES`) and 500 MB of synced rows (`USER_DATA_QUOTA_BYTES`). Deleting a file doesn't free its space yet, because nothing purges it from R2.
- The Render address is public, so the per-address limit can be dodged by calling it directly. Sign-ins are also limited per email, and sign-ups to 100 an hour across the whole service. That also means someone can briefly block sign-in for a known email, or fill the hour's sign-ups.
- The server can read synced data. It's encrypted in transit and, by the providers' defaults, at rest, but not end to end.
