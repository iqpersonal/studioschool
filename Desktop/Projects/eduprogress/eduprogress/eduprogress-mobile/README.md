# EduProgress Mobile App

Built with **React Native**, **Expo**, and **NativeWind**.

## 🚀 Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npx expo start
    ```
    Scan the QR code with your phone (Expo Go app).

3.  **Build Android APK**:
    ```bash
    cd android
    .\gradlew assembleDebug
    ```
    The APK will be located at: `android/app/build/outputs/apk/debug/app-debug.apk`.

## 🛠️ Project Structure
*   `App.tsx`: Main entry point (Login Screen).
*   `src/services`: Firebase configuration.
*   `src/types.ts`: Shared TypeScript interfaces.
*   `android/`: Native Android project (managed by Expo Prebuild).
