import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  BarChart3, TrendingUp, Users, FileText,
  DollarSign, Activity, CheckCircle, XCircle,
  Loader2
} from 'lucide-react';
import { Progress } from './ui/progress';
import { useDemoMode } from '../contexts/DemoModeContext';

export default function AnalyticsPanel() {
  const { demoMode, realData } = useDemoMode();
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    // PHASE 2: Always load real analytics, no more fake demo data
    loadRealAnalytics();
  }, [realData]);

  const loadRealAnalytics = () => {
    // Calculate real analytics from blockchain data
    const totalCitizens = realData.governance.totalCitizens || 0;
    const proposalCount = realData.governance.proposalCount || 0;
    const treasuryValue = realData.treasury.totalValue || 0;
    const health = realData.analytics?.healthScore;
    const trends = realData.analytics?.monthlyTrends || [];

    // Honest health score - only calculated if data exists
    let healthScore = 0;
    let healthStatus = 'Awaiting Data';
    let healthColor = 'text-muted-foreground';

    if (totalCitizens > 0 && proposalCount > 0) {
      healthScore = Math.min(100, Math.max(0, health?.score || 50));
      healthStatus = healthScore > 75 ? 'Good' : healthScore > 50 ? 'Fair' : 'Needs Attention';
      healthColor = healthScore > 75 ? 'text-cyber-green' : healthScore > 50 ? 'text-yellow-500' : 'text-red-500';
    }

    setAnalytics({
      daoHealth: {
        score: healthScore,
        status: healthStatus,
        color: healthColor,
      },
      participation: {
        voterTurnout: health?.metrics?.participation || 0,
        activeMembers: totalCitizens,
        totalMembers: totalCitizens,
        participationRate: health?.metrics?.participation || 0,
      },
      proposals: {
        total: proposalCount,
        active: 0,
        passed: 0,
        failed: 0,
        successRate: 0,
      },
      treasury: {
        totalValue: treasuryValue,
        monthlyGrowth: 0,
        totalSpent: 0,
        budgetUtilization: 0,
      },
      governance: {
        avgVotingTime: realData.governance.votingPeriod
          ? `${Math.floor(realData.governance.votingPeriod / 86400)} days`
          : 'N/A',
        avgQuorum: realData.governance.quorumPercentage || 0,
        avgProposalDuration: realData.governance.votingPeriod
          ? `${Math.floor(realData.governance.votingPeriod / 86400)} days`
          : 'N/A',
        delegationRate: 0,
      },
      trends: {
        memberGrowth: [],
        proposalActivity: [],
      },
    });
  };

  // Duplicate function removed in PHASE 2 cleanup

  if (!analytics) {
    return (
      <Card className="brutal-card glass">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading analytics...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* DAO Health Score */}
      <Card className="brutal-card glass hover:translate-x-1 hover:translate-y-1 transition-all">
        <CardHeader>
          <CardTitle className="text-3xl font-black flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" strokeWidth={3} />
            DAO Health Dashboard
            {!demoMode && (
              <Badge variant="outline" className="brutal-card text-xs">
                LIVE DATA
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="brutal-card bg-primary/10 p-6 mb-6">
            <div className="text-sm font-bold text-muted-foreground mb-2">OVERALL HEALTH SCORE</div>
            <div className={`text-6xl font-black ${analytics.daoHealth.color} mb-2`}>
              {analytics.daoHealth.score}
              <span className="text-2xl">/100</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`brutal-card ${analytics.daoHealth.color} bg-opacity-20 font-bold`}>
                {analytics.daoHealth.status}
              </Badge>
              {demoMode && (
                <span className="text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  +5 points this month
                </span>
              )}
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Participation */}
            <div className="brutal-card bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-xs font-bold text-muted-foreground">PARTICIPATION</span>
              </div>
              <div className="text-3xl font-black">{analytics.participation.participationRate}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {analytics.participation.activeMembers}/{analytics.participation.totalMembers} active
              </div>
            </div>

            {/* Proposals */}
            <div className="brutal-card bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-accent" />
                <span className="text-xs font-bold text-muted-foreground">PROPOSALS</span>
              </div>
              <div className="text-3xl font-black">{analytics.proposals.total}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {demoMode || analytics.proposals.successRate > 0 ? `${analytics.proposals.successRate}% success rate` : 'Total submitted'}
              </div>
            </div>

            {/* Treasury */}
            <div className="brutal-card bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-cyber-green" />
                <span className="text-xs font-bold text-muted-foreground">TREASURY</span>
              </div>
              <div className="text-3xl font-black">
                {demoMode
                  ? `$${(analytics.treasury.totalValue / 1000000).toFixed(1)}M`
                  : `$${analytics.treasury.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                }
              </div>
              {demoMode && (
                <div className="text-xs text-cyber-green mt-1">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  +{analytics.treasury.monthlyGrowth}% this month
                </div>
              )}
            </div>

            {/* Quorum */}
            <div className="brutal-card bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                <span className="text-xs font-bold text-muted-foreground">AVG QUORUM</span>
              </div>
              <div className="text-3xl font-black">{analytics.governance.avgQuorum}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {analytics.governance.avgProposalDuration} voting
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proposal Statistics */}
        <Card className="brutal-card glass">
          <CardHeader>
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" strokeWidth={3} />
              Proposal Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="brutal-card bg-card p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">Total Proposals</span>
                <span className="text-2xl font-black">{analytics.proposals.total}</span>
              </div>
            </div>
            {demoMode && (
              <>
                <div className="brutal-card bg-card p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-cyber-green" />
                      Passed
                    </span>
                    <span className="text-2xl font-black text-cyber-green">{analytics.proposals.passed}</span>
                  </div>
                  <Progress value={(analytics.proposals.passed / analytics.proposals.total) * 100} className="h-2" />
                </div>
                <div className="brutal-card bg-card p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-destructive" />
                      Failed
                    </span>
                    <span className="text-2xl font-black text-destructive">{analytics.proposals.failed}</span>
                  </div>
                  <Progress value={(analytics.proposals.failed / analytics.proposals.total) * 100} className="h-2" />
                </div>
                <div className="brutal-card bg-card p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">Success Rate</span>
                    <span className="text-2xl font-black text-cyber-green">{analytics.proposals.successRate}%</span>
                  </div>
                  <Progress value={analytics.proposals.successRate} className="h-2" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Governance Metrics */}
        <Card className="brutal-card glass">
          <CardHeader>
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" strokeWidth={3} />
              Governance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="brutal-card bg-card p-4">
              <div className="text-sm font-bold text-muted-foreground mb-1">Average Voting Duration</div>
              <div className="text-2xl font-black">{analytics.governance.avgVotingTime}</div>
            </div>
            <div className="brutal-card bg-card p-4">
              <div className="text-sm font-bold text-muted-foreground mb-1">Average Quorum</div>
              <div className="text-2xl font-black">{analytics.governance.avgQuorum}%</div>
              <Progress value={analytics.governance.avgQuorum} className="h-2 mt-2" />
            </div>
            {demoMode && (
              <div className="brutal-card bg-card p-4">
                <div className="text-sm font-bold text-muted-foreground mb-1">Delegation Rate</div>
                <div className="text-2xl font-black">{analytics.governance.delegationRate}%</div>
                <Progress value={analytics.governance.delegationRate} className="h-2 mt-2" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Real Mode Message */}
      {!demoMode && (
        <Card className="brutal-card glass border-2 border-primary">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Activity className="w-8 h-8 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-black text-lg mb-2">Live Analytics Active</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Analytics are calculated from real blockchain data. Historical metrics require an indexing service.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-bold">Available:</span>
                    <ul className="text-muted-foreground mt-1 space-y-1">
                      <li>✅ Total citizens</li>
                      <li>✅ Total proposals</li>
                      <li>✅ Treasury value</li>
                      <li>✅ Governance parameters</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-bold">Requires Indexing:</span>
                    <ul className="text-muted-foreground mt-1 space-y-1">
                      <li>⏳ Voter turnout</li>
                      <li>⏳ Success rates</li>
                      <li>⏳ Historical trends</li>
                      <li>⏳ Growth metrics</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}