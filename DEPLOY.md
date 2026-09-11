# Deploying to a VPS

Written for **Ubuntu 22.04 / 24.04 LTS** on a Hostinger KVM plan, serving
**fugroobets.com**. Every block is meant to be pasted whole.

Run everything as `root` unless a command says otherwise. The site itself runs
as an unprivileged `fugroo` user, which is what the `sudo -u fugroo` lines are
for.

Nothing here contains a secret. Step 6 is a template you fill in.

---

## 0. When to move the domain

**If the domain is already serving a live site somewhere, do not move it yet.**
Steps 1 to 8 need no DNS at all — they end with the app answering on
`127.0.0.1:3000` on the VPS. Move DNS after that, and the only outage is the
propagation window rather than the whole setup.

If the domain is parked or new, point it now and it will be ready by the time
you reach step 9.

Either way, the records are two **A records**:

| Type | Name  | Value       |
|------|-------|-------------|
| A    | `@`   | your VPS IP |
| A    | `www` | your VPS IP |

Delete any existing A, AAAA or CNAME on `@` and `www` first. A name cannot hold
a CNAME and an A record at once, so a leftover CNAME on `www` will block the
new record rather than lose to it.

Check from your own machine — not from the VPS, which may answer from its own
hosts file:

```bash
dig +short fugroobets.com
dig +short www.fugroobets.com
```

Both should print only the VPS IP. Certbot in step 10 proves ownership over
port 80, so it cannot succeed until they do.

---

## 1. Update the box

```bash
apt update && apt upgrade -y
```

## 2. Install everything the site needs

Node 20 is the floor (`package.json` says `>=20`). Ubuntu 22.04 ships Node 12,
so it comes from NodeSource rather than the distro.

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx git
node -v && nginx -v
```

## 3. Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

## 4. Swap

A KVM1 has enough RAM to serve the site and not much spare while building it —
`next build` type-checks and compiles at once, and a build killed by the OOM
reaper looks like a mysterious hang. 2 GB of swap costs nothing and removes the
question.

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

## 5. Create the service user and clone

```bash
adduser --system --group --home /srv/fugroo --shell /bin/bash fugroo
mkdir -p /srv/fugroo
git clone https://github.com/aspct49-dev/fugroo.git /srv/fugroo/app
chown -R fugroo:fugroo /srv/fugroo
```

## 6. Environment

Paste this, then edit the file and fill in every blank. The values are the same
ones in your local `.env`, except `AUTH_URL` and `NEXT_PUBLIC_SITE_URL`, which
become the real domain.

```bash
sudo -u fugroo tee /srv/fugroo/app/.env >/dev/null <<'ENV'
ROOBET_API_KEY=
ROOBET_USER_ID=

DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

AUTH_SECRET=
ADMIN_DISCORD_IDS=

AUTH_URL=https://fugroobets.com
NEXT_PUBLIC_SITE_URL=https://fugroobets.com
ENV

chmod 600 /srv/fugroo/app/.env
nano /srv/fugroo/app/.env
```

Generate `AUTH_SECRET` if you want a fresh one rather than reusing the local
value:

```bash
openssl rand -base64 32
```

**`AUTH_URL` is not optional and not cosmetic.** Next builds `request.url` from
its own binding: it honours `X-Forwarded-Proto` but ignores `X-Forwarded-Host`,
so behind nginx it believes it is `https://localhost:3000` even though the
right `Host` header arrived. Auth.js builds the OAuth callback from that, so
leaving this unset sends people to localhost *on their own machine*, where
nothing is listening. `trustHost` does not save you from it.

Leave `KV_REST_API_URL` and `KV_REST_API_TOKEN` out entirely. On a VPS the site
writes `data/*.json` on local disk, which is what it was designed for.

## 7. Install and build

```bash
sudo -u fugroo bash -lc 'cd /srv/fugroo/app && npm ci && npm run build'
```

`npm ci` installs devDependencies too — TypeScript is needed *to* build, even
though it is not needed to run. Leave them in place; pruning afterwards saves a
few MB and costs you the next build.

## 8. Run it as a service

