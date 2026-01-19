import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Coins, PieChart, TrendingUp, Users2 } from 'lucide-react';
import { Progress } from './ui/progress';

export default function TokenomicsPanel() {
  const tokenomics = {
    totalSupply: 100000000,
    circulatingSupply: 65000000,
    tokenPrice: 1.5,
    marketCap: 97500000,
    distribution: [
      { label: 'Community', percentage: 40, amount: 40000000, color: 'bg-primary' },
      { label: 'Team & Advisors', percentage: 20, amount: 20000000, color: 'bg-accent' },
      { label: 'Treasury', percentage: 25, amount: 25000000, color: 'bg-cyber-green' },
      { label: 'Liquidity', percentage: 10, amount: 10000000, color: 'bg-secondary' },
      { label: 'Ecosystem', percentage: 5, amount: 5000000, color: 'bg-muted-foreground' },
    ],
    votingPower: [
      { range: 'Top 10', power: 42.5, holders: 10 },
      { range: 'Top 100', power: 68.3, holders: 90 },
      { range: 'Others', power: 31.7, holders: 12443 },
    ],
    delegation: {
      totalDelegated: 35000000,
      delegates: 234,
      avgDelegation: 149573,
    }
  };

  return (
    <Card className="brutal-card glass hover:translate-x-1 hover:translate-y-1 transition-all">
      <CardHeader>
        <CardTitle className="text-3xl font-black flex items-center gap-3">
          <Coins className="w-8 h-8 text-accent" strokeWidth={3} />
          Tokenomics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Token Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="brutal-card bg-card p-4">
            <div className="text-sm font-bold text-muted-foreground mb-1">TOTAL SUPPLY</div>
            <div className="text-2xl font-black">{(tokenomics.totalSupply / 1000000).toFixed(0)}M</div>
            <div className="text-xs text-muted-foreground font-semibold mt-1">NEXUS tokens</div>
          </div>
          <div className="brutal-card bg-card p-4">
            <div className="text-sm font-bold text-muted-foreground mb-1">CIRCULATING</div>
            <div className="text-2xl font-black">{(tokenomics.circulatingSupply / 1000000).toFixed(0)}M</div>
            <div className="text-xs text-muted-foreground font-semibold mt-1">
              {((tokenomics.circulatingSupply / tokenomics.totalSupply) * 100).toFixed(0)}% of supply
            </div>
          </div>
          <div className="brutal-card bg-card p-4">
            <div className="text-sm font-bold text-muted-foreground mb-1">TOKEN PRICE</div>
            <div className="text-2xl font-black text-cyber-green">${tokenomics.tokenPrice}</div>
            <div className="text-xs text-cyber-green font-bold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +12.5%
            </div>
          </div>
          <div className="brutal-card bg-card p-4">
            <div className="text-sm font-bold text-muted-foreground mb-1">MARKET CAP</div>
            <div className="text-2xl font-black">${(tokenomics.marketCap / 1000000).toFixed(1)}M</div>
            <div className="text-xs text-muted-foreground font-semibold mt-1">Fully diluted</div>
          </div>
        </div>

        {/* Token Distribution */}
        <div className="space-y-3">
          <h3 className="text-xl font-black flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Token Distribution
          </h3>
          <div className="space-y-2">
            {tokenomics.distribution.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 ${item.color}`} />
                    <span className="font-bold">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black">{item.percentage}%</span>
                    <span className="text-sm text-muted-foreground ml-2 font-semibold">
                      ({(item.amount / 1000000).toFixed(1)}M)
                    </span>
                  </div>
                </div>
                <Progress value={item.percentage} className="h-2 brutal-card" />
              </div>
            ))}
          </div>
        </div>

        {/* Voting Power Breakdown */}
        <div className="space-y-3">
          <h3 className="text-xl font-black flex items-center gap-2">
            <Users2 className="w-5 h-5" />
            Voting Power Distribution
          </h3>
          <div className="space-y-2">
            {tokenomics.votingPower.map((item, index) => (
              <div key={index} className="brutal-card bg-card p-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <div className="font-bold">{item.range} Holders</div>
                    <div className="text-sm text-muted-foreground font-semibold">{item.holders.toLocaleString()} addresses</div>
                  </div>
                  <div className="text-2xl font-black">{item.power}%</div>
                </div>
                <Progress value={item.power} className="h-2 brutal-card" />
              </div>
            ))}
          </div>
        </div>

        {/* Delegation Stats */}
        <div className="brutal-card bg-accent/10 p-4">
          <h3 className="text-lg font-black mb-3">Delegation Overview</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-black">{(tokenomics.delegation.totalDelegated / 1000000).toFixed(1)}M</div>
              <div className="text-xs text-muted-foreground font-semibold">Delegated</div>
            </div>
            <div>
              <div className="text-2xl font-black">{tokenomics.delegation.delegates}</div>
              <div className="text-xs text-muted-foreground font-semibold">Delegates</div>
            </div>
            <div>
              <div className="text-2xl font-black">{(tokenomics.delegation.avgDelegation / 1000).toFixed(1)}K</div>
              <div className="text-xs text-muted-foreground font-semibold">Avg/Delegate</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}