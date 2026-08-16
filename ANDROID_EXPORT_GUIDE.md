# How to Build the Android APK / App (.apk)

This guide walks you through turning this project into an installable Android APK.

---

## Prerequisites on your Computer
1. **Node.js (v18 or v20+)**: Download from [nodejs.org](https://nodejs.org)
2. **Android Studio**: Download from [developer.android.com/studio](https://developer.android.com/studio)

---

## Step 1: Export Your Project
1. In Google AI Studio, open the top menu and select **Export to GitHub** or **Download as ZIP**.
2. Extract the files on your computer.

---

## Step 2: Install Mobile & App Dependencies
Open your computer's terminal (or Command Prompt / PowerShell) inside the extracted project folder and run:

```bash
# 1. Install standard dependencies
npm install

# 2. Install Capacitor (Android Native Bridge)
npm install @capacitor/core @capacitor/android
npm install --save-dev @capacitor/cli
```

---

## Step 3: Build & Generate the Android Native Project
Run the following commands in order:

```bash
# 1. Build your production web app
npm run build

# 2. Add the Android platform
npx cap add android

# 3. Copy web assets into Android project
npx cap copy
```

---

## Step 4: Build the APK in Android Studio

1. Open Android Studio with:
   ```bash
   npx cap open android
   ```
2. Wait for Android Studio to index and run Gradle sync (1–2 minutes on first run).
3. In the top Android Studio menu bar, click:
   **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
4. When finished, a notification popup will appear in the bottom-right corner saying **"APK(s) generated successfully"**.
5. Click **locate** to open the folder containing `app-debug.apk`.

---

## Step 5: Install on your Android Device
- Copy `app-debug.apk` to your phone via USB, Google Drive, or WhatsApp.
- Tap the `.apk` on your phone and choose **Install**.
- Your Socrates AI Tutor app is now installed as a full standalone Android application!
