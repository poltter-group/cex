import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { collection, onSnapshot, doc, updateDoc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Users, Ticket, Settings, ShieldAlert, CheckCircle, XCircle, 
  UserCheck, Award, MessageSquare, Save, Coins, Layers, PlusCircle, Loader2, Search 
} from 'lucide-react';

interface UserAccount {
  id: string;
  userId: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  balanceUSD: number;
  balanceBTC: number;
  createdAt: any;
}

interface SupportTicket {
  id: string;
  ticketId: string;
  userId: string;
  userEmail: string;
  subject: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  messages: { sender: 'user' | 'admin'; text: string; timestamp: number }[];
  createdAt: any;
  updatedAt: any;
}

interface GlobalConfig {
  makerFeePercent: number;
  takerFeePercent: number;
  maxLeverage: number;
}

export function AdminPanel() {
  const { profile, promoteToAdmin } = useAuth();
  
  // Real-time Database lists
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({
    makerFeePercent: 0.1,
    takerFeePercent: 0.2,
    maxLeverage: 125,
  });

  const [loading, setLoading] = useState(true);
  const [activePane, setActivePane] = useState<'USERS' | 'TICKETS' | 'CONFIG'>('USERS');

  // Selected object editors
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  
  // Filtering States
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Status logs
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync real-time data from Firestore
  useEffect(() => {
    if (!profile || profile.role !== 'admin') {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Sync User Directory
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const uList: UserAccount[] = [];
      snap.forEach(docSnap => {
        uList.push({ id: docSnap.id, ...docSnap.data() } as UserAccount);
      });
      setUsers(uList);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'users'));

    // 2. Sync Support Tickets Desk
    const unsubscribeTickets = onSnapshot(collection(db, 'support_tickets'), (snap) => {
      const tList: SupportTicket[] = [];
      snap.forEach(docSnap => {
        tList.push({ id: docSnap.id, ...docSnap.data() } as SupportTicket);
      });
      tList.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setTickets(tList);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'support_tickets'));

    // 3. Sync Global Parameters
    const unsubscribeConfig = onSnapshot(doc(db, 'system_config', 'global'), (snap) => {
      if (snap.exists()) {
        setGlobalConfig(snap.data() as GlobalConfig);
      }
      setLoading(false);
    }, (e) => handleFirestoreError(e, OperationType.GET, 'system_config/global'));

    return () => {
      unsubscribeUsers();
      unsubscribeTickets();
      unsubscribeConfig();
    };
  }, [profile]);

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const userRef = doc(db, 'users', editingUser.userId);
      await updateDoc(userRef, {
        role: editingUser.role,
        status: editingUser.status,
        balanceUSD: Number(editingUser.balanceUSD),
        balanceBTC: Number(editingUser.balanceBTC),
      });
      setSuccessMsg(`Account of ${editingUser.email} saved successfully.`);
      setEditingUser(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${editingUser.userId}`);
      setErrorMsg('Unauthorized update blocked by database rules.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTicketReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setIsSaving(true);

    try {
      const ticketRef = doc(db, 'support_tickets', selectedTicket.id);
      const newMsg = {
        sender: 'admin' as const,
        text: replyText,
        timestamp: Date.now(),
      };
      
      const updatedMessages = [...selectedTicket.messages, newMsg];
      await updateDoc(ticketRef, {
        messages: updatedMessages,
        status: 'In Progress',
        updatedAt: new Date(),
      });

      setReplyText('');
      // update state cache directly to avoid lagging snapshots
      setSelectedTicket(prev => prev ? { ...prev, messages: updatedMessages, status: 'In Progress' } : null);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `support_tickets/${selectedTicket.id}`);
      setErrorMsg('Failed to submit ticket reply.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResolveTicket = async (ticket: SupportTicket) => {
    try {
      const ticketRef = doc(db, 'support_tickets', ticket.id);
      await updateDoc(ticketRef, {
        status: 'Resolved',
        updatedAt: new Date(),
      });
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket(prev => prev ? { ...prev, status: 'Resolved' } : null);
      }
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `support_tickets/${ticket.id}`);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const configRef = doc(db, 'system_config', 'global');
      await setDoc(configRef, {
        makerFeePercent: Number(globalConfig.makerFeePercent),
        takerFeePercent: Number(globalConfig.takerFeePercent),
        maxLeverage: Number(globalConfig.maxLeverage),
        updatedAt: new Date(),
      });
      setSuccessMsg('Global system configurations committed securely.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, 'system_config/global');
      setErrorMsg('Access denied updating global backend metrics.');
    } finally {
      setIsSaving(false);
    }
  };

  // Seed simulated entries for immediate interaction
  const handleSeedMockData = async () => {
    try {
      const batch = writeBatch(db);
      
      const dummyUsers = [
        { userId: 'adam_id', email: 'adam@cexpro.com', role: 'user', status: 'active', balanceUSD: 14500, balanceBTC: 0.125, createdAt: new Date() },
        { userId: 'sofia_id', email: 'sofia@crypto.io', role: 'user', status: 'active', balanceUSD: 247000, balanceBTC: 4.88, createdAt: new Date() },
        { userId: 'kevin_id', email: 'kevin@memecoin.net', role: 'user', status: 'suspended', balanceUSD: 120, balanceBTC: 0, createdAt: new Date() }
      ];

      dummyUsers.forEach(u => {
        batch.set(doc(db, 'users', u.userId), u);
      });

      const dummyTickets = [
        {
          ticketId: 'ticket_1',
          userId: 'sofia_id',
          userEmail: 'sofia@crypto.io',
          subject: 'Stop-limit orders execution speed too slow',
          status: 'Open',
          messages: [
            { sender: 'user', text: 'I tried buying at the dip using limit orders but it delayed. Please adjust leverage pools!', timestamp: Date.now() - 3600000 }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          ticketId: 'ticket_2',
          userId: 'adam_id',
          userEmail: 'adam@cexpro.com',
          subject: 'Pending BTC wallet credit verification',
          status: 'Resolved',
          messages: [
            { sender: 'user', text: 'Sent 0.1 BTC to secure deposit wallet but uncredited.', timestamp: Date.now() - 7200000 },
            { sender: 'admin', text: 'Your transaction has now been verified and credited on-chain. Enjoy your leverage privileges!', timestamp: Date.now() - 3600000 }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      dummyTickets.forEach(t => {
        batch.set(doc(db, 'support_tickets', t.ticketId), t);
      });

      // Seeding system configuration default if empty
      batch.set(doc(db, 'system_config', 'global'), {
        makerFeePercent: 0.05,
        takerFeePercent: 0.12,
        maxLeverage: 150
      });

      await batch.commit();
      setSuccessMsg('Active simulation dataset seeded in the database!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Error seeding dataset.');
    }
  };

  // If user is currently standard, prompt to self-promote
  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-dark-bg text-center">
        <ShieldAlert className="w-16 h-16 text-primary-500 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
        <p className="text-dark-text-muted text-sm max-w-md">
          Please log in first to check credentials and register your account session.
        </p>
      </div>
    );
  }

  if (profile.role !== 'admin') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-dark-bg text-center">
        <ShieldAlert className="w-16 h-16 text-primary-500 mb-4" />
        <h2 className="text-2xl font-black text-white mb-3">Admin Desk Access Denied</h2>
        <p className="text-dark-text-muted text-sm max-w-lg leading-relaxed mb-6">
          Your active database profile indicates a standard role (<span className="text-primary-400 font-mono">user</span>).
          To check admin functionalities, click the button below to elevate your account role directly in the database.
        </p>
        <button 
          onClick={promoteToAdmin}
          className="bg-primary-500 hover:bg-primary-600 cursor-pointer font-extrabold text-sm text-black px-6 py-3.5 rounded  transition-transform hover:scale-105 active:scale-95"
        >
          Elevate My Profile to Admin ({profile.email})
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-dark-bg text-dark-text select-none">
      
      {/* Sidebar Navigation */}
      <div className="md:w-64 border-r border-dark-border bg-dark-surface p-4 flex flex-col gap-2 shrink-0 select-none">
        <div className="pb-4 mb-4 border-b border-dark-border/60">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping"></div>
            <span className="font-bold text-xs uppercase tracking-widest text-[#10B981]">Enterprise Portal</span>
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">{profile.email}</span>
        </div>

        <button 
          onClick={() => { setActivePane('USERS'); setEditingUser(null); }}
          className={`flex items-center gap-3 px-4 py-3 rounded text-xs font-bold transition-all cursor-pointer ${activePane === 'USERS' ? 'bg-dark-surface-alt text-primary-500 font-black' : 'text-dark-text-muted hover:bg-dark-surface/50 hover:text-white'}`}
        >
          <Users className="w-4 h-4 text-primary-500" />
          <span>Users & Portfolio Balances</span>
        </button>

        <button 
          onClick={() => { setActivePane('TICKETS'); setSelectedTicket(null); }}
          className={`flex items-center gap-3 px-4 py-3 rounded text-xs font-bold transition-all cursor-pointer ${activePane === 'TICKETS' ? 'bg-dark-surface-alt text-[#00D1FF] font-black' : 'text-dark-text-muted hover:bg-dark-surface/50 hover:text-white'}`}
        >
          <Ticket className="w-4 h-4 text-[#00D1FF]" />
          <span>Support Desk ({tickets.filter(t=>t.status !== 'Resolved').length})</span>
        </button>

        <button 
          onClick={() => setActivePane('CONFIG')}
          className={`flex items-center gap-3 px-4 py-3 rounded text-xs font-bold transition-all cursor-pointer ${activePane === 'CONFIG' ? 'bg-dark-surface-alt text-amber-500 font-black' : 'text-dark-text-muted hover:bg-dark-surface/50 hover:text-white'}`}
        >
          <Settings className="w-4 h-4 text-amber-500" />
          <span>Global Fee Settings</span>
        </button>

        <div className="mt-auto pt-6 border-t border-dark-border/50">
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full flex items-center justify-center gap-2 bg-dark-bg hover:bg-dark-surface border border-dark-border/80 text-dark-text-muted hover:text-white font-bold text-[11px] py-3 rounded transition-all cursor-pointer mb-3"
          >
            <Layers className="w-4 h-4" />
            <span>Back to Platform</span>
          </button>
          
          <button 
            onClick={handleSeedMockData}
            className="w-full flex items-center justify-center gap-2 bg-dark-surface-alt/60 hover:bg-dark-surface-alt border border-dark-border/80 text-white font-bold text-[11px] py-3 rounded transition-all cursor-pointer"
            title="Populates dummy users and support questions so the platform is active with data instantly"
          >
            <PlusCircle className="w-4 h-4 text-primary-500" />
            <span>Seed Simulation Data</span>
          </button>
        </div>
      </div>

      {/* Primary Console Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 relative">
        
        {/* Alerts HUD */}
        {successMsg && (
          <div className="bg-[#10B981]/15 border border-[#10B981]/30 p-3 rounded-xl flex items-center gap-2.5 text-xs text-[#10B981] font-bold mb-4 animate-fadeIn">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2.5 text-xs text-red-500 font-bold mb-4 animate-fadeIn">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* PANE A: USER ACCOUNTS AND BALANCE CONTROLLER */}
            {activePane === 'USERS' && (() => {
              const filteredUsers = users.filter(u => 
                u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
              );
              return (
                <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
                  <div className="flex-1 flex flex-col overflow-hidden bg-dark-surface/20 border border-dark-border/40 rounded-xl">
                    <div className="p-4 border-b border-dark-border/60 bg-dark-surface/60 select-none">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">User Portfolio Directories</h3>
                      <p className="text-[11px] text-dark-text-muted mt-0.5">Database users account role and credit balances management</p>
                    </div>

                    {/* Search Bar Input Panel */}
                    <div className="p-3 border-b border-dark-border/40 bg-dark-bg/20">
                      <div className="relative flex items-center bg-dark-bg/80 border border-dark-border/60 rounded-lg px-3 py-2 focus-within:border-white transition-colors">
                        <Search className="w-4 h-4 text-dark-text-muted mr-2 shrink-0" />
                        <input 
                          type="text" 
                          placeholder="Search users by email query..." 
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="w-full bg-transparent text-xs text-white outline-none placeholder-dark-text-muted font-medium"
                        />
                        {userSearchQuery && (
                          <button 
                            onClick={() => setUserSearchQuery('')}
                            className="text-[10px] uppercase font-bold text-dark-text-muted hover:text-white transition-colors ml-2 cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-dark-border/30 custom-scroll">
                      {filteredUsers.length === 0 ? (
                        <div className="p-8 text-center text-xs text-dark-text-muted font-medium">
                          No users found matching query
                        </div>
                      ) : (
                        filteredUsers.map(u => (
                          <div 
                            key={u.id}
                            onClick={() => setEditingUser(u)}
                            className={`p-4 flex justify-between items-center hover:bg-dark-surface/20 transition-colors cursor-pointer ${editingUser?.userId === u.userId ? 'bg-dark-surface-alt/30 border-l-4 border-primary-500' : ''}`}
                          >
                            <div>
                              <div className="flex items-center gap-2.5 mb-1">
                                <span className="text-xs font-bold text-white">{u.email}</span>
                                <span className={`text-[9px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded ${u.role === 'admin' ? 'bg-primary-500/10 text-primary-500' : 'bg-dark-surface text-dark-text-muted'}`}>
                                  {u.role}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-dark-text-muted">{u.userId}</span>
                            </div>
                            <div className="text-right flex flex-col gap-0.5 font-mono text-xs font-semibold">
                              <span className="text-[#10B981]">${u.balanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</span>
                              <span className="text-primary-500">{u.balanceBTC} BTC</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Account Editor Sidecar Panel */}
                {editingUser ? (
                  <div className="w-full md:w-80 bg-dark-surface border border-dark-border p-5 rounded-xl flex flex-col gap-4 animate-slideIn">
                    <div className="flex items-center justify-between border-b border-dark-border pb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white">Adjust Account</h4>
                      <button onClick={() => setEditingUser(null)} className="text-dark-text-muted hover:text-white font-bold text-xs p-1">Close</button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-dark-text-muted uppercase mb-1">Virtual USD Balance</label>
                        <div className="bg-dark-bg rounded border border-dark-border/60 flex items-center px-2.5 h-10 group focus-within:border-white bg-dark-bg">
                          <input 
                            type="number" 
                            value={editingUser.balanceUSD}
                            onChange={(e) => setEditingUser(prev => prev ? { ...prev, balanceUSD: Number(e.target.value) } : null)}
                            className="flex-1 bg-transparent text-sm font-mono text-white outline-none font-bold" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-dark-text-muted uppercase mb-1">Virtual BTC Balance</label>
                        <div className="bg-dark-bg rounded border border-dark-border/60 flex items-center px-2.5 h-10 group focus-within:border-white bg-dark-bg">
                          <input 
                            type="number" 
                            value={editingUser.balanceBTC}
                            onChange={(e) => setEditingUser(prev => prev ? { ...prev, balanceBTC: Number(e.target.value) } : null)}
                            className="flex-1 bg-transparent text-sm font-mono text-white outline-none font-bold" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-dark-text-muted uppercase mb-1">System Role</label>
                        <select 
                          value={editingUser.role}
                          onChange={(e) => setEditingUser(prev => prev ? { ...prev, role: e.target.value as any } : null)}
                          className="w-full h-10 px-3 bg-dark-bg border border-dark-border/60 rounded text-xs text-white font-bold outline-none cursor-pointer"
                        >
                          <option value="user">User</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-dark-text-muted uppercase mb-1">Account Status</label>
                        <select 
                          value={editingUser.status}
                          onChange={(e) => setEditingUser(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                          className="w-full h-10 px-3 bg-dark-bg border border-dark-border/60 rounded text-xs text-white font-bold outline-none cursor-pointer"
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                    </div>

                    <button 
                      onClick={handleUpdateUser}
                      disabled={isSaving}
                      className="w-full bg-primary-500 hover:bg-primary-600 active:scale-95 py-3 rounded text-black font-extrabold text-xs transition-all flex items-center justify-center gap-1.5  mt-auto cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Processing...' : 'Save Configuration'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="w-full md:w-80 border border-dashed border-dark-border/50 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-dark-surface/30 select-none">
                    <Coins className="w-12 h-12 text-dark-text-muted mb-3" />
                    <span className="text-xs font-semibold text-dark-text-muted">Select any user profile from the list to modify credit balances, suspend access, or tweak permissions.</span>
                  </div>
                )}
              </div>
            )})}

            {/* PANE B: COMPREHENSIVE CUSTOMER SUPPORT DESK */}
            {activePane === 'TICKETS' && (
              <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden bg-dark-surface/20 border border-dark-border/40 rounded-xl">
                  <div className="p-4 border-b border-dark-border/60 bg-dark-surface/60 select-none">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Queries Queue</h3>
                    <p className="text-[11px] text-dark-text-muted mt-0.5">Interactive helpdesk answering user questions securely</p>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-dark-border/30 custom-scroll">
                    {tickets.map(t => (
                      <div 
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={`p-4 flex justify-between items-center hover:bg-dark-surface/20 transition-colors cursor-pointer ${selectedTicket?.id === t.id ? 'bg-dark-surface-alt/30 border-l-4 border-[#00D1FF]' : ''}`}
                      >
                        <div>
                          <span className="text-[10px] text-dark-text-muted font-mono tracking-wider font-semibold block mb-1">TICKET ID: {t.ticketId}</span>
                          <span className="text-xs font-bold text-white block mb-0.5">{t.subject}</span>
                          <span className="text-[10px] text-dark-text-muted">{t.userEmail}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded tracking-wide ${t.status === 'Resolved' ? 'bg-[#10B981]/10 text-[#10B981]' : t.status === 'In Progress' ? 'bg-[#00D1FF]/10 text-[#00D1FF]' : 'bg-amber-500/10 text-amber-500'}`}>
                            {t.status}
                          </span>
                          {t.status !== 'Resolved' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleResolveTicket(t); }}
                              className="text-xs text-[#10B981] hover:bg-[#10B981]/10 border border-[#10B981]/30 hover:border-[#10B981]/50 px-2 py-1 rounded font-semibold transition-colors font-sans cursor-pointer"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ticket Conversation Flyout */}
                {selectedTicket ? (
                  <div className="w-full md:w-96 bg-dark-surface border border-dark-border px-4 py-5 rounded-xl flex flex-col gap-3.5 animate-slideIn">
                    <div className="flex items-center justify-between border-b border-dark-border pb-3 shrink-0">
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wide text-white mb-0.5">Dialogue Desk</h4>
                        <span className="text-[10px] text-dark-text-muted">{selectedTicket.userEmail}</span>
                      </div>
                      <button onClick={() => setSelectedTicket(null)} className="text-dark-text-muted hover:text-white font-bold text-xs p-1">Close</button>
                    </div>

                    {/* Chat Logs Window */}
                    <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-dark-bg/60 border border-dark-border/50 rounded-lg custom-scroll h-48 max-h-64">
                      {selectedTicket.messages.map((m, i) => (
                        <div key={i} className={`flex flex-col gap-1 ${m.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                          <div className={`px-3 py-2 rounded text-xs max-w-[85%] leading-relaxed ${m.sender === 'admin' ? 'bg-primary-500 text-black font-semibold rounded-tr-none' : 'bg-dark-surface border border-dark-border/40 text-white rounded-tl-none'}`}>
                            {m.text}
                          </div>
                          <span className="text-[8px] text-dark-text-muted px-1">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}
                    </div>

                    {/* Chat input box */}
                    {selectedTicket.status !== 'Resolved' ? (
                      <div className="flex flex-col gap-2 shrink-0">
                        <textarea 
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type customer solution response..."
                          className="w-full h-16 p-2 bg-dark-bg border border-dark-border rounded text-xs text-white outline-none resize-none focus:border-primary-500"
                        />
                        <button 
                          onClick={handleSendTicketReply}
                          disabled={isSaving || !replyText.trim()}
                          className="w-full bg-[#00D1FF] hover:bg-[#00D1FF]/90 font-extrabold text-xs text-dark-bg py-2.5 rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Send Response</span>
                        </button>
                      </div>
                    ) : (
                      <div className="bg-[#10B981]/10 border border-[#10B981]/25 p-3 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-[#10B981] shrink-0">
                        <CheckCircle className="w-4 h-4" />
                        <span>Ticket is Resolved and closed.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full md:w-96 border border-dashed border-dark-border/50 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-dark-surface/30 select-none">
                    <MessageSquare className="w-12 h-12 text-dark-text-muted mb-3" />
                    <span className="text-xs font-semibold text-dark-text-muted">Select any active query ticket from the queue to view customer questions, converse, and close issues.</span>
                  </div>
                )}
              </div>
            )}

            {/* PANE C: GLOBAL SYSTEM PARAMETERS CONFIG */}
            {activePane === 'CONFIG' && (
              <div className="flex-1 max-w-xl mx-auto w-full bg-dark-surface/40 border border-dark-border/60 rounded-xl p-6 flex flex-col gap-5 animate-slideIn">
                <div className="border-b border-dark-border/80 pb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Settings className="w-4 h-4 text-amber-500" />
                    <span>Global Fee Configuration</span>
                  </h3>
                  <p className="text-[11px] text-dark-text-muted mt-1 leading-relaxed">System-wide parameters saved securely inside Firestore collection config</p>
                </div>

                <div className="space-y-4 font-sans text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-dark-text-muted uppercase">Maker Fee Percent (%)</label>
                    <div className="bg-dark-surface rounded border border-dark-border flex items-center px-3 h-10 bg-dark-bg">
                      <input 
                        type="number" 
                        value={globalConfig.makerFeePercent}
                        onChange={(e) => setGlobalConfig(prev => ({ ...prev, makerFeePercent: Number(e.target.value) }))}
                        className="flex-1 bg-transparent text-sm font-mono text-white outline-none font-bold" 
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-dark-text-muted uppercase">Taker Fee Percent (%)</label>
                    <div className="bg-dark-surface rounded border border-dark-border flex items-center px-3 h-10 bg-dark-bg">
                      <input 
                        type="number" 
                        value={globalConfig.takerFeePercent}
                        onChange={(e) => setGlobalConfig(prev => ({ ...prev, takerFeePercent: Number(e.target.value) }))}
                        className="flex-1 bg-transparent text-sm font-mono text-white outline-none font-bold" 
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-dark-text-muted uppercase">Maximum Available Leverage (X)</label>
                    <div className="bg-dark-surface rounded border border-dark-border flex items-center px-3 h-10 bg-dark-bg">
                      <input 
                        type="number" 
                        value={globalConfig.maxLeverage}
                        onChange={(e) => setGlobalConfig(prev => ({ ...prev, maxLeverage: Number(e.target.value) }))}
                        className="flex-1 bg-transparent text-sm font-mono text-white outline-none font-bold" 
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="bg-amber-600 hover:bg-amber-700 active:scale-95 py-3 rounded text-white font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 mt-4 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving Configurations...' : 'Commit System configurations'}</span>
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
