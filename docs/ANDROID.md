# Android-app (Capacitor)

**Status: project en workflow gebouwd, nog nooit gebouwd tot APK.** De ontwikkelomgeving heeft geen Android SDK; de eerste echte build gebeurt in GitHub Actions.

De app is een **Capacitor**-schil (`work.craftstudio.newszoom`) die https://newszoom.craftstudio.work laadt (`server.url` in `capacitor.config.ts`). Alles wat je deployt, staat dus meteen ook in de app. Een nieuwe APK is alleen nodig als de schil verandert: naam, icoon, Capacitor-versie of een native plugin. Is de site niet bereikbaar, dan toont de app `capacitor-web/index.html`.

## APK bouwen

GitHub → Actions → **Android-app (APK)** → Run workflow. De APK staat daarna als artifact `newszoom-apk` bij de run. De workflow start nooit vanzelf (Actions-minuten); een build kost naar schatting 6–10 minuten.

Zonder sleutel-secrets bouwt de workflow een **debug-testversie**. Die werkt, maar elke build heeft een andere sleutel: verwijder de oude app voordat je een nieuwe testversie installeert.

## Eenmalig: eigen sleutel

Op je eigen computer (Java nodig):

```bash
keytool -genkeypair -v -keystore newszoom.keystore -alias newszoom -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=NewsZoom"
```

Gebruik een sterk wachtwoord en bewaar keystore en wachtwoord in je wachtwoordmanager. Met een andere sleutel kun je de geïnstalleerde app niet bijwerken.

Zet in GitHub (Settings → Secrets and variables → Actions → New repository secret):

- `ANDROID_KEYSTORE_BASE64`: de uitvoer van `base64 -i newszoom.keystore` (macOS) of `base64 -w0 newszoom.keystore` (Linux)
- `ANDROID_KEYSTORE_PASSWORD`: het wachtwoord

Of met de GitHub CLI:

```bash
base64 -i newszoom.keystore | gh secret set ANDROID_KEYSTORE_BASE64 --repo works0nmymachine/NewsZoom
```

```bash
gh secret set ANDROID_KEYSTORE_PASSWORD --repo works0nmymachine/NewsZoom
```

## Installeren

Download het artifact, pak de `.apk` uit en open hem op je telefoon (installeren uit deze bron toestaan).

## Lokaal werken aan de schil

Android Studio en JDK 21 nodig.

```bash
npm install
npx cap sync android
npx cap open android
```

## Later

- **iPhone:** `npx cap add ios` op een Mac met Xcode, plus een Apple Developer-account. Apple keurt een app die alleen een website toont soms af; dan is een native extra nodig (bijvoorbeeld meldingen of een widget).
- **Native meldingen of widget:** via Capacitor-plugins; de webapp levert de data via `/api/...`-routes.
