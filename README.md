# 🕒 TimeDock

**Elevate your productivity with TimeDock—the premium, topbar-resident time tracking command center.**

Designed for the solo operator, the elite freelancer, and the agile small agency, TimeDock isn't just a timer; it's a productivity cockpit that stays with you, without getting in your way.

![TimeDock Interface](https://via.placeholder.com/800x450.png?text=TimeDock+Command+Center)

## ✨ Features

- **🚀 Obsidian-Level Speed**: Clock in and out in milliseconds directly from your system tray.
- **💎 Premium Dashboard**: A sleek, glassmorphism-inspired interface for deep audit logs and entity management.
- **📂 Structural Tracking**: Manage Clients, Projects, and Tasks with a hierarchical precision that makes reporting a breeze.
- **📊 Professional Export**: One-click professional CSV and PDF generation, ready for invoicing.
- **⚡️ Zero Friction**: Custom hotkeys and a persistent top-of-screen presence (on macOS) for uninterrupted workflow.
- **🛡️ Data Sovereignty**: Local-first architecture using SQLite. Your data, your machine, your speed.

## 🛠️ Technical Stack

- **Foundational**: Electron + React + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: Zustand (Atomic, fast, scalable)
- **Database**: SQLite (Local-first)
- **Communications**: Type-safe IPC Bridge

## 🚦 Getting Started

1. **Clone & Install**:
   ```bash
   git clone https://github.com/AVolatile/Time-Dock-v1.git
   cd Time-Dock-v1
   npm install
   ```

2. **Run in Development**:
   ```bash
   npm run dev
   ```

3. **Build Core**:
   ```bash
   npm run build
   ```

4. **Install Locally to Applications**:
   ```bash
   npm run install:local
   ```

   This builds the production Electron app, rebuilds native dependencies for macOS, installs `TimeDock.app` into `/Applications`, clears local quarantine metadata when present, and applies the local ad-hoc signature macOS needs to run the app from your machine.

## 📦 Production Release Build (macOS)

To generate a standalone, native macOS `.app` bundle and a distributable `.dmg` installer artifact, simply execute the package script:

```bash
npm run make
```

Upon completion, all built artifacts will be placed in the `/dist` directory. The primary outputs you care about are located exactly at:
- **Application Bundle**: `dist/mac-arm64/TimeDock.app`
- **Installer DMG**: `dist/TimeDock-1.0.0-arm64.dmg`

> **Note**: You can drag the compiled `TimeDock.app` into your local `Applications/` folder and launch the product exactly as you would any native macOS application! Future deployments may require Apple Developer credentialing for external code-signing and notarization via `electron-builder`.

---

*Crafted for those who value their seconds as much as their results.*
