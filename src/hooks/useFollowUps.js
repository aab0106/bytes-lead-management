import { useState, useEffect } from 'react'; // Add this import
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { followupsService } from '../services/followupsService';

export const useFollowUps = (leadId) => {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'leads', leadId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const leadData = docSnapshot.data();
          setFollowUps(leadData.followUps || []);
        } else {
          setFollowUps([]);
        }
        setLoading(false);
      },
      (error) => {
        setError('Error loading follow-ups: ' + error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [leadId]);

  const updateFollowUpStatus = async (followUpId, newStatus) => {
    try {
      await followupsService.updateFollowUpStatus(leadId, followUpId, newStatus);
    } catch (error) {
      setError('Error updating status: ' + error.message);
      throw error;
    }
  };

  return {
    followUps: followUps || [],
    loading,
    error,
    updateFollowUpStatus
  };
};