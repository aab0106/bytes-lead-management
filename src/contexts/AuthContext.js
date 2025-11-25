import React, { useContext, useState, useEffect } from 'react';
import { 
  auth
} from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // Simple role detection - no complex Firestore operations
  const determineUserRole = (user) => {
    if (!user || !user.email) return 'agent';
    
    // Direct email check - most reliable
    const adminEmails = ['awaisbodla.ab21@gmail.com'];
    if (adminEmails.includes(user.email.toLowerCase())) {
      return 'admin';
    }
    
    return 'agent';
  };

  // Enhanced login function
  async function login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Set role immediately based on email
      const role = determineUserRole(user);
      setUserRole(role);
      console.log(`User logged in: ${user.email}, Role: ${role}`);
      
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    setUserRole(null);
    return signOut(auth);
  }

  function isAdmin() {
    return userRole === 'admin';
  }

  function isAgent() {
    return userRole === 'agent';
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Set role immediately based on email
        const role = determineUserRole(user);
        setUserRole(role);
        console.log(`Auth state changed: ${user.email}, Role: ${role}`);
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    login,
    signup,
    logout,
    isAdmin,
    isAgent
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}