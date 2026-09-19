# thewaystation.co.za

Placeholder site for The WayStation. A carriage travels a night road to a lamplit
lodge while the story is told in captions. At the end, two travellers are welcomed
with hugs and the full story and Facebook link appear.

- `site/`: static files. `scene.js` draws everything procedurally on a 320×150 canvas
  at 2 fps. No dependencies, no build step, no external requests.
- `nginx.conf`: redirects `www` to the apex, returns 200 on `/health`, and sets the
  security headers (strict `self`-only CSP).
- `Dockerfile`: `nginxinc/nginx-unprivileged` on :8080.

## Preview locally
```
cd site && python -m http.server 8765
```
Then open http://127.0.0.1:8765/.

## Deploy
Hosted on the Netcup VPS through Dokploy (Traefik + Let's Encrypt). Deploys go through
the approval gate: `ssh netcup-deploy deploy thewaystation <sha>`. Runbook:
ops vault `20-projects/Netcup-VPS/docs/operations.md` §3.3.
