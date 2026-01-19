import React, { useState, useEffect } from 'react';
import { useAccount, useDisconnect, useBalance } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Wallet, Activity, ChevronDown, Power, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import web3Service from '../services/web3Service';

export default function Header({ walletConnected, walletAddress, onConnect, onDisconnect, demoMode, setDemoMode }) {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });

  const [votingPower, setVotingPower] = useState(0);
  const [connecting, setConnecting] = useState(false);

  // Sync wagmi state with app state
  useEffect(() => {
    if (isConnected && address && !demoMode) {
      onConnect(address);
      loadVotingPower();
    }
  }, [isConnected, address, demoMode]);

  const loadVotingPower = async () => {
    if (!address || demoMode) return;
    try {
      await web3Service.initialize();
      const power = await web3Service.getVotingPower(address);
      setVotingPower(power);
    } catch (error) {
      console.error('Error loading voting power:', error);
    }
  };

  const handleConnect = async () => {
    if (demoMode) {
      // Demo mode - simulate connection
      setConnecting(true);
      setTimeout(() => {
        const mockAddress = '0x' + Math.random().toString(16).substr(2, 40);
        onConnect(mockAddress);
        toast.success('Wallet Connected (Demo Mode)', {
          description: 'Using simulated wallet connection'
        });
        setConnecting(false);
      }, 1500);
    } else {
      // Real mode - open Web3Modal
      try {
        await open();
      } catch (error) {
        console.error('Connection error:', error);
        toast.error('Connection Failed', {
          description: error.message || 'Failed to open wallet selector'
        });
      }
    }
  };

  const handleDisconnect = () => {
    if (!demoMode && isConnected) {
      disconnect();
    }
    onDisconnect();
    toast.info('Wallet Disconnected');
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const displayAddress = demoMode ? walletAddress : address;
  const displayBalance = demoMode ? '2.5' : balance ? parseFloat(balance.formatted).toFixed(4) : '0';
  const displayVotingPower = demoMode ? '1,250' : votingPower;
  const isWalletConnected = demoMode ? walletConnected : isConnected;

  return (
    <header className="sticky top-0 z-50 w-full glass border-b-4 border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 brutal-card bg-card flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary" strokeWidth={3} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                <span className="text-gradient-primary">NEXUS DAO</span>
              </h1>
              <p className="text-xs text-muted-foreground font-medium">Decentralized Governance</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Demo Mode Toggle */}
            <div className="flex items-center gap-2 px-4 py-2 brutal-card bg-card">
              <span className="text-sm font-semibold">Demo Mode</span>
              <Switch checked={demoMode} onCheckedChange={setDemoMode} />
            </div>

            {/* Network Badge */}
            <Badge
              variant="outline"
              className="brutal-card border-cyber-green text-cyber-green px-3 py-1"
            >
              <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse mr-2" />
              {demoMode ? 'Demo' : 'Sepolia'}
            </Badge>

            {/* Wallet Connection */}
            {!isWalletConnected ? (
              <Button
                onClick={handleConnect}
                disabled={connecting}
                size="lg"
                className="brutal-card bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 transition-all hover:translate-x-1 hover:translate-y-1"
              >
                <Wallet className="w-5 h-5 mr-2" />
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="lg"
                    className="brutal-card bg-card hover:bg-muted text-foreground font-bold px-6 transition-all hover:translate-x-1 hover:translate-y-1"
                  >
                    <Avatar className="w-6 h-6 mr-2">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                        {displayAddress ? displayAddress.slice(2, 4).toUpperCase() : 'XX'}
                      </AvatarFallback>
                    </Avatar>
                    {formatAddress(displayAddress)}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 brutal-card">
                  <DropdownMenuItem className="font-semibold">
                    <Wallet className="w-4 h-4 mr-2" />
                    {formatAddress(displayAddress)}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div className="flex flex-col gap-1 w-full">
                      <span className="text-xs text-muted-foreground">Balance</span>
                      <span className="font-semibold">{displayBalance} ETH</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div className="flex flex-col gap-1 w-full">
                      <span className="text-xs text-muted-foreground">Voting Power</span>
                      <span className="font-semibold">{displayVotingPower} {demoMode ? 'NEXUS' : 'votes'}</span>
                    </div>
                  </DropdownMenuItem>
                  {!demoMode && displayAddress && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <a
                          href={`https://sepolia.etherscan.io/address/${displayAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View on Etherscan
                        </a>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDisconnect} className="text-destructive">
                    <Power className="w-4 h-4 mr-2" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}