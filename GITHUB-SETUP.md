# Fleet Apex — GitHub Actions Build Setup
## Get your APKs + Desktop apps built automatically in the cloud

---

## STEP 1 — Create a free GitHub account (if you don't have one)
Go to https://github.com and sign up. It's free.

---

## STEP 2 — Create a new repository

1. Click the **+** button (top right) → **New repository**
2. Name it: `fleet-apex` (or anything you like)
3. Set it to **Private** (recommended — keeps your code yours)
4. Leave everything else as default
5. Click **Create repository**

---

## STEP 3 — Upload your files

### Option A — Drag and drop (easiest, no terminal needed)
1. On your new empty repo page, click **uploading an existing file**
2. Unzip `fleet-apex-run4.zip` on your computer
3. Open the `fleet-apex-flat` folder
4. Select ALL files inside (Ctrl+A / Cmd+A) and drag them into the browser
5. Scroll down → click **Commit changes**

### Option B — Git command line
```bash
cd fleet-apex-flat
git init
git remote add origin https://github.com/YOUR-USERNAME/fleet-apex.git
git add .
git commit -m "Fleet Apex — initial build"
git push -u origin main
```

---

## STEP 4 — Watch your apps build

1. Go to your repo → click the **Actions** tab
2. You'll see 3 workflows starting:
   - `Build Fleet Apex Driver APK`
   - `Build Fleet Apex Admin APK`
   - `Build Fleet Apex Desktop Apps`
3. Each one takes **10–20 minutes**
4. When they show a green ✅, click the workflow name

---

## STEP 5 — Download your APKs

1. Click a completed workflow run
2. Scroll to the bottom — you'll see **Artifacts**
3. Click to download:
   - `fleet-apex-driver-debug-apk` → install on driver phones
   - `fleet-apex-admin-debug-apk`  → install on manager phones/tablets
   - `fleet-apex-windows-installer` → Windows .msi installer
   - `fleet-apex-linux-deb`        → Linux .deb package
   - `fleet-apex-linux-appimage`   → Linux portable app

---

## STEP 6 — Install the APK on Android

1. Download the APK zip → extract the .apk file
2. Send it to your Android phone (email, WhatsApp, Google Drive — anything)
3. Open the file on your phone
4. If prompted: **Settings → Install unknown apps → Allow**
5. Tap Install

> ⚠️ The debug APK is for your own use. For Google Play Store distribution,
> see the "Signing for release" section below.

---

## AUTOMATIC REBUILDS

Every time you push a change to `install.html`, GitHub automatically
rebuilds all apps. No manual steps needed.

---

## SIGNING FOR RELEASE (optional — needed for Google Play Store)

### Create a keystore (do this once, keep it safe!)
```bash
keytool -genkey -v \
  -keystore fleet-apex-release.jks \
  -alias fleet-apex \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=Fleet Apex, OU=Mobile, O=Your Company, L=London, ST=England, C=GB"
```

### Add secrets to GitHub
1. Go to your repo → **Settings** → **Secrets and variables** → **Actions**
2. Add these 4 secrets:

| Secret name        | Value |
|--------------------|-------|
| `KEYSTORE_BASE64`  | Run: `base64 -i fleet-apex-release.jks` and paste the output |
| `KEY_ALIAS`        | `fleet-apex` |
| `KEYSTORE_PASSWORD`| Your store password |
| `KEY_PASSWORD`     | Your key password |

Once added, every build will also produce a **signed release APK** ready for the Play Store.

---

## iOS (requires Mac + Apple Developer account — $99/year)

iOS can only be built on macOS with Xcode. GitHub Actions supports this
(use `macos-latest` runner). A workflow is in `.github/workflows/build-desktop.yml`
under the `build-macos` job — this builds the macOS DMG.

For iOS IPA specifically, you need:
- Apple Developer account ($99/year at developer.apple.com)
- A distribution certificate + provisioning profile
- Add them as GitHub secrets and use the `ios-deploy` action

This is the one platform that genuinely cannot be automated without
an Apple Developer account.
