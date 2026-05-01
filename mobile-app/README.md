# BigCat Marketplace Mobile (Expo)

This folder contains the Expo mobile starter for the marketplace.

## 1) Configure API URL

Create `.env` inside this folder:

```bash
cp .env.example .env
```

Set the backend URL:

```bash
EXPO_PUBLIC_API_BASE_URL=https://v0-big-cat-marketplace.vercel.app
```

If you run your backend locally, use your machine LAN IP instead of `localhost`, for example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:3000
```

## 2) Run the app

```bash
npm install
npm run start
```

Then:

- Press `a` for Android emulator.
- Press `i` for iOS simulator (macOS only).
- Scan QR with Expo Go on your phone.

## 3) Current scope

- Loads products from `GET /api/products`.
- Displays product image, name, merchant, and price.
- Supports pull-to-refresh and client-side quick search.

## 4) Next build steps

- Add authentication screens.
- Add product details page.
- Add cart and checkout flow.
- Add buyer orders and merchant dashboard views.

## 5) Build with Expo.dev (EAS)

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
```

For production builds:

```bash
npx eas-cli build --platform all --profile production
```
