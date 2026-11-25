# AYOS server runbook

How to put AYOS on **ayosofficial.com** with a Hostinger VPS, and how to keep it running.
Follow the parts in order the first time. Commands run on the server unless it says "on your Mac".

What runs on the server (`compose.prod.yaml`):

| Container | Job |
|---|---|
| `web` (Caddy) | HTTPS certificate, the React app, sends requests to the right place, and **load-balances** between the two PHP containers. The only one open to the internet (ports 80 and 443). |
| `backend`, `backend-2` (PHP-FPM) | Two identical copies of the Laravel API (sign-in, uploads). If one crashes or is restarting, Caddy sends everyone to the other. |
| `redis` | Cache, sessions and rate-limit counters, shared by both PHP containers (so you stay signed in whichever one answers). Saved to disk. |
| `reverb` | Live chat sockets |
| `postgres` | The database |

---

## Part 1 — Buy and point (you, in browsers)

1. **Buy the VPS** in Hostinger: a KVM plan with at least 2 GB RAM (4 GB is comfortable), **Ubuntu 24.04 LTS**, in the data center nearest the Philippines. During setup, add your SSH public key (on your Mac: `cat ~/.ssh/id_ed25519.pub`; create one with `ssh-keygen -t ed25519` if it says "No such file").
2. **Point the domain** at the server, where you bought ayosofficial.com (DNS settings):
   - `A` record, name `@`, value = the VPS IP address
   - `A` record, name `www`, value = the same IP
   Check from your Mac after a few minutes: `dig +short ayosofficial.com` shows the IP.

## Part 2 — Make the server safe (once)

Log in as root the first time (`ssh root@<IP>`), then:

```bash
adduser ayos                                   # choose a strong password (needed for sudo)
usermod -aG sudo ayos
rsync --archive --chown=ayos:ayos ~/.ssh /home/ayos   # your SSH key works for the new user
```

From your Mac, check `ssh ayos@<IP>` works **before** the next step. Then, as `ayos`:

```bash
# Only SSH keys, and no root login.
sudo sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/; s/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Firewall: SSH, HTTP, HTTPS only.
sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw allow 443/udp && sudo ufw enable

# Security updates install themselves.
sudo apt update && sudo apt install -y unattended-upgrades && sudo dpkg-reconfigure -plow unattended-upgrades
```

