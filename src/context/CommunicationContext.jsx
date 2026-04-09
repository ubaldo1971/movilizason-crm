import { createContext, useContext, useEffect } from 'react';
import { useRole } from './RoleContext';
import { useCommunication } from '../hooks/useCommunication';

const CommunicationContext = createContext();

export function CommunicationProvider({ children }) {
  const { currentUser } = useRole();
  const comms = useCommunication();

  // Initialize peer when user is available
  useEffect(() => {
    if (currentUser?.uid) {
      comms.initPeer(currentUser.uid);
    }
  }, [currentUser?.uid]);

  const value = {
    ...comms,
    // Add any global overrides or helper methods here
  };

  return (
    <CommunicationContext.Provider value={value}>
      {children}
    </CommunicationContext.Provider>
  );
}

export const useComms = () => {
  const context = useContext(CommunicationContext);
  if (!context) {
    throw new Error('useComms must be used within a CommunicationProvider');
  }
  return context;
};
