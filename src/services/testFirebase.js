import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Timestamp } from 'firebase/firestore';

export const testService = {
  // Test Firestore connection
  testFirestoreConnection: async () => {
    try {
      console.log('🧪 Testing Firestore connection...');
      
      // Test 1: Check if we can access leads collection
      const leadsSnapshot = await getDocs(collection(db, 'leads'));
      console.log('✅ Leads collection accessible. Documents:', leadsSnapshot.size);
      
      // Test 2: Try to add a test document
      if (leadsSnapshot.size === 0) {
        const testDoc = {
          firstName: 'Test',
          lastName: 'Lead',
          email: 'test@test.com',
          phone: '123-456-7890',
          status: 'New',
          assignedAgentId: auth.currentUser?.uid || 'test-agent',
          assignedAgentEmail: auth.currentUser?.email || 'test@agent.com',
          createdAt: Timestamp.now(),
          notes: 'This is a test lead created during connection test'
        };
        
        const docRef = await addDoc(collection(db, 'leads'), testDoc);
        console.log('✅ Test document created with ID:', docRef.id);
      }
      
      return { success: true, message: 'Firestore connection successful' };
    } catch (error) {
      console.error('❌ Firestore test failed:', error);
      return { success: false, message: error.message };
    }
  },

  // Test agents collection
  testAgentsConnection: async () => {
    try {
      console.log('🧪 Testing Agents collection...');
      const agentsSnapshot = await getDocs(collection(db, 'agents'));
      console.log('✅ Agents collection accessible. Documents:', agentsSnapshot.size);
      return { success: true, count: agentsSnapshot.size };
    } catch (error) {
      console.error('❌ Agents test failed:', error);
      return { success: false, message: error.message };
    }
  }
};