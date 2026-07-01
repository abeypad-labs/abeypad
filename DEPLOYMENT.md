# VPS deployment for `abeypad.xyz`

This project is a Vite single-page app. The VPS does not need the source repo to serve it in production. GitHub Actions builds the app and pushes the generated `dist/` bundle to the VPS.

This repository now includes:

- `.github/workflows/deploy.yml` to build and deploy on every push to `master`
- `deploy/docker-compose.yml` to run a tiny Nginx container on the existing Docker `proxy` network
- `deploy/nginx.conf` with SPA fallback for React Router routes

## Production flow

1. A developer pushes to `master`.
2. GitHub Actions runs `npm ci` and `npm run build`.
3. The workflow uploads `dist/` and the runtime config to the VPS over SSH.
4. Docker Compose keeps `abeypad-frontend` running on the Docker `proxy` network.
5. Nginx Proxy Manager proxies `abeypad.xyz` to `abeypad-frontend:80`.

## Why this shape fits this VPS

This server already has `nginx-proxy-manager` bound to ports `80` and `443`. Do not install a second public Nginx instance for this app. Let Nginx Proxy Manager remain the only ingress point and proxy the domain to the frontend container over the existing Docker `proxy` network.

## One-time VPS preparation

Run these commands on the VPS:

```bash
mkdir -p /opt/apps/abeypad/{dist,deploy}
docker compose version
docker network inspect proxy >/dev/null
```

The deploy workflow can create the directories automatically, but creating them once is fine too.

## GitHub repository secrets

Add these under `Settings -> Secrets and variables -> Actions -> Secrets`:

- `VPS_HOST`: your VPS IP or DNS name
- `VPS_USER`: the Linux user that GitHub Actions should SSH as
- `VPS_SSH_KEY`: the private deploy key contents used by GitHub Actions

Generate a dedicated deploy key locally:

```bash
ssh-keygen -t ed25519 -C "abeypad-github-actions" -f abeypad-github-actions
```

Install the public key on the VPS user:

```bash
ssh-copy-id -i abeypad-github-actions.pub <user>@<server>
```

Paste the private key file contents into the `VPS_SSH_KEY` secret.

## GitHub repository variables

These are optional because the workflow has defaults:

- `VPS_DEPLOY_PATH=/opt/apps/abeypad`
- `VPS_SSH_PORT=22`

No app env variables are required for the first production deployment.

## Nginx Proxy Manager setup

In Nginx Proxy Manager, create a Proxy Host:

- `Domain Names`: `abeypad.xyz`, `www.abeypad.xyz`
- `Scheme`: `http`
- `Forward Hostname / IP`: `abeypad-frontend`
- `Forward Port`: `80`
- `Block Common Exploits`: enabled
- `Websockets Support`: enabled

Then request an SSL certificate in Nginx Proxy Manager and enable force SSL.

## Namecheap DNS

Point the domain to this VPS:

- `A` record for `@` -> your VPS public IPv4
- `A` record for `www` -> your VPS public IPv4

If you use Cloudflare or another DNS proxy in front later, keep the Nginx Proxy Manager target unchanged.

## First deployment checklist

1. Commit and push these deployment files.
2. Add the GitHub secrets and variables.
3. Create the Namecheap DNS records.
4. Create the Nginx Proxy Manager Proxy Host to `127.0.0.1:8085`.
5. Push to `master` or trigger `Deploy Frontend` manually from GitHub Actions.

## Notes

- The workflow deploys built files only. The VPS does not run `git pull`, `npm install`, or `npm run build`.
- `npm ci` requires a current `package-lock.json`. If dependencies change, commit the updated lockfile with them.
- The app currently builds successfully after refreshing `package-lock.json`, so commit that lockfile update before relying on CI.
