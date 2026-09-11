import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading

  useEffect(() => {
    (async () => {
      try {
        const result = await window.electronAPI.checkToken();
        setIsAuthenticated(result.valid);
      } catch {
        setIsAuthenticated(false);
      }
    })();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}