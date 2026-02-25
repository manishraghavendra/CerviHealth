import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6jyU6KzwLqCB3n29NUEI-psU-3L9xYAE",
  authDomain: "cervihealth-c67d0.firebaseapp.com",
  projectId: "cervihealth-c67d0",
  storageBucket: "cervihealth-c67d0.firebasestorage.app",
  messagingSenderId: "820997956223",
  appId: "1:820997956223:web:f2c478bfe8110a6927554a",
  measurementId: "G-DD14BYCQN4"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
const auth = getAuth(app);

const firestore = getFirestore(app);
const storage = getStorage(app);

export { app, auth, firestore, storage };

