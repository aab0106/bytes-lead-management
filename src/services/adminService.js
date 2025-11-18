import {
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

// Define COLLECTIONS constant
const COLLECTIONS = {
  LEADS: 'leads',
  AGENTS: 'agents'
};

// Store admin credentials temporarily (in memory only)
let adminCredentials = null;

export const adminService = {
  // === CREATE AGENT - FIXED VERSION ===
  createAgent: async (agentData) => {
    try {
      console.log('👤 Creating new agent:', agentData.email);

      // Store current admin info
      const currentAdmin = auth.currentUser;
      if (!currentAdmin) {
        throw new Error('No admin user logged in');
      }

      // METHOD 1: Use Firebase REST API to create user without auto-login
      // This prevents the automatic sign-in issue
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
      console.log('New agent created via REST API:', agentData.email);

      // Create agent profile in Firestore
      const agentProfile = {
        uid: newAgentUid,
        email: agentData.email,
        firstName: agentData.firstName,
        lastName: agentData.lastName,
        phone: agentData.phone,
        role: 'agent',
        active: true,
        createdAt: Timestamp.now(),
        createdBy: currentAdmin.uid,
        createdByEmail: currentAdmin.email
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.AGENTS), agentProfile);

      console.log('✅ Agent created successfully:', docRef.id);

      // Return success - NO AUTO LOGIN WILL HAPPEN
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

  // === UPDATED GET ALL LEADS WITH LAST MODIFIED TRACKING ===
  getAllLeads: async () => {
    try {
      console.log('🔍 Fetching leads with last modified tracking...');
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.LEADS));

      const leads = [];
      querySnapshot.forEach((doc) => {
        const leadData = doc.data();
        leads.push({ 
          id: doc.id, 
          ...leadData,
          // Ensure we have proper lastModified field for tracking
          lastModified: leadData.lastModified || leadData.updatedAt || leadData.createdAt
        });
      });

      // Sort by last modified date (newest first) - this is crucial for accurate "last updated" time
      leads.sort((a, b) => {
        const getTime = (lead) => {
          // Priority: lastModified > updatedAt > createdAt
          if (lead.lastModified && lead.lastModified.seconds) {
            return lead.lastModified.seconds * 1000;
          }
          if (lead.updatedAt && lead.updatedAt.seconds) {
            return lead.updatedAt.seconds * 1000;
          }
          if (lead.createdAt && lead.createdAt.seconds) {
            return lead.createdAt.seconds * 1000;
          }
          return 0;
        };
        
        return getTime(b) - getTime(a);
      });

      console.log(`✅ Loaded ${leads.length} leads with last modified tracking`);
      return leads;
    } catch (error) {
      console.error('❌ Error loading leads:', error);
      throw new Error(`Failed to load leads. Please check Firestore rules. Error: ${error.message}`);
    }
  },

  getAllAgents: async () => {
    try {
      console.log('🔍 Fetching agents with simple query...');
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.AGENTS));

      const agents = [];
      querySnapshot.forEach((doc) => {
        agents.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ Loaded ${agents.length} agents`);
      return agents;
    } catch (error) {
      console.error('❌ Error loading agents:', error);
      if (error.code === 'not-found') {
        console.log('ℹ️ Agents collection not found, returning empty array');
        return [];
      }
      throw new Error(`Failed to load agents. Please check Firestore rules. Error: ${error.message}`);
    }
  },

  // === UPDATED DASHBOARD STATS WITH LAST MODIFIED TRACKING ===
  getDashboardStats: async () => {
    try {
      console.log('📊 Fetching dashboard stats with last modified info...');

      const [leadsSnapshot, agentsSnapshot] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.LEADS)),
        getDocs(collection(db, COLLECTIONS.AGENTS))
      ]);

      const stats = {
        totalLeads: leadsSnapshot.size,
        totalAgents: agentsSnapshot.size,
        leadsByStatus: {},
        recentLeads: 0,
        activeAgents: 0,
        lastSystemUpdate: null // Add this to track last update time
      };

      let latestUpdate = 0;

      leadsSnapshot.forEach((doc) => {
        const lead = doc.data();
        stats.leadsByStatus[lead.status] = (stats.leadsByStatus[lead.status] || 0) + 1;

        if (lead.createdAt && lead.createdAt.seconds) {
          const leadDate = new Date(lead.createdAt.seconds * 1000);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (leadDate > weekAgo) stats.recentLeads++;
        }

        // Track latest modification across all leads
        const getLeadUpdateTime = (lead) => {
          // Priority: lastModified > updatedAt > createdAt
          if (lead.lastModified && lead.lastModified.seconds) {
            return lead.lastModified.seconds * 1000;
          }
          if (lead.updatedAt && lead.updatedAt.seconds) {
            return lead.updatedAt.seconds * 1000;
          }
          if (lead.createdAt && lead.createdAt.seconds) {
            return lead.createdAt.seconds * 1000;
          }
          return 0;
        };

        const leadUpdateTime = getLeadUpdateTime(lead);
        if (leadUpdateTime > latestUpdate) {
          latestUpdate = leadUpdateTime;
        }
      });

      agentsSnapshot.forEach((doc) => {
        const agent = doc.data();
        if (!agent.blocked) stats.activeAgents++;
      });

      // Set the last system update timestamp
      if (latestUpdate > 0) {
        stats.lastSystemUpdate = new Date(latestUpdate);
      }

      return stats;
    } catch (error) {
      console.error('❌ Error loading stats:', error);
      return {
        totalLeads: 0,
        totalAgents: 0,
        leadsByStatus: {},
        recentLeads: 0,
        activeAgents: 0,
        lastSystemUpdate: null
      };
    }
  },

  getLeadById: async (leadId) => {
    try {
      const docRef = doc(db, COLLECTIONS.LEADS, leadId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const leadData = docSnap.data();
        return { 
          id: docSnap.id, 
          ...leadData,
          // Include lastModified for consistency
          lastModified: leadData.lastModified || leadData.updatedAt || leadData.createdAt
        };
      } else {
        throw new Error('Lead not found');
      }
    } catch (error) {
      console.error('Error getting lead:', error);
      throw new Error('Failed to load lead: ' + error.message);
    }
  },

  // === UPDATED LEAD STATUS UPDATE WITH LAST MODIFIED TIMESTAMP ===
  updateLeadStatus: async (leadId, newStatus) => {
    try {
      const leadRef = doc(db, COLLECTIONS.LEADS, leadId);
      
      // Always set lastModified when status changes - THIS IS CRUCIAL
      const updateData = {
        status: newStatus,
        updatedAt: Timestamp.now(),
        lastModified: Timestamp.now() // This ensures accurate "last updated" tracking
      };
      
      await updateDoc(leadRef, updateData);
      
      console.log(`✅ Lead ${leadId} status updated to ${newStatus} with lastModified timestamp`);
      return { 
        success: true, 
        message: 'Status updated successfully',
        timestamp: updateData.lastModified // Return timestamp for immediate use
      };
    } catch (error) {
      console.error('Error updating lead status:', error);
      throw new Error('Failed to update status: ' + error.message);
    }
  },

  deleteLead: async (leadId) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.LEADS, leadId));
      console.log(`✅ Lead ${leadId} deleted successfully`);
      return { success: true, message: 'Lead deleted successfully' };
    } catch (error) {
      console.error('Error deleting lead:', error);
      throw new Error('Failed to delete lead: ' + error.message);
    }
  },

  blockUnblockAgent: async (agentId, block) => {
    try {
      const agentRef = doc(db, COLLECTIONS.AGENTS, agentId);
      await updateDoc(agentRef, {
        blocked: block,
        status: block ? "blocked" : "active",
        updatedAt: Timestamp.now()
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

  deleteAgent: async (agentId) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.AGENTS, agentId));
      return { success: true, message: 'Agent deleted successfully' };
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw new Error('Failed to delete agent: ' + error.message);
    }
  },

  // === NEW METHOD: UPDATE LEAD WITH LAST MODIFIED TRACKING ===
  updateLead: async (leadId, updateData) => {
    try {
      const leadRef = doc(db, COLLECTIONS.LEADS, leadId);
      
      // Always include lastModified for any lead update
      const finalUpdateData = {
        ...updateData,
        updatedAt: Timestamp.now(),
        lastModified: Timestamp.now() // Crucial for tracking
      };
      
      await updateDoc(leadRef, finalUpdateData);
      
      console.log(`✅ Lead ${leadId} updated with lastModified timestamp`);
      return { 
        success: true, 
        message: 'Lead updated successfully',
        timestamp: finalUpdateData.lastModified
      };
    } catch (error) {
      console.error('Error updating lead:', error);
      throw new Error('Failed to update lead: ' + error.message);
    }
  },

  // === NEW METHOD: GET LAST SYSTEM UPDATE TIME ===
  getLastSystemUpdate: async () => {
    try {
      const leadsSnapshot = await getDocs(collection(db, COLLECTIONS.LEADS));
      
      if (leadsSnapshot.empty) {
        return null;
      }

      let latestTime = 0;

      leadsSnapshot.forEach((doc) => {
        const lead = doc.data();
        
        // Get the most recent timestamp from available fields
        const getMostRecentTime = (lead) => {
          const times = [];
          
          if (lead.lastModified && lead.lastModified.seconds) {
            times.push(lead.lastModified.seconds * 1000);
          }
          if (lead.updatedAt && lead.updatedAt.seconds) {
            times.push(lead.updatedAt.seconds * 1000);
          }
          if (lead.createdAt && lead.createdAt.seconds) {
            times.push(lead.createdAt.seconds * 1000);
          }
          
          return times.length > 0 ? Math.max(...times) : 0;
        };

        const leadTime = getMostRecentTime(lead);
        if (leadTime > latestTime) {
          latestTime = leadTime;
        }
      });

      return latestTime > 0 ? new Date(latestTime) : null;
    } catch (error) {
      console.error('Error getting last system update:', error);
      return null;
    }
  },

  // Get all follow-ups across all leads
  getAllFollowUps: async () => {
    try {
      const leadsQuery = query(collection(db, 'leads'));
      const querySnapshot = await getDocs(leadsQuery);
      
      const allFollowUps = [];
      
      querySnapshot.forEach((doc) => {
        const leadData = doc.data();
        const leadFollowUps = leadData.followUps || [];
        
        // Enrich each follow-up with lead and agent information
        leadFollowUps.forEach(followUp => {
          allFollowUps.push({
            ...followUp,
            leadId: doc.id,
            leadName: leadData.fullName,
            leadPhone: leadData.mobileNo,
            leadEmail: leadData.email,
            leadStatus: leadData.status,
            agentEmail: leadData.assignedAgentEmail,
            propertyType: leadData.propertyType,
            budget: leadData.budget,
            location: leadData.location
          });
        });
      });
      
      // Sort by date (newest first)
      allFollowUps.sort((a, b) => {
        const dateA = a.date?.toDate?.() || a.date;
        const dateB = b.date?.toDate?.() || b.date;
        return new Date(dateB) - new Date(dateA);
      });
      
      return allFollowUps;
    } catch (error) {
      throw new Error('Failed to fetch follow-ups: ' + error.message);
    }
  },

  // Get dashboard statistics
  getDashboardStats: async () => {
    try {
      // Get all leads
      const leadsQuery = query(collection(db, 'leads'));
      const leadsSnapshot = await getDocs(leadsQuery);
      
      // Get all agents
      const agentsQuery = query(collection(db, 'users'), where('role', '==', 'agent'));
      const agentsSnapshot = await getDocs(agentsQuery);
      
      const leads = [];
      leadsSnapshot.forEach(doc => {
        leads.push({ id: doc.id, ...doc.data() });
      });
      
      const agents = [];
      agentsSnapshot.forEach(doc => {
        agents.push({ id: doc.id, ...doc.data() });
      });

      // Calculate recent leads (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentLeads = leads.filter(lead => {
        const leadDate = lead.createdAt?.toDate?.() || new Date(lead.createdAt);
        return leadDate >= sevenDaysAgo;
      }).length;

      // Calculate leads by status
      const leadsByStatus = {};
      leads.forEach(lead => {
        const status = lead.status || 'Unknown';
        leadsByStatus[status] = (leadsByStatus[status] || 0) + 1;
      });

      // Get active agents (agents with assigned leads)
      const activeAgentEmails = new Set(
        leads.map(lead => lead.assignedAgentEmail).filter(email => email)
      );
      const activeAgents = agents.filter(agent => 
        activeAgentEmails.has(agent.email)
      ).length;

      return {
        totalLeads: leads.length,
        totalAgents: agents.length,
        recentLeads,
        activeAgents,
        leadsByStatus
      };
    } catch (error) {
      throw new Error('Failed to fetch dashboard stats: ' + error.message);
    }
  },

  // Get lead by ID
  getLeadById: async (leadId) => {
    try {
      const leadDoc = await getDoc(doc(db, 'leads', leadId));
      if (leadDoc.exists()) {
        return { id: leadDoc.id, ...leadDoc.data() };
      } else {
        throw new Error('Lead not found');
      }
    } catch (error) {
      throw new Error('Failed to fetch lead: ' + error.message);
    }
  },

  // Update lead status
  updateLeadStatus: async (leadId, status) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), {
        status,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      throw new Error('Failed to update lead status: ' + error.message);
    }
  },

  // Get all leads
  getAllLeads: async () => {
    try {
      const leadsQuery = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(leadsQuery);
      const leads = [];
      querySnapshot.forEach(doc => {
        leads.push({ id: doc.id, ...doc.data() });
      });
      return leads;
    } catch (error) {
      throw new Error('Failed to fetch leads: ' + error.message);
    }
  },

  // Get all agents
  getAllAgents: async () => {
    try {
      const agentsQuery = query(
        collection(db, 'users'), 
        where('role', '==', 'agent')
      );
      const querySnapshot = await getDocs(agentsQuery);
      const agents = [];
      querySnapshot.forEach(doc => {
        agents.push({ id: doc.id, ...doc.data() });
      });
      return agents;
    } catch (error) {
      throw new Error('Failed to fetch agents: ' + error.message);
    }
  },

  // Create new agent
  createAgent: async (agentData) => {
    try {
      const agentWithTimestamp = {
        ...agentData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, 'users'), agentWithTimestamp);
      return { id: docRef.id, ...agentData };
    } catch (error) {
      throw new Error('Failed to create agent: ' + error.message);
    }
  },

  // Delete agent
  deleteAgent: async (agentId) => {
    try {
      await deleteDoc(doc(db, 'users', agentId));
    } catch (error) {
      throw new Error('Failed to delete agent: ' + error.message);
    }
  },

  // Assign lead to agent
  assignLeadToAgent: async (leadId, agentEmail) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), {
        assignedAgentEmail: agentEmail,
        assignedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      throw new Error('Failed to assign lead: ' + error.message);
    }
  },

  // Get agent performance stats
  getAgentPerformance: async (agentEmail) => {
    try {
      const leadsQuery = query(
        collection(db, 'leads'), 
        where('assignedAgentEmail', '==', agentEmail)
      );
      const querySnapshot = await getDocs(leadsQuery);
      
      const leads = [];
      querySnapshot.forEach(doc => {
        leads.push({ id: doc.id, ...doc.data() });
      });

      const stats = {
        totalLeads: leads.length,
        closedLeads: leads.filter(lead => lead.status === 'Closed').length,
        activeLeads: leads.filter(lead => 
          ['New', 'Contacted', 'Visited', 'Qualified'].includes(lead.status)
        ).length,
        totalFollowUps: leads.reduce((total, lead) => 
          total + (lead.followUps?.length || 0), 0
        )
      };

      return stats;
    } catch (error) {
      throw new Error('Failed to fetch agent performance: ' + error.message);
    }
  }
};