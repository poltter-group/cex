import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, MessageSquare, ShieldCheck, HelpCircle, ArrowRight, PhoneCall, 
  Check, FileQuestion, BookOpen, AlertCircle, HeadphonesIcon, LifeBuoy
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

const FAQ_SECTIONS = [
  {
    title: "Spot and Order Book Executions",
    qas: [
      { q: "How do I place an instant market order?", a: "Go to the Spot Trading tab, select 'Market', enter your USDC/USD investment amount, and click Buy. Market orders execute instantly against the top level of the public order book." },
      { q: "What is the difference between Limit and Market orders?", a: "Limit orders allow you to define a specific target purchase or sale price; the buy/sell is only filled when prices reach this threshold. Market orders execute instantly at current average matching market rates." },
      { q: "How are trading commissions calculated?", a: "To make trading fully accessible, CEXPRO charges a basic maker/taker fee of only 0.1% of executed volumes. VIP tiers can lower this to 0.02% by maintaining staking deposits." }
    ]
  },
  {
    title: "Secure Deposits and On-chain Verification",
    qas: [
      { q: "How long do cryptographic deposits take to sweep?", a: "Deposits are auto-detected by CEXPRO nodes. Depending on network congestion, Bitcoin Native sweeps confirm in 3 blocks (~25 mins), TRC20/BEP20 sweeps confirm in 12 blocks (~3 mins)." },
      { q: "What should I do if I sent coins to the wrong protocol network?", a: "On-chain deposits sent to incorrect networks (e.g. BTC native to an ERC20 address) cannot be auto-released by our ledger. Contact technicians with your TxID to initiate manual asset mapping." }
    ]
  },
  {
    title: "Security and Profile Configurations",
    qas: [
      { q: "How do I toggle Google 2-Factor Authentication?", a: "Open your custom User Profile, select the Security tab, and copy the cryptographic authenticator secret key. This secures all withdrawals and checkout pathways." },
      { q: "How can I generate and restrict private API keys?", a: "Go to Profile > API Management and click Create API Key. Use checkboxes to assign read-only or spot trade execution rights depending on security requirements." }
    ]
  }
];

