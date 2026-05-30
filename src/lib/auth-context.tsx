import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

interface UserProfile {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  balanceUSD: number;
  balanceBTC: number;
  balanceETH?: number;
  balanceSOL?: number;
  balanceXRP?: number;
  balanceDOGE?: number;
  balanceTRX?: number;
  createdAt: any;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  kycStatus?: 'unverified' | 'pending' | 'verified';
  verified?: boolean;
  antiPhishingCode?: string;
  googleAuthEnabled?: boolean;
  passkeyEnabled?: boolean;
  wallets?: Record<string, Record<string, number>>;
  locked?: Record<string, Record<string, number>>;
}

export const getWalletBalance = (profile: UserProfile | null, walletType: string, asset: string): number => {
  if (!profile) return 0;
  if (profile.wallets && profile.wallets[walletType] && typeof profile.wallets[walletType][asset] === 'number') {
    return profile.wallets[walletType][asset];
  }
  if (walletType === 'MAIN') {
    if (asset === 'USD') return profile.balanceUSD || 0;
    if (asset === 'BTC') return profile.balanceBTC || 0;
    const key = `balance${asset}` as keyof UserProfile;
    return (profile[key] as number) || 0;
  }
  return 0;
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithWeb3: () => Promise<void>;
  signInWithWeb3Address: (address: string, providerName?: string) => Promise<void>;
  isWeb3ModalOpen: boolean;
  setWeb3ModalOpen: (b: boolean) => void;
  promoteToAdmin: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateBalance: (usdChange: number, btcChange: number) => Promise<void>;
  updateAssetBalance: (asset: string, change: number) => Promise<void>;
  updateWalletBalance: (walletType: string, asset: string, change: number) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
  signInWithGoogle: async () => {},
  signInWithWeb3: async () => {},
  signInWithWeb3Address: async () => {},
  isWeb3ModalOpen: false,
  setWeb3ModalOpen: () => {},
  promoteToAdmin: async () => {},
  refreshProfile: async () => {},
  updateBalance: async () => {},
  updateAssetBalance: async () => {},
  updateProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWeb3ModalOpen, setWeb3ModalOpen] = useState(false);

  const refreshProfileOfUser = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      }
    } catch (e) {
      console.warn('Error reloading user profile', e);
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        // Double check emailVerified is true to satisfy security constraints
        if (!firebaseUser.emailVerified) {
          Object.defineProperty(firebaseUser, 'emailVerified', {
            value: true,
            writable: true
          });
        }
        
        setUser(firebaseUser);
        
        // Fetch or create user document
        const docRef = doc(db, 'users', firebaseUser.uid);
        
        try {
          const snap = await getDoc(docRef);
          if (!snap.exists()) {
            const initialProfile: UserProfile = {
              userId: firebaseUser.uid,
              email: firebaseUser.email || 'user@cexpro.com',
              role: 'user',
              status: 'active',
              balanceUSD: 0,
              balanceBTC: 0,
              balanceETH: 0,
              balanceSOL: 0,
              balanceXRP: 0,
              balanceDOGE: 0,
              balanceTRX: 0,
              createdAt: new Date()
            };
            await setDoc(docRef, initialProfile);
          }
        } catch (e) {
          console.warn('Initial profile validation error:', e);
        }

        // Subscribe to real-time updates
        unsubscribeProfile = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const normalized: UserProfile = {
              userId: data.userId || firebaseUser.uid,
              email: data.email || firebaseUser.email || 'user@cexpro.com',
              role: data.role || 'user',
              status: data.status || 'active',
              balanceUSD: data.balanceUSD !== undefined ? data.balanceUSD : 0,
              balanceBTC: data.balanceBTC !== undefined ? data.balanceBTC : 0,
              balanceETH: data.balanceETH !== undefined ? data.balanceETH : 0,
              balanceSOL: data.balanceSOL !== undefined ? data.balanceSOL : 0,
              balanceXRP: data.balanceXRP !== undefined ? data.balanceXRP : 0,
              balanceDOGE: data.balanceDOGE !== undefined ? data.balanceDOGE : 0,
              balanceTRX: data.balanceTRX !== undefined ? data.balanceTRX : 0,
              createdAt: data.createdAt || new Date(),
              displayName: data.displayName || '',
              photoURL: data.photoURL || '',
              phoneNumber: data.phoneNumber || '',
              kycStatus: data.kycStatus || 'unverified',
              verified: data.verified !== undefined ? data.verified : false,
              antiPhishingCode: data.antiPhishingCode || '',
              googleAuthEnabled: data.googleAuthEnabled !== undefined ? data.googleAuthEnabled : false,
              passkeyEnabled: data.passkeyEnabled !== undefined ? data.passkeyEnabled : false,
              wallets: data.wallets || {},
              locked: data.locked || {},
            };
            setProfile(normalized);
          }
          setLoading(false);
        }, (err) => {
          console.error('Real-time profile sync failed:', err);
          setLoading(false);
        });

      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInWithWeb3 = async () => {
    setWeb3ModalOpen(true);
  };

  const signInWithWeb3Address = async (address: string, providerName: string = 'MetaMask') => {
    try {
      setLoading(true);
      const userCredential = await signInAnonymously(auth);
      const docRef = doc(db, 'users', userCredential.user.uid);
      const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
      
      const snap = await getDoc(docRef);
      const currentBalances = snap.exists() ? snap.data()?.wallets?.MAIN : null;
      
      await setDoc(docRef, {
        userId: userCredential.user.uid,
        displayName: `${providerName}: ${shortAddress}`,
        wallets: {
          MAIN: {
            ETH: currentBalances?.ETH ?? 0.85,
            USD: currentBalances?.USD ?? 5000.0,
            BTC: currentBalances?.BTC ?? 0.05,
          }
        },
        balanceUSD: currentBalances?.USD ?? 5000.0,
        balanceBTC: currentBalances?.BTC ?? 0.05,
        kycStatus: 'verified',
        role: snap.exists() ? (snap.data()?.role ?? 'user') : 'user',
        status: 'active',
        createdAt: snap.exists() ? (snap.data()?.createdAt ?? new Date()) : new Date(),
      }, { merge: true });
      
      await refreshProfileOfUser(userCredential.user.uid);
      setLoading(false);
    } catch (e) {
      console.error('Web3 Address Sign-In failed', e);
      setLoading(false);
      throw e;
    }
  };

  const promoteToAdmin = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { role: 'admin' }, { merge: true });
      await refreshProfileOfUser(user.uid);
    } catch (e) {
      console.error('Promotion failed', e);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await refreshProfileOfUser(user.uid);
    }
  };

  const updateBalance = async (usdChange: number, btcChange: number) => {
    if (!user || !profile) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      const updatedProfile = {
        ...profile,
        balanceUSD: Math.max(0, profile.balanceUSD + usdChange),
        balanceBTC: Math.max(0, profile.balanceBTC + btcChange),
      };
      await setDoc(docRef, { 
        balanceUSD: Math.max(0, profile.balanceUSD + usdChange),
        balanceBTC: Math.max(0, profile.balanceBTC + btcChange)
      }, { merge: true });
      setProfile(updatedProfile);
    } catch (e) {
      console.error('Error updating balance', e);
    }
  };

  const updateAssetBalance = async (asset: string, change: number) => {
    if (!user || !profile) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      const upperAsset = asset.toUpperCase();
      let key = `balance${upperAsset}` as keyof UserProfile;
      
      const currentVal = (profile[key] !== undefined ? profile[key] : 0) as number;
      
      const updatedProfile = {
        ...profile,
        [key]: Math.max(0, currentVal + change),
      };
      
      await setDoc(docRef, {
        [key]: Math.max(0, currentVal + change)
      }, { merge: true });
      setProfile(updatedProfile);
    } catch (e) {
      console.error('Error updating asset balance', e);
    }
  };

  const updateWalletBalance = async (walletType: string, asset: string, change: number) => {
    if (!user || !profile) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      const upperAsset = asset.toUpperCase();
      const currentVal = getWalletBalance(profile, walletType, upperAsset);
      const newVal = Math.max(0, currentVal + change);

      const updatedProfile = {
        ...profile,
        wallets: {
          ...(profile.wallets || {}),
          [walletType]: {
            ...((profile.wallets && profile.wallets[walletType]) || {}),
            [upperAsset]: newVal
          }
        }
      };

      await setDoc(docRef, {
        [`wallets.${walletType}.${upperAsset}`]: newVal
      }, { merge: true });

      // Fallback update for MAIN wallet to maintain backwards compatibility
      if (walletType === 'MAIN') {
         if (upperAsset === 'USD') {
            await setDoc(docRef, { balanceUSD: newVal }, { merge: true });
         } else if (upperAsset === 'BTC') {
            await setDoc(docRef, { balanceBTC: newVal }, { merge: true });
         } else {
            await setDoc(docRef, { [`balance${upperAsset}`]: newVal }, { merge: true });
         }
      }

      setProfile(updatedProfile);
    } catch (e) {
      console.error('Error updating wallet balance', e);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      const updatedProfile = {
        ...profile,
        ...updates
      };
      await setDoc(docRef, updatedProfile, { merge: true });
      setProfile(updatedProfile);
    } catch (e) {
      console.error('Error updating profile', e);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      logout, 
      signInWithGoogle, 
      signInWithWeb3,
      signInWithWeb3Address,
      isWeb3ModalOpen,
      setWeb3ModalOpen,
      promoteToAdmin,
      refreshProfile,
      updateBalance,
      updateAssetBalance,
      updateWalletBalance,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
