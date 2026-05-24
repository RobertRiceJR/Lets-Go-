# Cloudflare Tunnel Setup

This guide exposes your local Let's Go! app at a public HTTPS URL so anyone can access it from their phone.

**Two options — start with Option A:**

| | Option A: Quick URL (no account) | Option B: Custom domain |
|--|--|--|
| Account required | None | Free Cloudflare account |
| Domain required | No | Yes (any domain in Cloudflare) |
| URL format | `random.trycloudflare.com` | `letsgofamily.yourdomain.com` |
| Persists after restart | No (new URL each time) | Yes (same URL always) |
| Best for | Testing, sharing temporarily | Permanent family URL |

---

## Option A — Instant URL (No Account, No Domain)

This is the fastest way to get a public URL. No sign-up required.

### 1. Install cloudflared

**Mac:**
```bash
brew install cloudflare/cloudflare/cloudflared
```

**Windows:** Download the installer from:
https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

Run the `.msi` installer. Then open a new terminal to pick up the PATH change.

**Linux (Debian/Ubuntu):**
```bash
curl -L https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install cloudflared
```

**Linux (Fedora/RHEL):**
```bash
sudo rpm --import https://pkg.cloudflare.com/cloudflare-main.gpg
curl -fsSl https://pkg.cloudflare.com/cloudflared-ascii.repo | sudo tee /etc/yum.repos.d/cloudflared.repo
sudo yum install cloudflared
```

### 2. Verify installation
```bash
cloudflared --version
```

### 3. Make sure the app is running first
```bash
# From the project root:
npm run pm2:status   # should show "lets-go" as online
# Or: node server/server.js
```

### 4. Start the tunnel
```bash
cloudflared tunnel --url http://localhost:3001
```

After a few seconds you'll see output like:
```
Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):
https://abc123def456.trycloudflare.com
```

Share that URL with your wife. It works immediately — no DNS setup needed.

> **Note:** The URL changes every time you restart the tunnel. For a permanent URL, use Option B.

---

## Option B — Permanent Custom Domain

Requires a free Cloudflare account and a domain pointed to Cloudflare's nameservers.

### 1. Create a free Cloudflare account
Go to https://cloudflare.com and sign up (free tier is plenty).

### 2. Add your domain to Cloudflare
If you already own a domain, add it to Cloudflare and update your registrar's nameservers. Skip if you don't have a domain — use Option A.

### 3. Install cloudflared
Same as Option A, Step 1 above.

### 4. Authenticate cloudflared with your Cloudflare account
```bash
cloudflared tunnel login
```
This opens a browser window. Log in and select your domain. A credentials file is saved to `~/.cloudflared/cert.pem`.

### 5. Create a named tunnel
```bash
cloudflared tunnel create lets-go
```
Output looks like:
```
Created tunnel lets-go with id a1b2c3d4-e5f6-...
Tunnel credentials written to /Users/yourname/.cloudflared/a1b2c3d4-e5f6-....json
```
**Copy the tunnel ID** — you'll need it in the next step.

### 6. Create the config file

Create `~/.cloudflared/config.yml` (use the example in this folder as a template):

**Mac/Linux:** `~/.cloudflared/config.yml`
**Windows:** `C:\Users\YOUR_USERNAME\.cloudflared\config.yml`

```yaml
tunnel: a1b2c3d4-e5f6-...        # your tunnel ID from step 5
credentials-file: /Users/YOUR_USERNAME/.cloudflared/a1b2c3d4-e5f6-....json

ingress:
  - hostname: letsgofamily.yourdomain.com
    service: http://localhost:3001
  - service: http_status:404
```

### 7. Add a DNS record pointing to your tunnel
```bash
cloudflared tunnel route dns lets-go letsgofamily.yourdomain.com
```
This creates a CNAME record in your Cloudflare DNS automatically.

### 8. Test it manually first
```bash
cloudflared tunnel run lets-go
```
Open `https://letsgofamily.yourdomain.com` — you should see Let's Go!

### 9. Install as a system service (starts on reboot)

**Mac/Linux:**
```bash
sudo cloudflared service install
sudo systemctl start cloudflared   # Linux
# Mac: the installer creates a LaunchDaemon automatically
```

**Windows (run as Administrator):**
```powershell
cloudflared service install
```
This installs cloudflared as a Windows Service that starts with the machine.

---

## Verify the tunnel is running

```bash
cloudflared tunnel list
# Should show your tunnel as "Active: Yes"

cloudflared tunnel info lets-go
# Shows connection details
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `cloudflared: command not found` | Restart terminal after installation; on Windows verify PATH |
| DNS not resolving | Wait 5-10 min after `tunnel route dns`; check Cloudflare dashboard DNS tab |
| 502 Bad Gateway | App isn't running — check `npm run pm2:status` |
| Tunnel exits immediately | Check `~/.cloudflared/config.yml` for correct tunnel ID and credentials path |
