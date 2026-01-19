import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Vault, TrendingUp, TrendingDown, DollarSign, Loader2 } from 'lucide-react';
import { Progress } from './ui/progress';
import { useDemoMode } from '../contexts/DemoModeContext';

export default function TreasuryPanel({ expanded = false }) {
  const { demoMode, realData } = useDemoMode();

  // PHASE 2: No more fake demo data - always show real or empty
  // Real data from blockchain
  const treasuryData = {
    totalValue: realData.treasury.totalValue || 0,
    assets: [
      {
        name: 'ETH',
        amount: parseFloat(realData.treasury.ethBalance || '0'),
        value: parseFloat(realData.treasury.ethBalance || '0') * 2000,
        icon: '⟠',
        change: 0,
        color: 'text-primary'
      },
    ],
    recentTransactions: (realData.analytics?.treasury?.transactions || []).map(tx => ({
      type: tx.type === 'DEPOSIT' ? 'in' : 'out',
      amount: `${(parseInt(tx.amount) / 1e18).toFixed(4)} ${tx.tokenSymbol}`,
      from: tx.from?.substring(0, 6) + '...' + tx.from?.substring(38),
      to: tx.to?.substring(0, 6) + '...' + tx.to?.substring(38),
      date: new Date(parseInt(tx.timestamp) * 1000).toISOString().split('T')[0],
      status: 'completed'
    })),
    spending: (realData.analytics?.treasury?.budgets || []).reduce((acc, b) => {
      acc[b.category] = b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0;
      return acc;
    }, {})
  };

  const isLoading = realData.loading;

  return (
    <div className={expanded ? 'space-y-6' : ''}>
      <Card className="brutal-card glass hover:translate-x-1 hover:translate-y-1 transition-all">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl font-black flex items-center gap-3">
              <Vault className="w-8 h-8 text-primary" strokeWidth={3} />
              Treasury Dashboard
              {!demoMode && (
                <Badge variant="outline" className="brutal-card text-xs">
                  LIVE DATA
                </Badge>
              )}
            </CardTitle>
            {demoMode && (
              <Badge className="brutal-card bg-cyber-green text-background font-bold px-3 py-1">
                <TrendingUp className="w-4 h-4 mr-1" />
                +8.5% this month
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading treasury data...</span>
            </div>
          ) : (
            <>
              {/* Total Value */}
              <div className="brutal-card bg-primary/10 p-6">
                <div className="text-sm font-bold text-muted-foreground mb-2">TOTAL TREASURY VALUE</div>
                <div className="text-5xl font-black text-gradient-primary mb-2">
                  {demoMode ? (
                    `$${(treasuryData.totalValue / 1000000).toFixed(2)}M`
                  ) : (
                    treasuryData.totalValue > 0
                      ? `$${(treasuryData.totalValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : '$0'
                  )}
                </div>
                <div className="text-sm text-muted-foreground font-semibold">
                  {demoMode ? 'Across 4 assets' : `${treasuryData.assets.length} asset(s)`}
                </div>
              </div>

              {/* Asset Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xl font-black">Asset Distribution</h3>
                <div className="grid gap-3">
                  {treasuryData.assets.map((asset, index) => {
                    const percentage = treasuryData.totalValue > 0
                      ? (asset.value / treasuryData.totalValue) * 100
                      : 0;
                    return (
                      <div key={index} className="brutal-card bg-card p-4 hover:bg-muted transition-all">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{asset.icon}</span>
                            <div>
                              <div className="font-bold text-lg">{asset.name}</div>
                              <div className="text-sm text-muted-foreground font-semibold">
                                {asset.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-black text-lg">
                              ${demoMode
                                ? (asset.value / 1000000).toFixed(2) + 'M'
                                : asset.value.toLocaleString(undefined, { maximumFractionDigits: 0 })
                              }
                            </div>
                            {demoMode && (
                              <div className={`text-sm font-bold flex items-center gap-1 justify-end ${asset.change >= 0 ? 'text-cyber-green' : 'text-destructive'}`}>
                                {asset.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(asset.change)}%
                              </div>
                            )}
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2 brutal-card" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Spending Breakdown - Demo only */}
              {expanded && Object.keys(treasuryData.spending).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xl font-black">Budget Utilization</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(treasuryData.spending).map(([category, percentage]) => (
                      <div key={category} className="brutal-card bg-card p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold capitalize">{category}</span>
                          <span className="font-black">{percentage}%</span>
                        </div>
                        <Progress value={percentage} className="h-2 brutal-card" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Transactions - Demo only */}
              {treasuryData.recentTransactions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xl font-black">Recent Transactions</h3>
                  <div className="space-y-2">
                    {treasuryData.recentTransactions.slice(0, expanded ? 6 : 3).map((tx, index) => (
                      <div key={index} className="brutal-card bg-card p-4 hover:bg-muted transition-all">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 brutal-card flex items-center justify-center ${tx.type === 'in' ? 'bg-cyber-green/20 text-cyber-green' : 'bg-accent/20 text-accent'
                              }`}>
                              {tx.type === 'in' ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="font-bold">{tx.amount}</div>
                              <div className="text-sm text-muted-foreground font-semibold">
                                {tx.type === 'in' ? `From ${tx.from}` : `To ${tx.to}`}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">{tx.date}</div>
                            </div>
                          </div>
                          <Badge
                            variant={tx.status === 'completed' ? 'default' : 'outline'}
                            className="brutal-card"
                          >
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Real mode message when no transactions */}
              {!demoMode && treasuryData.recentTransactions.length === 0 && (
                <div className="brutal-card bg-muted/50 p-6 text-center">
                  <p className="text-muted-foreground">
                    No recent transactions. Treasury data is loaded from blockchain.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Budgets: {realData.treasury.budgetCount}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}