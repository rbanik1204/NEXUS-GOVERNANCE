import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Users, Crown, Shield, Award, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useDemoMode } from '../contexts/DemoModeContext';

export default function MembersPanel({ expanded = false }) {
  const { demoMode, realData } = useDemoMode();

  const demoMembers = [
    { name: 'Alice Chen', role: 'Core Contributor', votingPower: 2500, avatar: 'AC', status: 'active', badge: 'founder' },
    { name: 'Bob Smith', role: 'Developer', votingPower: 1800, avatar: 'BS', status: 'active', badge: 'contributor' },
    { name: 'Carol Davis', role: 'Community Lead', votingPower: 2200, avatar: 'CD', status: 'active', badge: 'moderator' },
    { name: 'David Lee', role: 'Delegate', votingPower: 3500, avatar: 'DL', status: 'active', badge: 'delegate' },
    { name: 'Eve Wilson', role: 'Member', votingPower: 1200, avatar: 'EW', status: 'active', badge: null },
    { name: 'Frank Brown', role: 'Member', votingPower: 950, avatar: 'FB', status: 'active', badge: null },
  ];

  const totalMembers = demoMode ? demoMembers.length : realData.governance.totalCitizens;
  const isLoading = !demoMode && realData.loading;

  const getBadgeIcon = (badge) => {
    switch (badge) {
      case 'founder': return <Crown className="w-3 h-3" />;
      case 'delegate': return <Shield className="w-3 h-3" />;
      case 'moderator': return <Award className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <Card className="brutal-card glass hover:translate-x-1 hover:translate-y-1 transition-all">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-3xl font-black flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" strokeWidth={3} />
            Community Members
            {!demoMode && (
              <Badge variant="outline" className="brutal-card text-xs">
                LIVE DATA
              </Badge>
            )}
          </CardTitle>
          <Badge className="brutal-card bg-primary text-primary-foreground font-bold px-4 py-2 text-lg">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : totalMembers}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading member data...</span>
          </div>
        ) : demoMode ? (
          <div className="space-y-3">
            {demoMembers.slice(0, expanded ? 6 : 4).map((member, index) => (
              <div key={index} className="brutal-card bg-card p-4 hover:bg-muted transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 brutal-card">
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                        {member.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        {member.name}
                        {member.badge && (
                          <Badge
                            variant="outline"
                            className="brutal-card text-xs px-2 py-0"
                          >
                            {getBadgeIcon(member.badge)}
                            <span className="ml-1 capitalize">{member.badge}</span>
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground font-semibold">{member.role}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black">{member.votingPower.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground font-semibold">Voting Power</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="brutal-card bg-muted/50 p-8 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-bold text-lg mb-2">Total Citizens: {totalMembers}</h3>
            <p className="text-muted-foreground text-sm">
              {totalMembers === 0
                ? 'No citizens registered yet. Be the first to join!'
                : 'Citizen data loaded from blockchain. Individual member details require additional queries.'}
            </p>
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Active Proposals: {realData.governance.proposalCount}</p>
              <p className="mt-1">Quorum: {realData.governance.quorumPercentage}%</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}