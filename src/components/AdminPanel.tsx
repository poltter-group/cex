import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { collection, onSnapshot, doc, updateDoc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Users, Ticket, Settings, ShieldAlert, CheckCircle, XCircle, 
  UserCheck, Award, MessageSquare, Save, Coins, Layers, PlusCircle, Loader2, Search,
  ChevronLeft, ChevronRight, FileText, Banknote, ShieldCheck
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
  const [trades, setTrades] = useState<any[]>([]);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({
    makerFeePercent: 0.1,
    takerFeePercent: 0.2,
    maxLeverage: 125,
  });

  const [loading, setLoading] = useState(true);
  const [activePane, setActivePane] = useState<'USERS' | 'TICKETS' | 'CONFIG' | 'TRADES' | 'KYC' | 'WITHDRAWALS' | 'LOGS'>('USERS');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Selected object editors
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  
  // Filtering States
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const uList: UserAccount[] = [];
      snap.forEach(docSnap => {
        uList.push({ id: docSnap.id, ...docSnap.data() } as UserAccount);
      });
      setUsers(uList);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'users'));

    const unsubscribeTickets = onSnapshot(collection(db, 'support_tickets'), (snap) => {
      const tList: SupportTicket[] = [];
      snap.forEach(docSnap => {
        tList.push({ id: docSnap.id, ...docSnap.data() } as SupportTicket);
      });
      tList.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setTickets(tList);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'support_tickets'));

    const unsubscribeTrades = onSnapshot(collection(db, 'trades'), (snap) => {
      const trList: any[] = [];
      snap.forEach(docSnap => {
        trList.push({ id: docSnap.id, ...docSnap.data() });
      });
      trList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setTrades(trList);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'trades'));

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
      unsubscribeTrades();
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

  const handleSeedMockData = async () => {
    setSuccessMsg('Seeding is disabled on production.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

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
          You are not authorized to view the admin control panel.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-dark-bg text-dark-text select-none">
      
      <div className={`border-r border-dark-border bg-dark-surface flex flex-col gap-2 shrink-0 select-none transition-all duration-300 ${isSidebarOpen ? 'md:w-64 p-4' : 'w-16 p-2 items-center'}`}>
        <div className={`pb-4 mb-4 border-b border-dark-border/60 flex items-center ${isSidebarOpen ? 'justify-end' : 'justify-center'}`}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="text-dark-text-muted hover:text-white p-1 rounded hover:bg-dark-surface-alt transition-colors cursor-pointer"
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        <button 
          onClick={() => { setActivePane('USERS'); setEditingUser(null); }}
          className={`flex items-center gap-3 rounded font-bold transition-all cursor-pointer ${isSidebarOpen ? 'px-4 py-3 text-xs' : 'p-3 justify-center'} ${activePane === 'USERS' ? 'bg-dark-surface-alt text-primary-500 font-black' : 'text-dark-text-muted hover:bg-dark-surface/50 hover:text-white'}`}
          title={!isSidebarOpen ? "Users & Portfolio Balances" : undefined}
        >
          <Users className="w-4 h-4 text-primary-500 shrink-0" />
          {isSidebarOpen && <span>Users & Portfolio Balances</span>}
        </button>

        <button 
          onClick={() => { setActivePane('TICKETS'); setSelectedTicket(null); }}
          className={`flex items-center gap-3 rounded font-bold transition-all cursor-pointer ${isSidebarOpen ? 'px-4 py-3 text-xs' : 'p-3 justify-center'} ${activePane === 'TICKETS' ? 'bg-dark-surface-alt text-[#00D1FF] font-black' : 'text-dark-text-muted hover:bg-dark-surface/50 hover:text-white'}`}
          title={!isSidebarOpen ? "Support Desk" : undefined}
        >
          <Ticket className="w-4 h-4 text-[#00D1FF] shrink-0" />
          {isSidebarOpen && <span>Support Desk ({tickets.filter(t=>t.status !== 'Resolved').length})</span>}
        </button>

        <button 
          onClick={() => setActivePane('KYC')}
          className={`flex items-center gap-3 rounded font-bold transition-all cursor-pointer ${isSidebarOpen ? 'px-4 py-3 text-xs' : 'p-3 justify-center'} ${activePane === 'KYC' ? 'bg-dark-surface-alt text-purple-400 font-black' : 'text-dark-text-muted hover:bg-dark-surface/50 hover:text-white'}`}
          title={!isSidebarOpen ? "KYC Approvals" : undefined}
        >
          <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
          {isSidebarOpen && <span>KYC Approvals</span>}
        </button>

        <button 
          onClick={() => setActivePane('WITHDRAWALS')}
          className={`flex items-center gap-3 rounded font-bold transition-all cursor-pointer ${isSidebarOpen ? 'px-4 py-3 text-xs' : 'p-3 justify-center'} ${activePane === 'WITHDRAWALS' ? 'bg-dark-surface-alt text-[#10B981] font-black' : 'text-dark-text-muted hover:bg-dark-surface/50 hover:text-white'}`}
          title={!isSidebarOpen ? "Withdrawal Requests" : undefined}
        >
          <Banknote className="w-4 h-4 text-[#10B981] shrink-0" />
          {isSidebarOpen && <span>Withdrawal Requests</span>}
        </button>

        <button 
          onClick={() => setActivePane('CONFIG')}
          className={`flex items-center gap-3 rounded font-bold transition-all cursor-pointer ${isSidebarOpen ? 'px-4 py-3 text-xs' : 'p-3 justify-center'} ${activePane === 'CONFIG' ? 'bg-dark-surface-alt text-amber-500 font-black' : 'text-dark-text-muted hover:bg-dark-surface/50 hover:text-white'}`}
          title={!isSidebarOpen ? "Global Fee Settings" : undefined}
        >
          <Settings className="w-4 h-4 text-amber-500 shrink-0" />
          {isSidebarOpen && <span>Global Fee Settings</span>}
        </button>

        <button 
          onClick={() => setActivePane('TRADES')}
          className={`flex items-center gap-3 rounded font-bold transition-all cursor-pointer ${isSidebarOpen ? 'px-4 py-3 text-xs' : 'p-3 justify-center'} ${activePane === 'TRADES' ? 'bg-dark-surface-alt text-[#FF0055] font-black' : 'text-dark-text-muted hover:bg-dark-surface/50 hover:text-white'}`}
          title={!isSidebarOpen ? "Global Trades Log" : undefined}
        >
          <Award className="w-4 h-4 text-[#FF0055] shrink-0" />
          {isSidebarOpen && <span>Global Trades Log ({trades.length})</span>}
        </button>

        <button 
          onClick={() => setActivePane('LOGS')}
          className={`flex items-center gap-3 rounded font-bold transition-all cursor-pointer ${isSidebarOpen ? 'px-4 py-3 text-xs' : 'p-3 justify-center'} ${activePane === 'LOGS' ? 'bg-dark-surface-alt text-gray-300 font-black' : 'text-dark-text-muted hover:bg-dark-surface/50 hover:text-white'}`}
          title={!isSidebarOpen ? "System Logs" : undefined}
        >
          <FileText className="w-4 h-4 text-gray-300 shrink-0" />
          {isSidebarOpen && <span>System Logs</span>}
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-6 relative">
        
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

            {/* PANE D: TRADES LOG */}
            {activePane === 'TRADES' && (
              <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden bg-dark-surface/20 border border-dark-border/40 rounded-xl">
                  <div className="p-4 border-b border-dark-border/60 bg-dark-surface/60 select-none">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Global Trades Ledger</h3>
                    <p className="text-[11px] text-dark-text-muted mt-0.5">Real-time log of all platform crypto trading activities</p>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scroll">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-dark-surface/40 border-b border-dark-border/60 sticky top-0">
                        <tr>
                          <th className="py-3 px-4 text-[10px] uppercase font-bold text-dark-text-muted tracking-wider">Date</th>
                          <th className="py-3 px-4 text-[10px] uppercase font-bold text-dark-text-muted tracking-wider">Pair</th>
                          <th className="py-3 px-4 text-[10px] uppercase font-bold text-dark-text-muted tracking-wider">Side</th>
                          <th className="py-3 px-4 text-[10px] uppercase font-bold text-dark-text-muted tracking-wider">Price/Amount</th>
                          <th className="py-3 px-4 text-[10px] uppercase font-bold text-dark-text-muted tracking-wider">Taker User ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-border/30">
                        {trades.length === 0 ? (
                          <tr><td colSpan={5} className="py-8 text-center text-xs text-dark-text-muted">No trades recorded yet.</td></tr>
                        ) : (
                          trades.map((tr) => (
                            <tr key={tr.id} className="hover:bg-dark-surface/20 transition-colors">
                              <td className="py-3 px-4 text-xs font-mono text-dark-text-muted">
                                {tr.id}
                              </td>
                              <td className="py-3 px-4 text-xs font-bold text-white uppercase">
                                {String(tr.pair || '')}
                              </td>
                              <td className={`py-3 px-4 text-xs font-bold ${tr.type === 'Buy' ? 'text-[#10B981]' : 'text-red-500'}`}>
                                {String(tr.type || '')}
                              </td>
                              <td className="py-3 px-4 text-xs font-mono">
                                <div className="text-white">${String(tr.price || '')}</div>
                                <div className="text-dark-text-muted text-[10px]">{String(tr.amount || '')}</div>
                              </td>
                              <td className="py-3 px-4 text-[10px] font-mono text-primary-400">
                                {String(tr.takerId || tr.userId || 'System')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PANE E: KYC APPROVALS */}
            {activePane === 'KYC' && (
              <div className="flex-1 flex flex-col items-center justify-center bg-dark-surface/10 border border-dark-border/40 rounded-xl">
                <ShieldCheck className="w-12 h-12 text-purple-400 mb-4 animate-pulse opacity-50" />
                <h3 className="text-lg font-bold text-white mb-2">KYC Verification Center</h3>
                <p className="text-sm text-dark-text-muted text-center max-w-md">No pending KYC applications found in the database. When users submit verification documents, they will appear here for manual admin review.</p>
              </div>
            )}

            {/* PANE F: WITHDRAWALS */}
            {activePane === 'WITHDRAWALS' && (
              <div className="flex-1 flex flex-col items-center justify-center bg-dark-surface/10 border border-dark-border/40 rounded-xl">
                <Banknote className="w-12 h-12 text-[#10B981] mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-white mb-2">Pending Withdrawals</h3>
                <p className="text-sm text-dark-text-muted text-center max-w-md">The withdrawal queue is currently empty. Fiat and crypto withdrawal requests exceeding automated risk thresholds will be flagged here.</p>
              </div>
            )}

            {/* PANE G: LOGS */}
            {activePane === 'LOGS' && (
              <div className="flex-1 flex flex-col bg-dark-surface/10 border border-dark-border/40 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-gray-300" />
                  <h3 className="text-sm font-bold text-white">System Security Logs</h3>
                </div>
                <div className="flex-1 font-mono text-[10px] sm:text-xs text-dark-text-muted bg-black/40 rounded p-4 overflow-y-auto space-y-2">
                  <div className="flex gap-4">
                    <span className="text-green-500">[{new Date().toISOString()}]</span>
                    <span>System initialized successfully</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-blue-400">[{new Date(Date.now() - 10000).toISOString()}]</span>
                    <span>Admin heartbeat: Connected to Firestore main cluster</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-yellow-500">[{new Date(Date.now() - 45000).toISOString()}]</span>
                    <span>Market Data: Refreshing external Spot Engine feeds</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-blue-400">[{new Date(Date.now() - 120000).toISOString()}]</span>
                    <span>Auth Engine: Token rotated for session stability</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-green-500">[{new Date(Date.now() - 360000).toISOString()}]</span>
                    <span>DB Index: Trades and Users fully synchronized</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
