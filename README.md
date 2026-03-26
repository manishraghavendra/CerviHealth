# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.


## Cervical Classification Integration

This app is integrated with a lightweight Python API that runs cervical image classification.

Use two terminals. 

### 1) Start the classifier API

```bash
cd ml_api
pip install -r requirements.txt
python app.py
```

API runs oN `localhost:5000` by default.

### 2) Configure Expo app

Set this environment variable before starting the app:

```bash
EXPO_PUBLIC_CLASSIFIER_API_URL=http://<your-machine-ip>:5000
```

Use your machine IP (LAN) (not `localhost`) when testing on a physical phone.

