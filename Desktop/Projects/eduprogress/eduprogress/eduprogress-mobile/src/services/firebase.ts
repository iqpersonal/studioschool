import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Your web app's Firebase configuration
// Reusing the same config as the web app
export const firebaseConfig = {
    apiKey: "AIzaSyAKLEzDtrAL16PD_0nzMgQSVOKK0QRts2E",
    authDomain: "eduprogress-app.firebaseapp.com",
    projectId: "eduprogress-app",
    storageBucket: "eduprogress-app.firebasestorage.app",
    messagingSenderId: "1024430182861",
    appId: "1:1024430182861:web:22ff761d5196a698f1f484"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Use React Native specific adapters if needed in future, but JS SDK works for Expo Go
// We might need AsyncStorage for auth persistence later, but standard init is fine for now.

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export { auth, db, storage, functions, app };
