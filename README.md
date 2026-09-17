# Ops Console

<p align="center">
  <strong>Ultra-lightweight self-hosted server observability & PM2 control dashboard</strong><br>
  Engineered for 1GB VPS, Mac Minis, and indie makers.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/RAM_Footprint-~75MB-emerald?style=flat-square" alt="RAM Footprint" />
  <img src="https://img.shields.io/badge/Bundle_Size-~15MB-blue?style=flat-square" alt="Bundle Size" />
  <img src="https://img.shields.io/badge/License-MIT-purple?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/Agent--Ready-llms.txt-orange?style=flat-square" alt="Agent-Ready" />
</p>

---

## 💡 Quickstart: 1-Prompt Deploy (For Cursor / Claude Users)

If you use an AI assistant (Cursor, Claude Code, Windsurf, etc.), paste this single prompt to your agent:

```text
"Inspect github.com/healroot/ops-console and install ops-console on my server.
Run it with PM2 on port 9999, and register my local web services (port 3000) as monitoring targets."
```

Your AI agent will read `llms.txt` from this repository and set up everything automatically.

---

## 🚀 Manual Quickstart

### Option 1: Global NPM Install (Recommended)
```bash
# 1. Install globally
npm install -g ops-console

# 2. Start dashboard on port 9999
ops start -p 9999

# 3. Open in browser
open http://localhost:9999
```

### Option 2: Run with PM2 Daemon
```bash
# Keep ops running 24/7 in the background
pm2 start ops --name "ops-console" -- start -p 9999
```

---

## ✨ Core Features

1. **Host Telemetry (< 0.1% CPU, ~75MB RAM):**
   * Real-time charts for CPU, RAM, Disk mounts, load averages, and host uptime.
   * Native dual-support for Linux (`/proc/meminfo`) and macOS (`vm_stat`).
2. **PM2 Process Control:**
   * Live inspection of all PM2 processes, PID, memory, uptime, and restart counts.
   * One-click **Restart, Stop, and Start** from the browser.
   * Flapping (frequent crash loop) automatic detection.
   * In-browser live log terminal streaming.
3. **HTTP Health Probes:**
   * Multi-target latency & HTTP response code monitoring.
   * Add / Remove targets directly from the UI without code editing.
4. **Mobile Push Alerting (ntfy.sh):**
   * Instant free push notifications on iOS / Android when any service crashes or CPU spikes.
   * No complex webhook configuration; just subscribe to your topic name.

---

## 🛠️ AI Prompt Recipes (Customizing with Vibe-Coding)

Want to extend Ops Console? You don't need to learn the codebase. Just ask your AI agent:

### 1. Connect Cloudflare Tunnel (Free Public HTTPS)
> *"Configure a Cloudflare Tunnel for ops-console on port 9999 using my domain ops.mydomain.com so I can access it from outside."*

### 2. Switch from ntfy to Telegram Alerts
> *"Modify src/lib/alerts/ntfy.ts to dispatch crash alerts to my Telegram bot token <TOKEN> and chat ID <CHAT_ID>."*

### 3. Add Custom Health Checks
> *"Add a PostgreSQL database health check probe to src/lib/monitor/health.ts."*

---

## ⚙️ Configuration (`~/.ops/config.json`)

On first launch, Ops Console automatically creates a config file at `~/.ops/config.json`:

```json
{
  "port": 9999,
  "pin": "8888",
  "ntfy": {
    "enabled": true,
    "server": "https://ntfy.sh",
    "topic": "my-ops-alerts"
  },
  "targets": [
    {
      "id": "tgt-web",
      "name": "My Web App",
      "type": "internal_port",
      "url": "http://127.0.0.1:3000"
    }
  ]
}
```

---

## 📄 License & Credits

Released under the [MIT License](LICENSE).  
Maintained with ❤️ by the **HealRoot** team.
