import { createContext, useContext, useState, ReactNode } from 'react';

const ALLOWED_EMAIL = 'leviturjeman@gmail.com';
const VALID_PASSWORD = 'Levi1234';

export interface UserProfile {
  companyName: string;
  cif: string;
  email: string;
  phone: string;
  contactPerson: string;
  deliveryAddress: string;
}

const REGISTERED_PROFILE: UserProfile = {
  companyName: 'Precious Spain S.L.',
  cif: 'B87654321',
  email: ALLOWED_EMAIL,
  phone: '+34 912 345 678',
  contactPerson: 'Levi Turjeman',
  deliveryAddress: 'Calle Mayor 42, 28013 Madrid',
};

interface AuthContextType {
  isLoggedIn: boolean;
  isGuest: boolean;
  userEmail: string | null;
  userProfile: UserProfile | null;
  login: (email: string, password: string) => { success: boolean; error?: string };
  loginAsGuest: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const login = (email: string, password: string): { success: boolean; error?: string } => {
    if (email.trim().toLowerCase() !== ALLOWED_EMAIL) {
      return { success: false, error: 'Email no autorizado' };
    }
    if (password !== VALID_PASSWORD) {
      return { success: false, error: 'Contraseña incorrecta' };
    }
    setIsLoggedIn(true);
    setIsGuest(false);
    setUserEmail(email);
    setUserProfile(REGISTERED_PROFILE);
    return { success: true };
  };

  const loginAsGuest = () => {
    setIsGuest(true);
    setIsLoggedIn(false);
    setUserEmail(null);
    setUserProfile(null);
  };

  const logout = () => {
    setIsLoggedIn(false);
    setIsGuest(false);
    setUserEmail(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isGuest, userEmail, userProfile, login, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
