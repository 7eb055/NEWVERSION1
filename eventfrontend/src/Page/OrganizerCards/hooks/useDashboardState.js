// Custom hook for accessing DashboardState context
import { useContext } from 'react';
import { DashboardStateContext } from '../contexts/DashboardStateContext';

export const useDashboardState = () => {
  const context = useContext(DashboardStateContext);
  if (!context) {
    throw new Error('useDashboardState must be used within a DashboardStateProvider');
  }
  return context;
};
