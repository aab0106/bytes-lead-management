import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - USE YOUR ACTUAL VALUES

const firebaseConfig = {
  apiKey: "AIzaSyBm92NgCIek-ezcX4NIx9IVlmM3zQmFIw4",
  authDomain: "bytes-crm.firebaseapp.com",
  projectId: "bytes-crm",
  storageBucket: "bytes-crm.firebasestorage.app",
  messagingSenderId: "60039924843",
  appId: "1:60039924843:web:0368b65878a87602f7f52e",
  measurementId: "G-W84MXS1KR6"
};
// Validate configuration
console.log('🔧 Initializing Firebase with project:', firebaseConfig.projectId);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);

console.log('✅ Firebase initialized successfully');

export { app, auth, db };