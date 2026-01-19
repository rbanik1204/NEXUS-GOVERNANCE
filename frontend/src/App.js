import React, { useState, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import Header from './components/Header';
import Hero from './components/Hero';
import GovernanceDashboard from './components/GovernanceDashboard';
import TreasuryPanel from './components/TreasuryPanel';
import TokenomicsPanel from './components/TokenomicsPanel';
import MembersPanel from './components/MembersPanel';
import ProposalsList from './components/ProposalsList';
import AnalyticsPanel from './components/AnalyticsPanel';
import AuditTrailPanel from './components/AuditTrailPanel';
import OperationsPanel from './components/OperationsPanel';
import ThreeBackground from './components/ThreeBackground';
import { DemoModeProvider, useDemoMode } from './contexts/DemoModeContext';
import DemoModeBanner from './components/DemoModeBanner';
import './App.css';

function AppContent() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const { demoMode, setDemoMode } = useDemoMode();

  useEffect(() => {
    // Check if wallet was previously connected (mock localStorage)
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress) {
      setWalletAddress(savedAddress);
      setWalletConnected(true);
    }
  }, []);

  const handleWalletConnect = (address) => {
    setWalletAddress(address);
    setWalletConnected(true);
    localStorage.setItem('walletAddress', address);
  };

  const handleWalletDisconnect = () => {
    setWalletAddress('');
    setWalletConnected(false);
    localStorage.removeItem('walletAddress');
  };

  return (
    <div className="App dark min-h-screen bg-background text-foreground relative overflow-x-hidden">
      <ThreeBackground />

      <div className="relative z-10">
        <DemoModeBanner />

        <Header
          walletConnected={walletConnected}
          walletAddress={walletAddress}
          onConnect={handleWalletConnect}
          onDisconnect={handleWalletDisconnect}
          demoMode={demoMode}
          setDemoMode={setDemoMode}
        />

        <Hero walletConnected={walletConnected} setActiveTab={setActiveTab} />

        <GovernanceDashboard
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {activeTab === 'overview' && (
          <div className="container mx-auto px-4 py-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <TreasuryPanel />
              <TokenomicsPanel />
            </div>
            <MembersPanel />
            <AnalyticsPanel />
          </div>
        )}

        {activeTab === 'proposals' && (
          <div className="container mx-auto px-4 py-8">
            <ProposalsList walletConnected={walletConnected} />
          </div>
        )}

        {activeTab === 'treasury' && (
          <div className="container mx-auto px-4 py-8">
            <TreasuryPanel expanded={true} />
          </div>
        )}

        {activeTab === 'members' && (
          <div className="container mx-auto px-4 py-8">
            <MembersPanel expanded={true} />
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="container mx-auto px-4 py-8">
            <AuditTrailPanel />
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="container mx-auto px-4 py-8">
            <OperationsPanel />
          </div>
        )}
      </div>

      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <DemoModeProvider>
      <AppContent />
    </DemoModeProvider>
  );
}