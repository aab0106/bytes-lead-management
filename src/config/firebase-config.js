import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Backup configuration - use this if environment variables fail
export const firebaseConfig = {
  apiKey: "AIzaSyBm92NgCIek-ezcX4NIx9IVlmM3zQmFIw4",
  authDomain: "bytes-crm.firebaseapp.com",
  projectId: "bytes-crm",
  storageBucket: "bytes-crm.firebasestorage.app",
  messagingSenderId: "60039924843",
  appId: "1:60039924843:web:0368b65878a87602f7f52e",
  measurementId: "G-W84MXS1KR6"
};
// as a backup

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;