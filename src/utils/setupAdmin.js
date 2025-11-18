// Utility function to help set up the first admin user
// Run this in browser console after creating your first user

export const setupFirstAdmin = async (userEmail) => {
  // This is a helper function - in production, you'd use Firebase Admin SDK
  console.log(`
  
  🚀 ADMIN SETUP INSTRUCTIONS:
  
  1. Go to Firebase Console: https://console.firebase.google.com/
  2. Select your project
  3. Go to Authentication → Users
  4. Note the UID of the user you want to make admin (${userEmail})
  5. You have two options:
  
  OPTION A: Use Firebase Admin SDK (Recommended):
  - Create a Cloud Function to set custom claims
  - Or use Firebase Admin SDK in a secure environment
  
  OPTION B: Temporary Testing:
  - In AuthContext.js, temporarily hardcode admin access:
    
    const isAdmin = () => {
      if (currentUser?.email === '${userEmail}') {
        return true;
      }
      return userClaims?.admin === true;
    };
  
  6. Remove the hardcoded email after setting up proper admin claims.
  
  `);
};

// Temporary function for development
export const makeUserAdmin = (userEmail) => {
  console.warn('This is for development only! Implement proper admin setup for production.');
  
  // This would be replaced with actual Firebase Admin SDK call
  localStorage.setItem('temp_admin_user', userEmail);
  console.log(`Temporary admin access granted to: ${userEmail}`);
  console.log('Refresh the page and login again.');
};