```bash
tee /etc/systemd/system/fugroo.service >/dev/null <<'UNIT'
[Unit]
Description=Fugroo
After=network.target

[Service]
Type=simple
User=fugroo
Group=fugroo
WorkingDirectory=/srv/fugroo/app
# Next loads .env itself, the same as it does locally. Do not use
# EnvironmentFile here: systemd parses it differently to dotenv and will
# mangle comments and quoted values.
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
# The site writes data/*.json under here and nothing outside it.
ReadWritePaths=/srv/fugroo/app
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now fugroo
systemctl status fugroo --no-pager
```

It should answer locally before nginx is involved:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
```

`200` means the app is fine and anything that goes wrong next is nginx or DNS.

## 9. Put nginx in front

```bash
tee /etc/nginx/sites-available/fugroo >/dev/null <<'CONF'
server {
    listen 80;
    listen [::]:80;
    server_name fugroobets.com www.fugroobets.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # The four headers that matter. X-Forwarded-Proto is the one Next
        # actually reads, and without it every internal URL it builds comes
        # out as http:// behind an https:// site.
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # The raffle picker holds a WebSocket to Kick from the browser, not
        # through here — but leave these in, because anything added later that
        # does upgrade a connection will fail silently without them.
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # Built assets are content-hashed, so they can be cached hard.
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
CONF

ln -sf /etc/nginx/sites-available/fugroo /etc/nginx/sites-enabled/fugroo
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Now the domain should answer over plain HTTP. **Do not skip this check** — certbot
in step 10 proves ownership over port 80, so if this fails, that will too:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://fugroobets.com/
```

## 10. HTTPS

```bash
certbot --nginx -d fugroobets.com -d www.fugroobets.com --agree-tos -m you@example.com --redirect
```

Swap in a real address for `-m`; it is only used for expiry warnings. `--redirect`
sends HTTP to HTTPS, which you want because `AUTH_URL` is the `https://` origin.

Renewal is installed automatically. Confirm it:

```bash
systemctl list-timers | grep certbot
certbot renew --dry-run
```

## 11. Tell Discord about the new callback

On [discord.com/developers/applications](https://discord.com/developers/applications)
→ your app → **OAuth2** → **Redirects**, add:

```
https://fugroobets.com/api/auth/callback/discord
```

Keep the localhost one alongside it so local development still works. This has
to match `AUTH_URL` exactly — scheme, host, no trailing slash. Sign-in will fail
with `redirect_uri_mismatch` until it does.

## 12. Check it

```bash
curl -s -o /dev/null -w 'home      %{http_code}\n' https://fugroobets.com/
curl -s -o /dev/null -w 'board     %{http_code}\n' https://fugroobets.com/leaderboard
curl -s -o /dev/null -w 'login     %{http_code}\n' https://fugroobets.com/login
curl -s https://fugroobets.com/leaderboard | grep -o 'Live from Roobet\|Feed unavailable'
```

That last line is the one worth watching: it reads the Roobet credentials at
request time, so `Live from Roobet` means the API key made it into the
environment correctly.

Then in a browser: sign in with Discord, and check `/admin` appears.

---

## Deploying an update

```bash
sudo -u fugroo bash -lc 'cd /srv/fugroo/app && git pull && npm ci && npm run build'
systemctl restart fugroo
```

`data/` is gitignored, so a pull never touches linked accounts, tournaments or
guesses.

Restarting **does** clear the current raffle round's in-progress state if one is
open — and anyone with the picker open loses their chat connection, because that
socket lives in the browser tab. Deploy between streams.

## Logs

```bash
journalctl -u fugroo -f            # the app
tail -f /var/log/nginx/error.log   # the proxy
```

## Things that will bite you

**The raffle picker needs its tab open.** The Kick chat socket runs in the
admin's browser, not on the server, so entries collect only while the picker is
on screen. Closing the tab or letting the machine sleep stops the round. This is
deliberate — it is what makes the picker work on any host — and the panel says
so above the controls.

**Back up `data/`.** It is one directory and it holds every linked Roobet
account, every tournament and every guess round. Nothing else stores them.

```bash
tar czf ~/fugroo-data-$(date +%F).tar.gz -C /srv/fugroo/app data
```

**The admin list should be ids, not handles.** `ADMIN_DISCORD_IDS` is checked
first and wins. `src/lib/admin.ts` still carries a handle as a fallback; once
you have logged in on the VPS and confirmed the id works, take the handle out —
a Discord handle can be changed or released and then claimed by someone else.
