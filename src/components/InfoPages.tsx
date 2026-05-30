import React from 'react';
import { motion } from 'motion/react';
import { Shield, FileText, Scale, Coins, AlertTriangle, Phone, Activity } from 'lucide-react';

interface InfoPageProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const InfoPage = ({ title, icon, children }: InfoPageProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 p-8 overflow-y-auto w-full max-w-4xl mx-auto custom-scroll"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="text-primary-500 bg-primary-500/10 p-3 rounded-xl border border-primary-500/20">
          {icon}
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
      </div>
      <div className="prose prose-invert max-w-none space-y-6 text-dark-text-muted">
        {children}
      </div>
    </motion.div>
  );
};

export const AboutPage = () => (
  <InfoPage title="About CEXPRO" icon={<Shield className="w-8 h-8" />}>
    <section>
      <h2 className="text-xl font-bold text-white mb-4">Our Mission</h2>
      <p>To provide a secure, transparent, and efficient ecosystem for digital asset trading. We believe in the power of decentralization and are committed to building the infrastructure for the future of finance.</p>
    </section>
    <section>
      <h2 className="text-xl font-bold text-white mb-4">Global Reach</h2>
      <p>Serving over 300 million users worldwide, CEXPRO operates with strict compliance and cryptographic security protocols to ensure your assets are always protected.</p>
    </section>
  </InfoPage>
);

export const FeesPage = () => (
  <InfoPage title="Fees Schedule" icon={<Coins className="w-8 h-8" />}>
    <p>CEXPRO maintains a transparent and competitive fee structure for all our services. All pairs trade on our unified SPOT engine with fixed, low fees.</p>
    <div className="flex flex-col mt-8 border border-dark-border rounded-xl">
      <div className="grid grid-cols-3 bg-dark-surface text-white text-sm font-bold">
        <div className="p-4 border-b border-dark-border">User Level</div>
        <div className="p-4 border-b border-dark-border">Maker Fee</div>
        <div className="p-4 border-b border-dark-border">Taker Fee</div>
      </div>
      <div className="flex flex-col text-sm">
        <div className="grid grid-cols-3 hover:bg-dark-surface/50 transition-colors">
          <div className="p-4 border-b border-dark-border">VIP 0</div>
          <div className="p-4 border-b border-dark-border">0.1000%</div>
          <div className="p-4 border-b border-dark-border">0.1000%</div>
        </div>
        <div className="grid grid-cols-3 hover:bg-dark-surface/50 transition-colors">
          <div className="p-4 border-b border-dark-border">VIP 1</div>
          <div className="p-4 border-b border-dark-border">0.0900%</div>
          <div className="p-4 border-b border-dark-border">0.1000%</div>
        </div>
        <div className="grid grid-cols-3 hover:bg-dark-surface/50 transition-colors bg-primary-500/5">
          <div className="p-4 border-dark-border text-primary-500 font-bold">Using CXP Token</div>
          <div className="p-4 border-dark-border text-primary-500">-25% Discount</div>
          <div className="p-4 border-dark-border text-primary-500">-25% Discount</div>
        </div>
      </div>
    </div>
  </InfoPage>
);

export const TermsPage = () => (
  <InfoPage title="Terms of Service" icon={<Scale className="w-8 h-8" />}>
    <p className="text-xs italic">Last updated: May 22, 2026</p>
    <section>
      <h2 className="text-white font-bold mb-2">1. Agreement to Terms</h2>
      <p>By accessing or using CEXPRO, you agree to be bound by these Terms of Service. If you do not agree, you must not use our platform.</p>
    </section>
    <section>
      <h2 className="text-white font-bold mb-2">2. Spot Trading Logic</h2>
      <p>All assets (Crypto, Memecoins, Forex, Commodities) act as direct spot transactions. CEXPRO strictly forbids margin/leverage. Assets you buy belong uniquely and wholly to you.</p>
    </section>
  </InfoPage>
);

export const PrivacyPage = () => (
  <InfoPage title="Privacy Policy" icon={<FileText className="w-8 h-8" />}>
    <p>At CEXPRO, your privacy is our priority. This policy explains how we collect, use, and protect your data.</p>
    <section>
      <h2 className="text-white font-bold mb-2">Information We Collect</h2>
      <p>We collect personal information such as name, email, and verification documents to comply with KYC/AML regulations.</p>
    </section>
    <section>
      <h2 className="text-white font-bold mb-2">Data Security</h2>
      <p>We use industry-standard encryption and security measures to protect your information from unauthorized access.</p>
    </section>
  </InfoPage>
);

export const RiskPage = () => (
  <InfoPage title="Risk Warning" icon={<AlertTriangle className="w-8 h-8" />}>
    <section>
      <h2 className="text-white font-bold mb-2">Market Volatility</h2>
      <p>Digital currencies and exotic assets (like Memecoins) are highly susceptible to market manipulation, severe volatility, and low liquidity. Prices can fluctuate wildly over a few minutes. You should only invest what you are prepared to lose entirely.</p>
    </section>
    <section>
      <h2 className="text-white font-bold mb-2">Spot Assets vs Margin</h2>
      <p>All markets on CEXPRO execute on a Spot basis. You do not trade on margin. While you cannot lose more than your initial principal via liquidations, the principal can still decline to near-zero intrinsic value.</p>
    </section>
  </InfoPage>
);

export const ContactPage = () => (
  <InfoPage title="Contact Us" icon={<Phone className="w-8 h-8" />}>
    <section>
      <p>Need support? Our 24/7 technical and trading desk is ready to help you with your account, transfers, or any platform issues.</p>
      <div className="mt-6 flex flex-col gap-4">
        <div className="bg-dark-surface border border-dark-border p-4 rounded-xl">
          <h3 className="font-bold text-white">General Support</h3>
          <p className="text-sm font-mono mt-2">support@cexpro.com</p>
        </div>
        <div className="bg-dark-surface border border-dark-border p-4 rounded-xl">
          <h3 className="font-bold text-white">VIP Desk</h3>
          <p className="text-sm font-mono mt-2">vip@cexpro.com</p>
        </div>
      </div>
    </section>
  </InfoPage>
);

export const AmlPage = () => (
  <InfoPage title="AML & KYC Policy" icon={<Activity className="w-8 h-8" />}>
    <section>
      <h2 className="text-white font-bold mb-2">Anti-Money Laundering Framework</h2>
      <p>CEXPRO maintains a rigorous Anti-Money Laundering (AML) framework. We employ real-time blockchain monitoring via Chainalysis to ensure funds deposited on the platform are not tied to illicit activities.</p>
    </section>
    <section>
      <h2 className="text-white font-bold mb-2">Know Your Customer (KYC)</h2>
      <p>To use our spot markets entirely, users must provide national ID verification, facial recognition scans via Sumsub, and a registered local address. Accounts without KYC are strictly isolated.</p>
    </section>
  </InfoPage>
);
