import React from 'react';
import { Facebook, Twitter, Instagram, Youtube, Send, Github, Globe, Shield, CreditCard, HelpCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';

interface FooterProps {
  setCurrentView?: (v: any) => void;
}

export function Footer({ setCurrentView }: FooterProps) {
  const { setWeb3ModalOpen } = useAuth();
  const handleLinkClick = (view: any) => {
    if (setCurrentView) {
      setCurrentView(view);
    }
  };

  return (
    <footer className="w-full bg-[#0b0c0e]/80 backdrop-blur-md border-t border-dark-border py-16 px-6 md:px-12 z-50 mt-auto shrink-0 relative overflow-hidden">
      
      {/* Decorative subtle border light */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary-500/10 to-transparent" />
      
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        
        {/* Brand Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2.5 cursor-pointer max-w-fit" onClick={() => handleLinkClick('HOME')}>
            <div className="w-7 h-7 bg-primary-500 rounded flex items-center justify-center font-black text-black text-xs font-sans tracking-tight">C</div>
            <span className="text-lg font-black tracking-tighter text-white">CEX<span className="text-primary-500">PRO</span></span>
          </div>
          <p className="text-xs text-dark-text-muted leading-relaxed max-w-sm font-sans">
            The world's leading cryptocurrency exchange. Buy, sell, and trade forex spot, memecoins, and primary digital assets with institutional-grade latency and deep liquidity.
          </p>
          <div className="flex items-center gap-4 pt-2">
            <Twitter className="w-4 h-4 text-dark-text-muted hover:text-white cursor-pointer transition-colors" />
            <TelegramIcon />
            <Youtube className="w-4 h-4 text-dark-text-muted hover:text-white cursor-pointer transition-colors" />
            <Instagram className="w-4 h-4 text-dark-text-muted hover:text-white cursor-pointer transition-colors" />
            <Github className="w-4 h-4 text-dark-text-muted hover:text-white cursor-pointer transition-colors" />
          </div>
        </div>

        {/* Links Column 1: About */}
        <div className="space-y-4">
          <h4 className="text-white font-bold font-mono uppercase tracking-wider text-[11px] text-primary-500">Company</h4>
          <ul className="space-y-2.5 shrink-0">
            <li><button onClick={() => handleLinkClick('ABOUT')} className="text-xs text-dark-text-muted hover:text-white transition-colors cursor-pointer text-left">About Cexpro</button></li>
            <li><button onClick={() => handleLinkClick('CONTACT')} className="text-xs text-dark-text-muted hover:text-white transition-colors cursor-pointer text-left">Contact Desk</button></li>
            <li><button className="text-xs text-dark-text-muted hover:text-white transition-colors cursor-pointer text-left">Press Releases</button></li>
            <li><button className="text-xs text-dark-text-muted hover:text-white transition-colors cursor-pointer text-left">Legal Operations</button></li>
            <li><button onClick={() => handleLinkClick('TERMS')} className="text-xs text-dark-text-muted hover:text-white transition-colors cursor-pointer text-left">Terms & Protocols</button></li>
            <li><button onClick={() => handleLinkClick('PRIVACY')} className="text-xs text-dark-text-muted hover:text-white transition-colors cursor-pointer text-left">Privacy Policy</button></li>
          </ul>
        </div>

        {/* Links Column 2: Products */}
        <div className="space-y-4">
          <h4 className="text-white font-bold font-mono uppercase tracking-wider text-[11px] text-primary-500 font-sans">Ecosystem</h4>
          <ul className="space-y-2.5 shrink-0">
            <li><button onClick={() => handleLinkClick('SPOT')} className="text-xs text-dark-text-muted hover:text-white transition-colors cursor-pointer text-left">Trade Spot</button></li>
            <li><button className="text-xs text-dark-text-muted hover:text-white transition-colors cursor-pointer text-left">Meme Liquidity</button></li>
            <li><button onClick={() => handleLinkClick('COPY_TRADING')} className="text-xs text-dark-text-muted hover:text-white transition-colors cursor-pointer text-left">Certified Copy Trading</button></li>
            <li><button className="text-xs text-dark-text-muted hover:text-white transition-colors cursor-pointer text-left">Earn Protocols</button></li>
            <li><button onClick={() => setWeb3ModalOpen(true)} className="text-xs text-dark-text-muted hover:text-white transition-colors cursor-pointer text-left">Integrated Web3 Wallet</button></li>
            <li><button className="text-xs text-dark-text-muted hover:text-white transition-colors cursor-pointer text-left">Institutional Liquidity</button></li>
          </ul>
        </div>

        {/* Links Column 3: Service */}
        <div className="space-y-4">
          <h4 className="text-white font-bold font-mono uppercase tracking-wider text-[11px] text-primary-500">Global Hub</h4>
          <ul className="space-y-2.5 shrink-0">
            <li><button onClick={() => handleLinkClick('SUPPORT')} className="text-xs text-dark-text-muted hover:text-white transition-colors flex items-center gap-2 cursor-pointer text-left"><HelpCircle className="w-3.5 h-3.5"/> Help Center 24/7</button></li>
            <li><button onClick={() => handleLinkClick('FEES')} className="text-xs text-dark-text-muted hover:text-white transition-colors flex items-center gap-2 cursor-pointer text-left"><CreditCard className="w-3.5 h-3.5"/> Fees & Rebates</button></li>
            <li><button onClick={() => handleLinkClick('AML')} className="text-xs text-dark-text-muted hover:text-white transition-colors flex items-center gap-2 cursor-pointer text-left"><Shield className="w-3.5 h-3.5"/> AML & Counter-Fraud</button></li>
            <li><button onClick={() => handleLinkClick('RISK')} className="text-xs text-dark-text-muted hover:text-white transition-colors cursor-pointer text-left">Risk Assessment</button></li>
            <li><button className="text-xs text-dark-text-muted hover:text-white transition-colors cursor-pointer text-left">Partner Affiliations</button></li>
          </ul>
        </div>

      </div>
      
      <div className="max-w-[1400px] mx-auto mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[10px] text-dark-text-muted font-mono uppercase font-bold tracking-widest">
          &copy; {new Date().getFullYear()} CEXPRO Global. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-xs text-dark-text-muted cursor-pointer hover:text-white transition-colors font-mono">
          <Globe className="w-4 h-4" />
          <span className="text-[10px] uppercase font-semibold">Node Status: Secure / USD</span>
        </div>
      </div>
    </footer>
  );
}

function TelegramIcon() {
  return <Send className="w-5 h-5 text-dark-text-muted hover:text-white cursor-pointer transition-colors" />;
}
