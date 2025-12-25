# Deployment Guide - Phase 1 Security Hardening

## Prerequisites
- Firebase CLI installed (`npm install -g firebase-tools`)
- Logged in to Firebase (`firebase login`)
- Firebase project initialized in this directory

## Step 1: Install Cloud Functions Dependencies
```bash
cd functions
npm install
cd ..
```

## Step 2: Deploy Firestore Security Rules
```bash
firebase deploy --only firestore:rules
```

This will apply the new role-based access control rules to your Firestore database.

## Step 3: Set the AI Provider API Key as a Secret
```bash
firebase functions:secrets:set AI_PROVIDER_KEY
```

When prompted, enter your actual AI provider API key. This will be stored securely and only accessible by Cloud Functions.

## Step 4: Deploy Cloud Functions
```bash
firebase deploy --only functions
```

This will deploy the `generateAIContent` function to your Firebase project.

## Step 5: Verify the Changes
1. Open your application at `https://myrifaya.com/`
2. Navigate to Settings → Security & API Keys
3. Verify that the API key input field is no longer visible
4. Confirm that the message about backend-managed keys is displayed

## Important Notes

> **Warning**: After deploying the security rules, ensure your user account has the `super-admin` role in the `users` collection. Otherwise, you may lose access to certain features.

> **Note**: The Cloud Function `generateAIContent` is currently a placeholder. You'll need to implement the actual AI provider integration based on your specific requirements.

## Rollback Instructions
If you need to rollback the security rules:
1. Edit `firestore.rules` to temporarily allow broader access
2. Run `firebase deploy --only firestore:rules`

## Next Steps
- Implement the actual AI provider logic in `functions/src/index.ts`
- Test the Cloud Function using the Firebase Console or emulator
- Monitor function logs: `firebase functions:log`

## Step 6: Deploy Web Application & Custom Domain

### 1. Build the Application
Create the production build of your React application:
```bash
npm run build
```

### 2. Deploy to Firebase Hosting
Deploy the built assets to Firebase:
```bash
firebase deploy --only hosting
```

### 3. Configure Custom Domain
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. Navigate to **Hosting** in the sidebar.
4. Click **Add Custom Domain**.
5. Enter your domain (e.g., `www.yourschool.com`).
6. Follow the verification steps (usually adding a TXT record to your DNS provider).
7. Once verified, Firebase will provide `A` records to add to your DNS provider to point your domain to the app.

