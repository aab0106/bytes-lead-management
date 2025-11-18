import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  arrayUnion,
  Timestamp,
  serverTimestamp // Add this import
} from 'firebase/firestore';
import { db, auth } from './firebase';

const COLLECTIONS = {
  LEADS: 'leads',
  AGENTS: 'agents'
};

export const leadService = {
  // Get leads for current agent with proper error handling
  getAgentLeads: async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      console.log('🔍 Fetching leads for agent:', user.email);
      
      // Try the optimized query first
      try {
        const q = query(
          collection(db, COLLECTIONS.LEADS),
          where('assignedAgentId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const leads = [];
        querySnapshot.forEach((doc) => {
          leads.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`✅ Found ${leads.length} leads for agent`);
        return leads;
      } catch (queryError) {
        // Fallback: If query fails (index issues), get all and filter client-side
        console.log('🔄 Using client-side filtering as fallback...');
        const allLeadsSnapshot = await getDocs(collection(db, COLLECTIONS.LEADS));
        const filteredLeads = [];
        allLeadsSnapshot.forEach((doc) => {
          const lead = doc.data();
          if (lead.assignedAgentId === user.uid) {
            filteredLeads.push({ id: doc.id, ...lead });
          }
        });
        // Sort manually
        filteredLeads.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return b.createdAt.seconds - a.createdAt.seconds;
          }
          return 0;
        });
        return filteredLeads;
      }
    } catch (error) {
      console.error('❌ Error getting agent leads:', error);
      throw new Error('Failed to load leads: ' + error.message);
    }
  },

  // Get single lead by ID with permission check for agents
  getLeadById: async (leadId) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      console.log('🔍 Fetching lead:', leadId, 'for user:', user.email);
      
      const docRef = doc(db, COLLECTIONS.LEADS, leadId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const leadData = docSnap.data();
        
        // Check if the current user has permission to view this lead
        if (leadData.assignedAgentId !== user.uid) {
          throw new Error('Access denied: You do not have permission to view this lead');
        }
        
        console.log('✅ Lead found and access granted');
        return { id: docSnap.id, ...leadData };
      } else {
        throw new Error('Lead not found');
      }
    } catch (error) {
      console.error('❌ Error getting lead:', error);
      throw new Error('Failed to load lead: ' + error.message);
    }
  },

  // Update lead status with permission check
  updateLeadStatus: async (leadId, newStatus) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      // First verify the user owns this lead
      const lead = await leadService.getLeadById(leadId);
      
      const leadRef = doc(db, COLLECTIONS.LEADS, leadId);
      await updateDoc(leadRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      
      return { success: true, message: 'Status updated successfully' };
    } catch (error) {
      console.error('❌ Error updating lead status:', error);
      throw new Error('Failed to update status: ' + error.message);
    }
  },

  // Add follow-up with permission check
  addFollowUp: async (leadId, followUpData) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      // First verify the user owns this lead
      const lead = await leadService.getLeadById(leadId);
      
      const leadRef = doc(db, COLLECTIONS.LEADS, leadId);
      const followUp = {
        ...followUpData,
        date: Timestamp.fromDate(new Date(followUpData.date)),
        createdAt: Timestamp.now(),
        id: Date.now()
      };

      await updateDoc(leadRef, {
        followUps: arrayUnion(followUp),
        updatedAt: Timestamp.now()
      });
      
      return { success: true, message: 'Follow-up added successfully' };
    } catch (error) {
      console.error('❌ Error adding follow-up:', error);
      throw new Error('Failed to add follow-up: ' + error.message);
    }
  },

  // Create new lead - Updated to use serverTimestamp
  createLead: async (leadData) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const leadWithMetadata = {
        ...leadData,
        assignedAgentId: user.uid,
        assignedAgentEmail: user.email,
        assignedAgentName: user.displayName || user.email,
        createdAt: serverTimestamp(), // Use serverTimestamp instead of Timestamp.now()
        updatedAt: serverTimestamp(),
        status: leadData.status || 'New',
        followUps: []
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.LEADS), leadWithMetadata);
      console.log('✅ Lead created successfully:', docRef.id);
      return { id: docRef.id, ...leadWithMetadata };
    } catch (error) {
      console.error('❌ Error creating lead:', error);
      throw new Error('Failed to create lead: ' + error.message);
    }
  },

  // Import multiple leads
  importLeads: async (leadsArray) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const results = {
        success: 0,
        errors: 0,
        errorMessages: []
      };

      // Import leads one by one
      for (const leadData of leadsArray) {
        try {
          const leadWithMetadata = {
            ...leadData,
            assignedAgentId: user.uid,
            assignedAgentEmail: user.email,
            assignedAgentName: user.displayName || user.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            status: leadData.status || 'New',
            followUps: []
          };

          await addDoc(collection(db, COLLECTIONS.LEADS), leadWithMetadata);
          results.success++;
        } catch (error) {
          results.errors++;
          results.errorMessages.push(`Error importing lead ${leadData.email}: ${error.message}`);
        }
      }

      console.log(`✅ Imported ${results.success} leads successfully, ${results.errors} failed`);
      return results;
    } catch (error) {
      console.error('❌ Error importing leads:', error);
      throw new Error('Failed to import leads: ' + error.message);
    }
  },

  // Get leads count for dashboard
  getLeadsCount: async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const q = query(
        collection(db, COLLECTIONS.LEADS),
        where('assignedAgentId', '==', user.uid)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('❌ Error getting leads count:', error);
      return 0;
    }
  },

  getLeadsByMobileNumber: async (mobileNo) => {
    try {
      const q = query(
        collection(db, 'leads'),
        where('mobileNo', '==', mobileNo)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting leads by mobile number:', error);
      throw error;
    }
  }
};