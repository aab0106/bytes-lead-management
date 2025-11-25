import { 
  collection, doc, getDocs, getDoc, updateDoc, deleteDoc, 
  query, where, orderBy, addDoc, writeBatch, arrayUnion,
  limit, serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';

const COLLECTIONS = {
  LEADS: 'leads',
  USERS: 'users',
  ACTIVITIES: 'activities'
};

export const adminService = {
  // === GET ALL LEADS ===
  getAllLeads: async () => {
    try {
      const leadsRef = collection(db, COLLECTIONS.LEADS);
      const q = query(leadsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching all leads:', error);
      throw error;
    }
  },

  // === GET ALL AGENTS (INCLUDING FIREBASE AUTH USERS) ===
  getAllAgents: async () => {
    try {
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('role', 'in', ['agent', 'manager', 'executive']));
      const querySnapshot = await getDocs(q);
      
      const agents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('📋 Found agents from Firestore:', agents.length);
      
      return agents;
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
  },

  // === DASHBOARD ANALYTICS ===
  getDashboardAnalytics: async () => {
    try {
      const leads = await adminService.getAllLeads();
      const agents = await adminService.getAllAgents();
      
      const totalLeads = leads.length;
      const assignedLeads = leads.filter(lead => lead.assignedTo).length;
      const wonLeads = leads.filter(lead => lead.status === 'Closed').length;
      const lostLeads = leads.filter(lead => lead.status === 'Lost').length;
      
      const leadsByStatus = leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {});

      const followupsStats = {
        total: leads.reduce((sum, lead) => sum + (lead.followUps?.length || 0), 0),
        upcoming: leads.reduce((sum, lead) => {
          if (!lead.followUps) return sum;
          const upcoming = lead.followUps.filter(fup => {
            const date = fup.date?.toDate ? fup.date.toDate() : new Date(fup.date);
            return date >= new Date();
          });
          return sum + upcoming.length;
        }, 0),
        completed: leads.reduce((sum, lead) => {
          if (!lead.followUps) return sum;
          return sum + lead.followUps.filter(fup => fup.status === 'completed').length;
        }, 0)
      };

      // Get recent activities for user activities card
      const recentActivities = await adminService.getActivityLog(5);

      return {
        totalLeads,
        assignedLeads,
        wonLeads,
        lostLeads,
        totalAgents: agents.length,
        leadsByStatus,
        followupsStats,
        recentActivities
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  },

  // === GET LEAD BY ID ===
  getLeadById: async (leadId) => {
    try {
      const docRef = doc(db, COLLECTIONS.LEADS, leadId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { 
          id: docSnap.id, 
          ...docSnap.data()
        };
      } else {
        throw new Error('Lead not found');
      }
    } catch (error) {
      console.error('Error getting lead:', error);
      throw new Error('Failed to load lead: ' + error.message);
    }
  },

  // === UPDATE LEAD STATUS ===
  updateLeadStatus: async (leadId, status, adminId) => {
    try {
      const leadRef = doc(db, COLLECTIONS.LEADS, leadId);
      await updateDoc(leadRef, {
        status: status,
        updatedAt: serverTimestamp()
      });

      await adminService.logActivity({
        action: 'status_updated',
        userId: adminId,
        targetId: leadId,
        details: `Status changed to ${status}`,
        timestamp: new Date()
      });

      return { success: true, message: 'Status updated successfully' };
    } catch (error) {
      console.error('Error updating lead status:', error);
      throw error;
    }
  },

  // === DELETE LEAD ===
  deleteLead: async (leadId, adminId) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.LEADS, leadId));
      
      await adminService.logActivity({
        action: 'lead_deleted',
        userId: adminId,
        targetId: leadId,
        details: 'Lead deleted from system',
        timestamp: new Date()
      });

      return { success: true, message: 'Lead deleted successfully' };
    } catch (error) {
      console.error('Error deleting lead:', error);
      throw new Error('Failed to delete lead: ' + error.message);
    }
  },

  // === CREATE AGENT WITH FIREBASE AUTH CHECK ===
  createAgent: async (agentData, adminId) => {
    try {
      console.log('👤 Creating new agent:', agentData.email);

      const currentAdmin = auth.currentUser;
      if (!currentAdmin) {
        throw new Error('No admin user logged in');
      }

      // Check if user already exists in Firestore
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('email', '==', agentData.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        throw new Error('Email address is already in use by another account.');
      }

      // Use REST API to create user
      const createUserUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${process.env.REACT_APP_FIREBASE_API_KEY}`;

      const userResponse = await fetch(createUserUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: agentData.email,
          password: agentData.password,
          returnSecureToken: true,
        }),
      });

      const userData = await userResponse.json();

      if (!userResponse.ok) {
        throw new Error(userData.error.message || 'Failed to create user');
      }

      const newAgentUid = userData.localId;

      // Create agent profile in Firestore - FIXED: Always set role to 'agent'
      const agentProfile = {
        uid: newAgentUid,
        email: agentData.email,
        firstName: agentData.firstName,
        lastName: agentData.lastName,
        phone: agentData.phone,
        role: 'agent', // FIXED: Always set to 'agent', never 'admin'
        team: '',
        permissions: ['leads_view', 'leads_edit', 'followups_manage'],
        isActive: true,
        createdAt: serverTimestamp(),
        createdBy: currentAdmin.uid,
        createdByEmail: currentAdmin.email,
        authProvider: 'firebase'
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.USERS), agentProfile);

      await adminService.logActivity({
        action: 'agent_created',
        userId: adminId,
        targetId: docRef.id,
        details: `Created agent ${agentData.email} with role: agent`,
        timestamp: new Date()
      });

      return {
        success: true,
        message: 'Agent created successfully',
        agent: { id: docRef.id, ...agentProfile }
      };

    } catch (error) {
      console.error('❌ Error creating agent:', error);
      
      // Handle specific error cases
      if (error.message.includes('EMAIL_EXISTS')) {
        throw new Error('Email address is already in use by another account.');
      }
      if (error.message.includes('WEAK_PASSWORD')) {
        throw new Error('Password should be at least 6 characters.');
      }

      throw new Error(`Failed to create agent: ${error.message}`);
    }
  },

  // === DELETE AGENT COMPLETELY ===
  deleteAgent: async (agentId, adminId) => {
    try {
      // First, unassign all leads from this agent
      const leadsRef = collection(db, COLLECTIONS.LEADS);
      const q = query(leadsRef, where('assignedTo', '==', agentId));
      const querySnapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          assignedTo: null,
          assignedToName: null,
          assignedAgentEmail: null,
          status: 'Unassigned'
        });
      });

      // Get agent data before deletion
      const agentRef = doc(db, COLLECTIONS.USERS, agentId);
      const agentDoc = await getDoc(agentRef);
      const agentData = agentDoc.data();

      // Mark agent as deleted instead of actually deleting
      batch.update(agentRef, {
        deleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: adminId,
        isActive: false
      });

      await batch.commit();

      await adminService.logActivity({
        action: 'agent_deleted',
        userId: adminId,
        targetId: agentId,
        details: `Agent ${agentData.email} marked as deleted`,
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw error;
    }
  },

 // === BULK ASSIGN LEADS ===
bulkAssignLeads: async (leadIds, agentId, agentEmail, adminId) => {
  try {
    const batch = writeBatch(db);
    
    // Get agent details for assignment
    const agentDoc = await getDoc(doc(db, COLLECTIONS.USERS, agentId));
    const agentData = agentDoc.data();
    
    console.log(`🔄 Starting bulk assignment:`, {
      leadCount: leadIds.length,
      agentId: agentId,
      agentUID: agentData.uid, // This is the Firebase Auth UID
      agentEmail: agentEmail,
    });

    let assignedCount = 0;
    let errorCount = 0;
    
    // Process each lead individually
    for (const leadId of leadIds) {
      try {
        const leadRef = doc(db, COLLECTIONS.LEADS, leadId);
        
        // Verify lead exists first
        const leadDoc = await getDoc(leadRef);
        if (!leadDoc.exists()) {
          console.log(`⚠️ Lead ${leadId} does not exist, skipping`);
          errorCount++;
          continue;
        }

        const currentLeadData = leadDoc.data();
        console.log(`📝 Assigning lead ${leadId}:`, {
          currentAssignment: currentLeadData.assignedTo,
          newAssignment: agentData.uid, // Use Firebase Auth UID
          leadName: currentLeadData.fullName
        });

        // FIXED: Use agentData.uid (Firebase Auth UID) instead of agentId (Firestore document ID)
        batch.update(leadRef, {
          assignedTo: agentData.uid, // This should be the Firebase Auth UID
          assignedToName: `${agentData.firstName} ${agentData.lastName}`,
          assignedAgentEmail: agentEmail,
          assignedAt: serverTimestamp(),
          assignedBy: adminId,
          status: 'New',
          previousAssignment: currentLeadData.assignedTo ? {
            assignedTo: currentLeadData.assignedTo,
            assignedAgentEmail: currentLeadData.assignedAgentEmail,
            reassignedAt: serverTimestamp()
          } : null
        });
        assignedCount++;
        
      } catch (leadError) {
        console.error(`❌ Error processing lead ${leadId}:`, leadError);
        errorCount++;
      }
    }

    console.log(`💾 Committing batch: ${assignedCount} leads to update`);
    await batch.commit();

    console.log(`✅ Bulk assignment completed:`, {
      successful: assignedCount,
      failed: errorCount,
      total: leadIds.length
    });

    // Verify the assignment worked
    console.log('🔍 Verifying assignments...');
    for (const leadId of leadIds.slice(0, 3)) {
      try {
        const leadRef = doc(db, COLLECTIONS.LEADS, leadId);
        const leadDoc = await getDoc(leadRef);
        if (leadDoc.exists()) {
          const updatedData = leadDoc.data();
          console.log(`   Lead ${leadId}:`, {
            assignedTo: updatedData.assignedTo,
            assignedAgentEmail: updatedData.assignedAgentEmail,
            expected: agentData.uid
          });
        }
      } catch (verifyError) {
        console.log(`   Could not verify lead ${leadId}:`, verifyError);
      }
    }

    await adminService.logActivity({
      action: 'bulk_leads_assigned',
      userId: adminId,
      details: `Assigned ${assignedCount} leads to ${agentEmail} (${errorCount} failed)`,
      timestamp: new Date()
    });

    return { 
      success: true, 
      message: `${assignedCount} leads assigned successfully to ${agentData.firstName} ${agentData.lastName}`,
      stats: {
        assigned: assignedCount,
        failed: errorCount
      }
    };
  } catch (error) {
    console.error('❌ Error in bulk assignment:', error);
    throw error;
  }
},

 // === IMPORT LEADS ===
importLeads: async (leadsData, adminId) => {
  try {
    const batch = writeBatch(db);
    const importedLeads = [];
    const duplicateLeads = [];

    // Get all existing mobile numbers to check for duplicates
    const leadsRef = collection(db, COLLECTIONS.LEADS);
    const existingLeadsSnapshot = await getDocs(leadsRef);
    const existingMobileNumbers = new Set();
    
    existingLeadsSnapshot.docs.forEach(doc => {
      const leadData = doc.data();
      if (leadData.mobileNo) {
        existingMobileNumbers.add(leadData.mobileNo.trim());
      }
    });

    console.log(`🔍 Checking ${leadsData.length} leads for duplicates...`);

    for (const lead of leadsData) {
      const mobileNo = lead.mobileNo?.toString().trim();
      
      if (!mobileNo) {
        console.log('⚠️ Skipping lead without mobile number:', lead.fullName);
        duplicateLeads.push({ ...lead, reason: 'No mobile number' });
        continue;
      }

      // Check for duplicate mobile number
      if (existingMobileNumbers.has(mobileNo)) {
        console.log(`❌ Duplicate found: ${mobileNo} for ${lead.fullName}`);
        duplicateLeads.push({ ...lead, reason: 'Duplicate mobile number' });
        continue;
      }

      // Add to existing numbers to prevent duplicates within the same import
      existingMobileNumbers.add(mobileNo);

      const leadRef = doc(collection(db, COLLECTIONS.LEADS));
      const leadWithMetadata = {
        ...lead,
        mobileNo: mobileNo, // Ensure consistent formatting
        status: 'Unassigned',
        assignedTo: null,
        assignedToName: null,
        assignedAgentEmail: null,
        importedBy: adminId,
        importedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        followUps: []
      };
      batch.set(leadRef, leadWithMetadata);
      importedLeads.push({ id: leadRef.id, ...leadWithMetadata });
    }

    if (importedLeads.length > 0) {
      await batch.commit();
      console.log(`✅ Imported ${importedLeads.length} leads successfully`);
    }

    if (duplicateLeads.length > 0) {
      console.log(`⚠️ Skipped ${duplicateLeads.length} duplicate leads`);
    }

    await adminService.logActivity({
      action: 'leads_imported',
      userId: adminId,
      details: `Imported ${importedLeads.length} leads, skipped ${duplicateLeads.length} duplicates`,
      timestamp: new Date()
    });

    return {
      importedLeads,
      duplicateLeads,
      summary: {
        imported: importedLeads.length,
        duplicates: duplicateLeads.length,
        total: leadsData.length
      }
    };
  } catch (error) {
    console.error('Error importing leads:', error);
    throw error;
  }
},

// === IMPORT AND ASSIGN LEADS IN BATCH ===
importAndAssignLeads: async (leadsData, agentId, agentEmail, adminId) => {
  try {
    const batch = writeBatch(db);
    const importedLeads = [];
    const duplicateLeads = [];

    // Get agent details
    const agentDoc = await getDoc(doc(db, COLLECTIONS.USERS, agentId));
    const agentData = agentDoc.data();

    // Get all existing mobile numbers to check for duplicates
    const leadsRef = collection(db, COLLECTIONS.LEADS);
    const existingLeadsSnapshot = await getDocs(leadsRef);
    const existingMobileNumbers = new Set();
    
    existingLeadsSnapshot.docs.forEach(doc => {
      const leadData = doc.data();
      if (leadData.mobileNo) {
        existingMobileNumbers.add(leadData.mobileNo.trim());
      }
    });

    console.log(`🔍 Checking ${leadsData.length} leads for duplicates before assignment...`);

    for (const lead of leadsData) {
      const mobileNo = lead.mobileNo?.toString().trim();
      
      if (!mobileNo) {
        console.log('⚠️ Skipping lead without mobile number:', lead.fullName);
        duplicateLeads.push({ ...lead, reason: 'No mobile number' });
        continue;
      }

      // Check for duplicate mobile number
      if (existingMobileNumbers.has(mobileNo)) {
        console.log(`❌ Duplicate found: ${mobileNo} for ${lead.fullName}`);
        duplicateLeads.push({ ...lead, reason: 'Duplicate mobile number' });
        continue;
      }

      // Add to existing numbers to prevent duplicates within the same import
      existingMobileNumbers.add(mobileNo);

      const leadRef = doc(collection(db, COLLECTIONS.LEADS));
      const leadWithMetadata = {
        ...lead,
        mobileNo: mobileNo, // Ensure consistent formatting
        status: 'New',
        assignedTo: agentData.uid, // Use Firebase Auth UID
        assignedToName: `${agentData.firstName} ${agentData.lastName}`,
        assignedAgentEmail: agentEmail,
        assignedAt: serverTimestamp(),
        assignedBy: adminId,
        importedBy: adminId,
        importedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        followUps: []
      };
      batch.set(leadRef, leadWithMetadata);
      importedLeads.push({ id: leadRef.id, ...leadWithMetadata });
    }

    if (importedLeads.length > 0) {
      await batch.commit();
      console.log(`✅ Imported and assigned ${importedLeads.length} leads successfully`);
    }

    if (duplicateLeads.length > 0) {
      console.log(`⚠️ Skipped ${duplicateLeads.length} duplicate leads`);
    }

    await adminService.logActivity({
      action: 'leads_imported_and_assigned',
      userId: adminId,
      details: `Imported and assigned ${importedLeads.length} leads to ${agentEmail}, skipped ${duplicateLeads.length} duplicates`,
      timestamp: new Date()
    });

    return {
      importedLeads,
      duplicateLeads,
      summary: {
        imported: importedLeads.length,
        duplicates: duplicateLeads.length,
        total: leadsData.length
      }
    };
  } catch (error) {
    console.error('Error importing and assigning leads:', error);
    throw error;
  }
},

  // === BLOCK/UNBLOCK AGENT ===
  blockUnblockAgent: async (agentId, block, adminId) => {
    try {
      const agentRef = doc(db, COLLECTIONS.USERS, agentId);
      await updateDoc(agentRef, {
        blocked: block,
        isActive: !block,
        updatedAt: serverTimestamp()
      });

      await adminService.logActivity({
        action: block ? 'agent_blocked' : 'agent_unblocked',
        userId: adminId,
        targetId: agentId,
        details: `Agent ${block ? 'blocked' : 'unblocked'}`,
        timestamp: new Date()
      });

      return {
        success: true,
        message: `Agent ${block ? 'blocked' : 'unblocked'} successfully`
      };
    } catch (error) {
      console.error('Error updating agent status:', error);
      throw new Error('Failed to update agent status: ' + error.message);
    }
  },

  // === ACTIVITY LOG SYSTEM ===
  logActivity: async (activityData) => {
    try {
      const activitiesRef = collection(db, COLLECTIONS.ACTIVITIES);
      await addDoc(activitiesRef, {
        ...activityData,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  },

  getActivityLog: async (limitCount = 10) => {
    try {
      const activitiesRef = collection(db, COLLECTIONS.ACTIVITIES);
      const q = query(activitiesRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching activity log:', error);
      return [];
    }
  }
};

export default adminService;