**Install Docker** (Docker's own repository, so `docker compose` is current):

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ayos     # then log out and back in
```

## Part 3 — Outside services (you, in browsers)

Do these before the first deploy, so the settings are ready:

- **Brevo:** add and verify the domain ayosofficial.com. Brevo shows DNS records (SPF, DKIM, DMARC): add each one where you manage the domain's DNS. Then create an **SMTP key** (SMTP & API → SMTP).
- **reCAPTCHA** (Google admin console): add `ayosofficial.com` to the key's domains.
- **Google sign-in** (Google Cloud console → Credentials → your OAuth client): add the redirect URI `https://ayosofficial.com/auth/google/callback`.
- **Backblaze B2:** create a **private** bucket (for example `ayos-backups`), then an application key limited to that bucket only.
- **PayMongo** (when live keys are ready): add a webhook to `https://ayosofficial.com/api/webhooks/paymongo` for payment events and copy its signing secret.

## Part 4 — First deploy

```bash
# If the GitHub repo is private: create a read-only deploy key on the server (ssh-keygen -t ed25519),
# add its .pub under GitHub → repo Settings → Deploy keys, and clone with git@github.com:itswilgen/AYOS.git.
cd ~ && git clone https://github.com/itswilgen/AYOS.git && cd AYOS
cp deploy/.env.production.example .env && chmod 600 .env
nano .env       # fill in every value; the comments say where each comes from
```

Generate the values the comments ask for (run each, paste the result into `.env`):

```bash
echo "base64:$(openssl rand -base64 32)"  # APP_KEY (the same format Laravel's key:generate makes)
openssl rand -base64 32 | tr -d '/+='    # DB_PASSWORD
openssl rand -base64 32 | tr -d '/+='    # REDIS_PASSWORD (a different one)
openssl rand -hex 16                     # REVERB_APP_KEY
openssl rand -hex 32                     # REVERB_APP_SECRET
openssl rand -base64 32                  # BACKUP_PASSPHRASE (also save it in your password manager!)
```

Then deploy:

```bash
./deploy/deploy.sh --no-pull
```

It builds, runs the database migrations, starts everything and waits until `https://ayosofficial.com/up` answers. The first HTTPS certificate takes up to a minute.

**First admin:** open https://ayosofficial.com on your phone, sign up with your own email, and click the verification link in the email (this also proves Brevo works). Then:

```bash
docker compose -f compose.prod.yaml exec backend php artisan ayos:admin-create you@example.com
```

Sign in again; the admin console is at `/admin`. Turn on two-step sign-in (MFA) for the admin account right away.

## Part 5 — Backups

Run one by hand, then test a restore:

```bash
sudo mkdir -p /var/backups/ayos && sudo chown ayos:ayos /var/backups/ayos
./deploy/backup.sh
./deploy/restore-test.sh        # downloads the newest copy from B2 and restores it into a throwaway database
```

The restore test must end with "Restore test passed", and its counts must match the admin dashboard. **A backup you never restored is only a hope.**

Then schedule it every night at 2:00 AM Manila time (18:00 UTC):

```bash
crontab -e
# add this line:
0 18 * * * cd /home/ayos/AYOS && ./deploy/backup.sh >> /home/ayos/backup.log 2>&1
```

Check `~/backup.log` the next morning. Run `./deploy/restore-test.sh` again once a month.

## Part 6 — Know when it breaks

- **UptimeRobot** (free): add a "Keyword" monitor for `https://ayosofficial.com/up` with the keyword `Application up`, every 5 minutes, alerting your email and phone.
- Test the alert once: `docker compose -f compose.prod.yaml stop web`, wait for the alert, then `docker compose -f compose.prod.yaml start web`.

## Part 7 — Smoke test on a phone

Sign up → verify email → sign in → add an address → search a service → send a request with a photo → (second account) accept it → chat both ways (live, no refresh) → confirm the job → leave a review → View profile → Your data → Download my data.

## Everyday work

| Task | Command |
|---|---|
| Deploy the latest `main` | `./deploy/deploy.sh` |
| See what's running | `docker compose -f compose.prod.yaml ps` |
| Read the logs | `docker compose -f compose.prod.yaml logs --tail=100 backend backend-2` (or `web`, `reverb`, `redis`, `postgres`) |
| Laravel command | `docker compose -f compose.prod.yaml exec backend php artisan <command>` |
| Restart one part | `docker compose -f compose.prod.yaml restart backend` (then `backend-2`, one at a time, so the site stays up) |
| Clear the cache | `docker compose -f compose.prod.yaml exec backend php artisan cache:clear` (clears cached data and rate-limit counters; nobody is signed out, sessions live in another Redis database) |
| Disk space | `df -h` and `docker system df` |

## If something goes wrong

- **Site down:** `docker compose -f compose.prod.yaml ps` — anything not "running"? Read its logs. `./deploy/deploy.sh --no-pull` rebuilds and restarts everything.
- **No HTTPS certificate:** check DNS points at this server (`dig +short ayosofficial.com`), that ports 80 and 443 are open (`sudo ufw status`), then `docker compose -f compose.prod.yaml logs web`.
- **Emails not arriving:** check spam; check Brevo's logs; check the SPF/DKIM records in Brevo show as verified.
- **Live chat not live:** chat still works (it falls back to checking every few seconds). Check `docker compose -f compose.prod.yaml logs reverb`.
- **Bad deploy:** `git log --oneline -5`, then `git checkout <previous commit>` and `./deploy/deploy.sh --no-pull`. Database migrations are not undone automatically; if a migration was the problem, restore the night's backup (ask for help first).
