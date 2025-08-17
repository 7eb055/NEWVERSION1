// Custom hook for accessing EventData context
import { useContext } from 'react';
import { EventDataContext } from '../contexts/EventDataContext';

export const useEventData = () => {
  const context = useContext(EventDataContext);
  if (!context) {
    throw new Error('useEventData must be used within an EventDataProvider');
  }
  return context;
};
