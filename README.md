# RedLineCAD Discord Bot

The official Discord bot for [RedLineCAD](https://redlinecad.app) — a full Computer-Aided Dispatch system built for console roleplay communities on PS5 and Xbox.

---

## Commands

| Command | Description |
|---|---|
| `/civilian lookup name:` | Look up a civilian record |
| `/civilian priors name:` | View prior arrests |
| `/civilian vehicles name:` | View registered vehicles |
| `/civilian medical name:` | View medical history |
| `/civilian warrants name:` | View active warrants |
| `/plate lookup plate:` | Run a plate |
| `/plate stolen plate:` | Flag vehicle as stolen |
| `/plate recover plate:` | Mark vehicle as recovered |
| `/plate impound plate:` | Impound a vehicle |
| `/plate watchlist plate:` | Add vehicle to watchlist |
| `/warrant issue name: charges:` | Issue a warrant |
| `/warrant approve id:` | Approve a warrant |
| `/warrant clear name:` | Clear warrants for a person |
| `/warrant list` | List active warrants |
| `/arrest log name:` | Log an arrest |
| `/arrest search name:` | Search arrest history |
| `/bolo issue subject:` | Issue a BOLO |
| `/bolo cancel id:` | Cancel a BOLO |
| `/bolo list` | List active BOLOs |
| `/dispatch create title: location:` | Create a dispatch call |
| `/dispatch close id:` | Close a call |
| `/dispatch assign id: callsign:` | Assign unit to call |
| `/dispatch list` | View active calls |
| `/unit onduty callsign:` | Go on duty |
| `/unit offduty callsign:` | Go off duty |
| `/unit status callsign: status:` | Update unit status |
| `/unit panic` | Trigger panic alarm |
| `/unit list` | View all active units |
| `/fine issue player: amount: reason:` | Issue a fine |
| `/fine pay player: amount:` | Mark a fine as paid |
| `/fine waive player:` | Waive a fine |
| `/fine balance player:` | Check bank balance |
| `/ems pcr patient:` | Patient care report |
| `/ems mci location:` | Declare MCI |
| `/ems cardiac location:` | Cardiac arrest call |
| `/fire incident location:` | Log fire incident |
| `/fire hazmat location:` | Hazmat alert |
| `/fire evacuation area:` | Order evacuation |
| `/help all` | Full command list |
| `/units` | View all active units |
| `/calls` | View all active calls |

---

## Environment Variables

These must be set in your hosting dashboard before the bot will start.

| Variable | Description | Where to find it |
|---|---|---|
| `DISCORD_TOKEN` | Your bot token | [Discord Developer Portal](https://discord.com/developers/applications) → Your App → Bot → Token |
| `DISCORD_APP_ID` | Your application/client ID | Discord Developer Portal → Your App → General Information → Application ID |
| `DISCORD_GUILD_ID` | Your Discord server ID | Right-click your server in Discord → Copy Server ID (requires Developer Mode on) |
| `FIREBASE_URL` | Your Firebase Realtime Database URL | Firebase Console → Your Project → Realtime Database → copy the URL |

---

## Deploy to Koyeb (Free, Always-On)

[Koyeb](https://koyeb.com) is a free always-on hosting platform — no credit card required, no sleep timeouts, deploys directly from GitHub.

### Step 1 — Create a Koyeb account

Go to [koyeb.com](https://koyeb.com) and sign up for free.

### Step 2 — Create a new App

1. Click **Create App** in the Koyeb dashboard
2. Select **GitHub** as the deployment source
3. Connect your GitHub account and select `Nexus-Emergency-Systems/redlinecad-bot`
4. Set the branch to `main`

### Step 3 — Configure the service

| Setting | Value |
|---|---|
| **Builder** | Buildpack (auto-detected as Node.js) |
| **Run command** | `node index.js` |
| **Instance type** | Free |
| **Region** | Closest to you |

### Step 4 — Add environment variables

In the **Environment variables** section add:

```
DISCORD_TOKEN    = your-bot-token
DISCORD_APP_ID   = your-application-id
DISCORD_GUILD_ID = your-discord-server-id
FIREBASE_URL     = https://your-project-default-rtdb.firebaseio.com
```

### Step 5 — Deploy

Click **Deploy**. Within ~60 seconds you should see this in the logs:

```
✅ RedLineCAD Bot online as RedLineCAD#XXXX
```

### Step 6 — Register slash commands (run once)

After the bot is running, register the slash commands from your local machine:

```bash
git clone https://github.com/Nexus-Emergency-Systems/redlinecad-bot.git
cd redlinecad-bot
npm install
# Create a .env file with your 4 variables, then:
npm run register
```

Commands will appear in your Discord server within seconds.

---

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) and create a project
2. Enable **Realtime Database** (start in test mode for development)
3. Copy the database URL — looks like `https://your-project-default-rtdb.firebaseio.com`
4. Set that as `FIREBASE_URL` in Koyeb

All CAD data is scoped per Discord server automatically.

---

## Local Development

```bash
git clone https://github.com/Nexus-Emergency-Systems/redlinecad-bot.git
cd redlinecad-bot
npm install
# Create a .env file with your 4 variables, then:
npm start
```

---

## Support

Join the [RedLineCAD Discord](https://discord.gg/WgR34HSdcw) for help and updates.

Website: [redlinecad.app](https://redlinecad.app)
