import { createContext, useContext } from 'react';

/**
 * The career is one large mutable object. Screens read it from context and
 * change it only through `act`, which runs the change, bumps the version
 * (re-render) and schedules an autosave.
 */
export const ManagerContext = createContext(null);
export const useManager = () => useContext(ManagerContext);