export function Support() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeFaqSection, setActiveFaqSection] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-1',
          sender: 'bot',
          text: `Hi ${user?.email ? user.email.split('@')[0] : 'there'}! 👋 Welcome to CEXPRO Unified Live Support.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        {
          id: 'welcome-2',
          sender: 'bot',
          text: "I am your Spot Liquidity and Security specialist. I can assist with deposits, 2FA queries, API keys, trading pairs, or support tickets. How can I help you today?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputText.trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      let botResponseText = "";
      const queryLower = query.toLowerCase();

      if (queryLower.includes('meme') || queryLower.includes('banana') || queryLower.includes('kevin')) {
        botResponseText = "CEXPRO features trending community memecoins such as $BANANA or KEVIN in our Spot and Onchain dashboards! Access the 'Markets' tab and view 'Onchain' tokens to trade them instantly with 0% maker promotional fees.";
      } else if (queryLower.includes('deposit') || queryLower.includes('withdraw') || queryLower.includes('wallet') || queryLower.includes('balance') || queryLower.includes('sweep')) {
        botResponseText = "On-chain deposits and withdrawals can be initiated natively from the new 'Wallet' page, now accessible in the top navigation bar. You can generate custom ERC20/TRC20 deposit addresses QR Codes, process deposits, or validate withdrawal addresses instantly.";
      } else if (queryLower.includes('buy') || queryLower.includes('sell') || queryLower.includes('order') || queryLower.includes('spot')) {
        botResponseText = "Buying or selling custom assets is managed entirely inside the 'Trade' view. Standard Limit & Market orders are matched instantly. Account balances are updated in Firestore automatically.";
      } else if (queryLower.includes('security') || queryLower.includes('2fa') || queryLower.includes('otp')) {
        botResponseText = "To protect your assets from unauthorized withdrawals, please configure and activate 2-Factor Authentication under your user 'Profile' settings tab. You can safely bind standard Google Authy codes.";
      } else if (queryLower.includes('api') || queryLower.includes('key')) {
        botResponseText = "To deploy third-party software, configure secret read-only API credentials under Profile > API Management and click Create API Key.";
      } else {
        botResponseText = "I’ve marked down your question. As your dedicated support technician, I recommend reviewing the corresponding FAQ panels on the left-hand side of your dashboard or testing asset balances under your secure Wallet page!";
      }

      setMessages(prev => [...prev, {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 overflow-y-auto bg-dark-bg text-dark-text pb-12 w-full select-none"
    >
      <div className="w-full p-4 md:p-6 lg:p-8 flex flex-col gap-8">
        
        {/* Banner header spacing out wide, not centered */}
        <div className="flex flex-col md:flex-row justify-end items-start md:items-center bg-dark-surface border border-dark-border/60 rounded-xl p-6 gap-6">
          <div className="flex items-center gap-3 bg-dark-bg/40 border border-dark-border/20 px-4 py-2 rounded">
            <span className="w-2.5 h-2.5 bg-[#10B981] rounded-full animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-white uppercase">Average Dispatch time: 1.5 mins</span>
          </div>
        </div>

        {/* Splitting the space: left column FAQ, right column active helpdesk chat */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Column A: FAQ Directory (7 columns width, exploits negative space) */}
          <div className="lg:col-span-7 flex flex-col gap-5 text-left">
            <div className="bg-dark-surface border border-dark-border/80 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-primary-500">
                <HelpCircle className="w-4.5 h-4.5" />
                <h3 className="font-extrabold text-xs uppercase tracking-widest text-white">Interactive Help Directory</h3>
              </div>
              <p className="text-xs text-dark-text-muted leading-relaxed">
                Browse official instructions on secure asset withdrawals, transaction logs confirmation, copy trades, order execution algorithms, and API integrations.
              </p>
            </div>

            {/* Section selection pills */}
            <div className="flex flex-wrap gap-2">
              {FAQ_SECTIONS.map((sec, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveFaqSection(idx)}
                  className={`px-4 py-2 text-[10px] font-bold uppercase rounded border transition-all cursor-pointer ${
                    activeFaqSection === idx 
                      ? 'bg-primary-500 border-primary-500 text-black  shadow-primary-500/15 font-black' 
                      : 'bg-dark-surface border-dark-border text-dark-text-muted hover:text-white'
                  }`}
                >
                  {sec.title}
                </button>
              ))}
            </div>

            {/* QA Sections */}
            <div className="space-y-3.5">
              {FAQ_SECTIONS[activeFaqSection].qas.map((qa, i) => (
                <div key={i} className="bg-dark-surface border border-dark-border/45 rounded-xl p-5 hover:border-dark-border transition-colors">
                  <div className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-md bg-white/5 border border-dark-border text-[9px] font-black text-white flex items-center justify-center shrink-0 mt-0.5">Q</span>
                    <div>
                      <h4 className="font-bold text-xs text-white leading-snug">{qa.q}</h4>
                      <div className="flex gap-3 items-start mt-3.5">
                        <span className="w-5 h-5 rounded-md bg-primary-500/10 text-primary-500 text-[9px] font-black flex items-center justify-center shrink-0">A</span>
                        <p className="text-xs text-dark-text-muted leading-relaxed font-medium">{qa.a}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column B: Live Virtual Support Terminal (5 columns width) */}
          <div className="lg:col-span-5 bg-dark-surface border border-dark-border/80 rounded-xl flex flex-col h-[560px] overflow-hidden">
            {/* Live technician header */}
            <div className="bg-dark-surface/40 border-b border-dark-border/60 px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500">
                    <HeadphonesIcon className="w-5 h-5 animate-pulse" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#10B981] border-2 border-[#111113] rounded-full" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-white">Live Assist Agent</h4>
                  <p className="text-[10px] text-dark-text-muted mt-0.5 flex items-center gap-1">
                    <span>Active Security Specialist</span>
                  </p>
                </div>
              </div>
              <span className="text-[8px] font-mono font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/15 px-2 py-0.5 rounded uppercase leading-none tracking-wider">
                Stable SSL
              </span>
            </div>

            {/* Message window */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scroll flex flex-col">
              {messages.map((m) => {
                const isBot = m.sender === 'bot';
                return (
                  <div key={m.id} className={`flex gap-2.5 max-w-[85%] ${isBot ? 'self-start text-left' : 'self-end flex-row-reverse text-right'}`}>
                    {isBot && (
                      <div className="w-7 h-7 rounded-full bg-primary-500/10 border border-primary-500/10 flex items-center justify-center text-primary-500 shrink-0 text-[10px] font-bold">
                        AI
                      </div>
                    )}
                    <div>
                      <div className={`p-3 rounded-xl text-xs leading-relaxed break-words whitespace-pre-wrap ${
                        isBot 
                          ? 'bg-[#18181c] border border-dark-border text-white rounded-tl-none shadow' 
                          : 'bg-primary-500 text-black font-semibold rounded-tr-none'
                      }`}>
                        {m.text}
                      </div>
                      <span className="text-[8px] text-dark-text-muted font-mono mt-1 block px-1">
                        {m.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex gap-2.5 self-start items-center">
                  <div className="w-7 h-7 rounded-full bg-primary-500/10 border border-primary-500/10 flex items-center justify-center text-primary-500 shrink-0 text-[10px] font-bold">
                    AI
                  </div>
                  <div className="bg-[#18181c] border border-dark-border p-3 rounded-xl rounded-tl-none flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-dark-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-dark-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-dark-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-dark-border/80 bg-dark-surface/10 flex gap-2 shrink-0">
              <input 
                type="text"
                required
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message technician on deposit errors, 2FA, Spot keys..."
                className="flex-1 bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-xs text-white placeholder-dark-text-muted outline-none focus:border-white transition-all focus:ring-1 focus:ring-white/5"
              />
              <button 
                type="submit"
                className="bg-primary-500 hover:bg-primary-600 text-black p-3 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-all shadow shadow-primary-500/20 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

      </div>
    </motion.div>
  );
}
