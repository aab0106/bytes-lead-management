import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export const followupsService = {
  // Add new follow-up
  addFollowUp: async (leadId, followUpData) => {
    try {
      const followUp = {
        id: Date.now().toString(),
        ...followUpData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await updateDoc(doc(db, 'leads', leadId), {
        followUps: arrayUnion(followUp)
      });

      return followUp;
    } catch (error) {
      throw new Error('Failed to add follow-up: ' + error.message);
    }
  },

  // Update follow-up status
  updateFollowUpStatus: async (leadId, followUpId, newStatus) => {
    try {
      const leadRef = doc(db, 'leads', leadId);
      const leadDoc = await getDoc(leadRef);
      
      if (leadDoc.exists()) {
        const leadData = leadDoc.data();
        const updatedFollowUps = leadData.followUps?.map(followUp => {
          if (followUp.id === followUpId) {
            return {
              ...followUp,
              status: newStatus,
              updatedAt: new Date()
            };
          }
          return followUp;
        }) || [];

        await updateDoc(leadRef, { followUps: updatedFollowUps });
        return updatedFollowUps;
      } else {
        throw new Error('Lead not found');
      }
    } catch (error) {
      throw new Error('Failed to update follow-up status: ' + error.message);
    }
  },

  // Delete follow-up
  deleteFollowUp: async (leadId, followUpId) => {
    try {
      const leadRef = doc(db, 'leads', leadId);
      const leadDoc = await getDoc(leadRef);
      
      if (leadDoc.exists()) {
        const leadData = leadDoc.data();
        const updatedFollowUps = leadData.followUps?.filter(
          followUp => followUp.id !== followUpId
        ) || [];

        await updateDoc(leadRef, { followUps: updatedFollowUps });
        return updatedFollowUps;
      } else {
        throw new Error('Lead not found');
      }
    } catch (error) {
      throw new Error('Failed to delete follow-up: ' + error.message);
    }
  }
};