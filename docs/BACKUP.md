# Backup Strategy

This app has no built-in backup automation — backups are an operational responsibility of whoever hosts the Postgres instance. This page documents the recommended approach for the Docker Compose deployment described in [DEPLOYMENT.md](./DEPLOYMENT.md); adapt it if you're hosting Postgres elsewhere (RDS, Neon, Supabase, etc. all have their own managed backup/point-in-time-recovery features — prefer those over the manual approach below if available).

## What's actually irreplaceable

- **The Postgres database.** Everything: CRM data, bookings, invoices/payments, audit log, uploaded-file *references*.
- **Uploaded files themselves**, if `CLOUDINARY_*` is configured — but Cloudinary is the source of truth for those; the database only stores their URLs. Cloudinary's own retention/backup applies; no separate local backup is needed for file content.
- **`.env`** — not a backup target in the traditional sense, but losing `AUTH_SECRET` or the Facebook/Cloudinary credentials means regenerating them and users re-authenticating; keep a copy in a password manager or secrets vault, not just on the server.

Everything else (`.next` build output, `node_modules`) is regenerable from source + git and doesn't need backing up.

## Manual backup (pg_dump)

```bash
# From the host, against the running container:
docker exec dmd-postgres-prod pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c -f /tmp/backup.dump
docker cp dmd-postgres-prod:/tmp/backup.dump ./backups/dmd-$(date +%Y%m%d-%H%M%S).dump
```

`-F c` (custom format) is compressed and supports selective/parallel restore, unlike plain SQL dumps.

## Restore

```bash
docker cp ./backups/dmd-20260101-030000.dump dmd-postgres-prod:/tmp/restore.dump
docker exec dmd-postgres-prod pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists /tmp/restore.dump
```

`--clean --if-exists` drops conflicting objects before recreating them — appropriate for restoring into an already-initialized database. Test this on a scratch database before you ever need it for real.

## Recommended schedule

- **Daily** full `pg_dump`, retained for at least 14 days.
- **Before every deploy** that includes a migration — a fast manual dump you can restore from if the migration goes wrong. `prisma migrate deploy` doesn't roll back automatically on failure.
- **Off-host storage** — copy dumps somewhere that isn't the same disk/VM as the database (S3, a second server, etc.). A backup that lives next to the thing it backs up doesn't survive the failure modes that actually matter (disk failure, host compromise, accidental `docker volume rm`).

## Automating it

A cron job on the host running the two-line `pg_dump` command above, piping to your object storage of choice, is sufficient for this app's scale. There's no in-app scheduler to hook into — see the "lazy cron" note in [DATABASE.md](./DATABASE.md) for why this app avoids background job infrastructure in general.
