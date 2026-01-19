import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowRight, Users, Vote, TrendingUp, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDemoMode } from '../contexts/DemoModeContext';

export default function Hero({ walletConnected, setActiveTab }) {
  const { demoMode, realData, loading } = useDemoMode();

  // PHASE 2: Use real data, not hardcoded values
  const stats = [
    {
      id: 'members',
      icon: Users,
      label: 'Citizens',
      value: loading ? '...' : (demoMode ? '—' : (realData.governance.totalCitizens || '0')),
      color: 'text-primary'
    },
    {
      id: 'proposals',
      icon: Vote,
      label: 'Proposals',
      value: loading ? '...' : (demoMode ? '—' : (realData.governance.proposalCount || '0')),
      color: 'text-accent'
    },
    {
      id: 'treasury',
      icon: TrendingUp,
      label: 'Treasury',
      value: loading ? '...' : (demoMode ? '—' : `${realData.treasury.ethBalance} ETH`),
      color: 'text-cyber-green'
    },
    {
      id: 'audit',
      icon: ShieldCheck,
      label: 'Network',
      value: 'Sepolia',
      color: 'text-foreground'
    },
  ];


  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge
              variant="outline"
              className="brutal-card border-accent text-accent px-6 py-2 text-sm font-bold"
            >
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse mr-2" />
              Next-Gen DAO Governance Platform
            </Badge>
          </motion.div>

          {/* Main Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight">
              Build the Future
              <br />
              <span className="text-gradient-primary">Together</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
              Decentralized governance powered by transparency, community, and cutting-edge Web3 technology.
              Vote on proposals, manage treasury, and shape the future.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            {!walletConnected ? (
              <>
                <Button
                  size="lg"
                  className="brutal-card bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 text-lg transition-all hover:translate-x-1 hover:translate-y-1 glow-electric"
                >
                  Enter DAO Portal
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="brutal-card bg-transparent hover:bg-card text-foreground font-bold px-8 py-6 text-lg transition-all hover:translate-x-1 hover:translate-y-1"
                >
                  Learn More
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                onClick={() => setActiveTab('proposals')}
                className="brutal-card bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-8 py-6 text-lg transition-all hover:translate-x-1 hover:translate-y-1 glow-neon"
              >
                Create Proposal
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mt-16"
          >
            {stats.map((stat, index) => (
              <div
                key={index}
                onClick={() => setActiveTab(stat.id)}
                className="brutal-card glass p-6 hover:translate-x-1 hover:translate-y-1 transition-all cursor-pointer group"
              >
                <stat.icon className={`w-8 h-8 ${stat.color} mb-3 group-hover:scale-110 transition-transform`} strokeWidth={2.5} />
                <div className="text-3xl font-black mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground font-semibold">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}