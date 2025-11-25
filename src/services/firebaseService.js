import { 
  collection, doc, getDocs, getDoc, updateDoc, deleteDoc, 
  query, where, orderBy, addDoc, setDoc, writeBatch, arrayUnion,
  limit, serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';

const COLLECTIONS = {
  LEADS: 'leads',
  USERS: 'users',
  ACTIVITIES: 'activities'
};

export const leadService = {
  // === GET AGENT LEADS (ONLY LEADS ASSIGNED TO CURRENT AGENT) ===
  getAgentLeads: async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      console.log('🔍 Fetching leads for agent:', {
        uid: currentUser.uid,
        email: currentUser.email
      });

      const leadsRef = collection(db, COLLECTIONS.LEADS);
      
      // Query by agent's Firebase Auth UID
      const q = query(leadsRef, where('assignedTo', '==', currentUser.uid));
      
      const querySnapshot = await getDocs(q);
      
      const leads = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`📋 Query Results: Found ${leads.length} leads for agent ${currentUser.email}`);
      
      // Debug: Log each lead's assignment details
      leads.forEach(lead => {
        console.log(`   Lead: ${lead.id}`, {
          assignedTo: lead.assignedTo,
          assignedAgentEmail: lead.assignedAgentEmail,
          status: lead.status,
          fullName: lead.fullName
        });
      });

      // If no leads found, let's check what's actually in the database
      if (leads.length === 0) {
        console.log('⚠️ No leads found with assignedTo:', currentUser.uid);
      }

      // Sort manually on client side
      leads.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA; // Descending order
      });

      return leads;
    } catch (error) {
      console.error('❌ Error fetching agent leads:', error);
      throw error;
    }
  },

  // === CREATE NEW LEAD (For Agents) ===
  createLead: async (leadData) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      const mobileNo = leadData.mobileNo?.toString().trim();
      if (!mobileNo) {
        throw new Error('Mobile number is required');
      }

      console.log('🔍 Checking for duplicate mobile number:', mobileNo);

      // Check for duplicate mobile number
      const leadsRef = collection(db, COLLECTIONS.LEADS);
      const duplicateQuery = query(leadsRef, where('mobileNo', '==', mobileNo));
      const duplicateSnapshot = await getDocs(duplicateQuery);
      
      if (!duplicateSnapshot.empty) {
        const existingLead = duplicateSnapshot.docs[0].data();
        throw new Error(`Mobile number ${mobileNo} already exists for lead: ${existingLead.fullName}`);
      }

      // Create new lead
      const leadRef = doc(collection(db, COLLECTIONS.LEADS));
      const leadWithMetadata = {
        ...leadData,
        mobileNo: mobileNo,
        status: 'New',
        assignedTo: currentUser.uid,
        assignedToName: currentUser.displayName || currentUser.email?.split('@')[0],
        assignedAgentEmail: currentUser.email,
        assignedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        followUps: []
      };

      await setDoc(leadRef, leadWithMetadata);

      console.log('✅ Lead created successfully:', leadData.fullName);

      return {
        success: true,
        message: 'Lead created successfully',
        lead: { id: leadRef.id, ...leadWithMetadata }
      };
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  },

  // === CHECK DUPLICATE MOBILE NUMBER ===
  checkDuplicateMobile: async (mobileNo) => {
    try {
      const mobileNoClean = mobileNo?.toString().trim();
      if (!mobileNoClean) {
        return { isDuplicate: false, existingLead: null };
      }

      const leadsRef = collection(db, COLLECTIONS.LEADS);
      const duplicateQuery = query(leadsRef, where('mobileNo', '==', mobileNoClean));
      const duplicateSnapshot = await getDocs(duplicateQuery);
      
      if (duplicateSnapshot.empty) {
        return { isDuplicate: false, existingLead: null };
      }

      const existingLead = {
        id: duplicateSnapshot.docs[0].id,
        ...duplicateSnapshot.docs[0].data()
      };

      return {
        isDuplicate: true,
        existingLead: existingLead
      };
    } catch (error) {
      console.error('Error checking duplicate mobile:', error);
      throw error;
    }
  },

  // === UPDATE LEAD STATUS ===
  updateLeadStatus: async (leadId, status) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      const leadRef = doc(db, COLLECTIONS.LEADS, leadId);
      await updateDoc(leadRef, {
        status: status,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser.uid
      });

      return { success: true, message: 'Status updated successfully' };
    } catch (error) {
      console.error('Error updating lead status:', error);
      throw error;
    }
  },

  // === ADD FOLLOW-UP ===
  addFollowUp: async (leadId, followUpData) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      const leadRef = doc(db, COLLECTIONS.LEADS, leadId);
      await updateDoc(leadRef, {
        followUps: arrayUnion({
          ...followUpData,
          id: Date.now().toString(),
          createdBy: currentUser.uid,
          createdAt: serverTimestamp()
        }),
        updatedAt: serverTimestamp()
      });

      return { success: true, message: 'Follow-up added successfully' };
    } catch (error) {
      console.error('Error adding follow-up:', error);
      throw error;
    }
  },

  // === UPDATE FOLLOW-UP STATUS ===
  updateFollowUpStatus: async (leadId, followUpId, status) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      const leadRef = doc(db, COLLECTIONS.LEADS, leadId);
      const leadDoc = await getDoc(leadRef);
      
      if (!leadDoc.exists()) {
        throw new Error('Lead not found');
      }

      const leadData = leadDoc.data();
      const updatedFollowUps = leadData.followUps?.map(fup => 
        fup.id === followUpId ? { ...fup, status, updatedAt: serverTimestamp() } : fup
      ) || [];

      await updateDoc(leadRef, {
        followUps: updatedFollowUps,
        updatedAt: serverTimestamp()
      });

      return { success: true, message: 'Follow-up status updated successfully' };
    } catch (error) {
      console.error('Error updating follow-up status:', error);
      throw error;
    }
  }
};

export default leadService;