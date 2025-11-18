import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  getIdTokenResult
} from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userClaims, setUserClaims] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Login function with Firestore block check
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 🔍 Check agent Firestore profile
      const agentRef = doc(db, "agents", user.uid);
      const agentSnap = await getDoc(agentRef);

      if (agentSnap.exists()) {
        const agentData = agentSnap.data();
        if (agentData.blocked === true || agentData.status === "blocked") {
          console.warn("Blocked user tried login:", email);
          await signOut(auth);
          throw new Error("Your account has been blocked. Please contact admin.");
        }
      }

      // Refresh token only if not blocked
      await user.getIdToken(true);
      return userCredential;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = () => signOut(auth);

  const isAdmin = () => {
    if (currentUser?.email === 'awaisbodla.ab21@gmail.com') {
      return true;
    }
    return userClaims?.admin === true;
  };

  // ✅ Enforce block status on auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          console.log("User detected:", user.email);

          const agentRef = doc(db, "agents", user.uid);
          const agentSnap = await getDoc(agentRef);

          if (agentSnap.exists()) {
            const agentData = agentSnap.data();
            if (agentData.blocked === true || agentData.status === "blocked") {
              console.warn("Blocked user detected on state change, signing out:", user.email);
              await signOut(auth);
              setCurrentUser(null);
              setUserClaims(null);
              setLoading(false);
              return;
            }
          }

          // Refresh claims if not blocked
          const token = await user.getIdToken(true);
          const idTokenResult = await getIdTokenResult(user);

          setUserClaims(idTokenResult.claims);
          setCurrentUser(user);
        } catch (error) {
          console.error("Error in auth state change:", error);
        }
      } else {
        setCurrentUser(null);
        setUserClaims(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userClaims,
    login,
    logout,
    isAdmin,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
