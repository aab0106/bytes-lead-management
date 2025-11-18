import { 
  collection, 
  query, 
  where, 
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';

export const notificationsService = {
  // Get today's follow-ups for an agent
  getTodaysFollowUps: async (agentId) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const leadsQuery = query(
        collection(db, 'leads'),
        where('assignedAgentId', '==', agentId)
      );
      
      const leadsSnapshot = await getDocs(leadsQuery);
      const todaysFollowUps = [];

      leadsSnapshot.forEach((leadDoc) => {
        const lead = leadDoc.data();
        if (lead.followUps && lead.followUps.length > 0) {
          lead.followUps.forEach((followUp) => {
            const followUpDate = followUp.date?.toDate ? followUp.date.toDate() : new Date(followUp.date);
            const followUpDay = new Date(followUpDate);
            followUpDay.setHours(0, 0, 0, 0);

            // Only include if it's exactly today (not upcoming)
            if (followUpDay.getTime() === today.getTime()) {
              todaysFollowUps.push({
                id: `${leadDoc.id}-${followUp.id || followUpDate.getTime()}`,
                leadId: leadDoc.id,
                leadName: lead.fullName,
                followUpDate: followUpDate,
                notes: followUp.notes,
                type: 'today_followup'
              });
            }
          });
        }
      });

      return todaysFollowUps.sort((a, b) => a.followUpDate - b.followUpDate);
    } catch (error) {
      console.error('Error getting today\'s follow-ups:', error);
      return [];
    }
  },

  // Get upcoming follow-ups (next 3 days, excluding today)
  getUpcomingFollowUps: async (agentId) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const threeDaysLater = new Date(today);
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);

      const leadsQuery = query(
        collection(db, 'leads'),
        where('assignedAgentId', '==', agentId)
      );
      
      const leadsSnapshot = await getDocs(leadsQuery);
      const upcomingFollowUps = [];

      leadsSnapshot.forEach((leadDoc) => {
        const lead = leadDoc.data();
        if (lead.followUps && lead.followUps.length > 0) {
          lead.followUps.forEach((followUp) => {
            const followUpDate = followUp.date?.toDate ? followUp.date.toDate() : new Date(followUp.date);
            const followUpDay = new Date(followUpDate);
            followUpDay.setHours(0, 0, 0, 0);

            // Exclude today's follow-ups (they're handled separately)
            if (followUpDay > today && followUpDay <= threeDaysLater) {
              const daysUntil = Math.ceil((followUpDay - today) / (1000 * 60 * 60 * 24));
              
              upcomingFollowUps.push({
                id: `${leadDoc.id}-${followUp.id || followUpDate.getTime()}`,
                leadId: leadDoc.id,
                leadName: lead.fullName,
                followUpDate: followUpDate,
                notes: followUp.notes,
                type: 'upcoming_followup',
                daysUntil: daysUntil
              });
            }
          });
        }
      });

      return upcomingFollowUps.sort((a, b) => a.followUpDate - b.followUpDate);
    } catch (error) {
      console.error('Error getting upcoming follow-ups:', error);
      return [];
    }
  },

  // Get total notification count
  getNotificationCount: async (agentId) => {
    try {
      const todaysFollowUps = await notificationsService.getTodaysFollowUps(agentId);
      const upcomingFollowUps = await notificationsService.getUpcomingFollowUps(agentId);
      
      return todaysFollowUps.length + upcomingFollowUps.length;
    } catch (error) {
      console.error('Error getting notification count:', error);
      return 0;
    }
  },

  // ... rest of the methods remain the same
};