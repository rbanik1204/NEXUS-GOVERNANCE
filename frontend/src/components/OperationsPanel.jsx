import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import {
    Settings,
    Users,
    Shield,
    Vault,
    AlertTriangle,
    Activity,
    Lock,
    Eye,
    FileText,
    ChevronRight,
    RefreshCw,
    Clock,
    Check,
    X,
    Info,
    Database,
    Loader2
} from 'lucide-react';
import { useDemoMode } from '../contexts/DemoModeContext';
import web3Service from '../services/web3Service';

export default function OperationsPanel() {
    const { demoMode, realData } = useDemoMode();
    const [activeModule, setActiveModule] = useState('governance');
    const [loading, setLoading] = useState(false);
    const [governanceParams, setGovernanceParams] = useState(null);
    const [systemHealth, setSystemHealth] = useState({
        subgraphStatus: 'SYNCED',
        lastBlock: 0,
        rpcStatus: 'CONNECTED',
        contractsVerified: true
    });

    const modules = [
        { id: 'governance', label: 'Governance Config', icon: Settings },
        { id: 'roles', label: 'Role Management', icon: Users },
        { id: 'treasury', label: 'Treasury Safety', icon: Vault },
        { id: 'emergency', label: 'Emergency Controls', icon: AlertTriangle },
        { id: 'health', label: 'System Health', icon: Activity },
        { id: 'audit', label: 'Audit Access', icon: Eye },
    ];

    useEffect(() => {
        if (!demoMode) {
            loadGovernanceParams();
        }
    }, [demoMode]);

    const loadGovernanceParams = async () => {
        setLoading(true);
        try {
            await web3Service.initialize();
            const params = await web3Service.getGovernanceParams();
            setGovernanceParams(params);
        } catch (error) {
            console.error('Error loading governance params:', error);
        }
        setLoading(false);
    };

    // Demo data for demonstration
    const demoGovernanceParams = {
        votingPeriod: 604800, // 7 days in seconds
        executionDelay: 172800, // 48 hours
        quorumPercentage: 15,
        proposalThreshold: '1000'
    };

    const params = demoMode ? demoGovernanceParams : (governanceParams || demoGovernanceParams);

    const formatDuration = (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        if (days > 0) return `${days} days ${hours > 0 ? `${hours} hours` : ''}`;
        return `${hours} hours`;
    };

    // What Admins CANNOT do - explicit restrictions
    const restrictions = [
        { action: 'Change governance parameters directly', allowed: false },
        { action: 'Move treasury funds', allowed: false },
        { action: 'Override vote results', allowed: false },
        { action: 'Grant citizen status without proposal', allowed: false },
        { action: 'Delete or modify proposals', allowed: false },
        { action: 'Access user private keys', allowed: false },
        { action: 'Pause system without governance vote', allowed: false },
        { action: 'View governance parameters', allowed: true },
        { action: 'View role assignments', allowed: true },
        { action: 'Propose parameter changes', allowed: true },
        { action: 'Monitor system health', allowed: true },
    ];

    return (
        <div className="space-y-6">
            {/* Header with Restrictions Banner */}
            <Card className="brutal-card bg-card/80 backdrop-blur border-2 border-primary">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-3xl font-black flex items-center gap-3">
                            <Shield className="w-8 h-8 text-primary" strokeWidth={3} />
                            Operations & Governance Admin
                            <Badge variant="outline" className="ml-2 text-xs">
                                {demoMode ? 'DEMO' : 'LIVE'}
                            </Badge>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Badge className="bg-cyber-green text-background font-bold">
                                READ-ONLY ACCESS
                            </Badge>
                            <button
                                onClick={loadGovernanceParams}
                                className="brutal-card p-2 hover:bg-muted"
                                disabled={loading}
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="bg-yellow-500/10 border-2 border-yellow-500 brutal-card p-4">
                        <div className="flex items-start gap-3">
                            <Lock className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-black text-yellow-500 mb-1">ADMINISTRATIVE RESTRICTIONS</h4>
                                <p className="text-sm text-muted-foreground">
                                    This panel provides <strong>monitoring and configuration proposal access only</strong>.
                                    Direct modification of governance parameters, fund transfers, or vote manipulation
                                    is not possible. All changes require community governance approval.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Module Navigation */}
            <div className="grid grid-cols-6 gap-2">
                {modules.map((module) => (
                    <button
                        key={module.id}
                        onClick={() => setActiveModule(module.id)}
                        className={`brutal-card p-4 text-center transition-all hover:translate-x-0.5 hover:translate-y-0.5 ${activeModule === module.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card hover:bg-muted'
                            }`}
                    >
                        <module.icon className="w-6 h-6 mx-auto mb-2" strokeWidth={2.5} />
                        <span className="text-xs font-bold block">{module.label}</span>
                    </button>
                ))}
            </div>

            {/* Module Content */}
            <div className="min-h-[500px]">
                {/* MODULE A: Governance Configuration */}
                {activeModule === 'governance' && (
                    <Card className="brutal-card glass">
                        <CardHeader className="border-b-4 border-foreground">
                            <CardTitle className="text-xl font-black flex items-center gap-2">
                                <Settings className="w-6 h-6" />
                                Governance Parameters (Read-Only)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-2 gap-6">
                                {/* Parameter Cards */}
                                <div className="brutal-card bg-muted/30 p-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="w-5 h-5 text-primary" />
                                        <span className="text-sm font-bold text-muted-foreground">VOTING PERIOD</span>
                                    </div>
                                    <div className="text-3xl font-black">{formatDuration(params.votingPeriod)}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {params.votingPeriod.toLocaleString()} seconds
                                    </div>
                                </div>

                                <div className="brutal-card bg-muted/30 p-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="w-5 h-5 text-accent" />
                                        <span className="text-sm font-bold text-muted-foreground">EXECUTION DELAY</span>
                                    </div>
                                    <div className="text-3xl font-black">{formatDuration(params.executionDelay)}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Timelock before execution
                                    </div>
                                </div>

                                <div className="brutal-card bg-muted/30 p-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users className="w-5 h-5 text-cyber-green" />
                                        <span className="text-sm font-bold text-muted-foreground">QUORUM REQUIRED</span>
                                    </div>
                                    <div className="text-3xl font-black">{params.quorumPercentage}%</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        of total voting power
                                    </div>
                                </div>

                                <div className="brutal-card bg-muted/30 p-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="w-5 h-5 text-yellow-500" />
                                        <span className="text-sm font-bold text-muted-foreground">PROPOSAL THRESHOLD</span>
                                    </div>
                                    <div className="text-3xl font-black">{params.proposalThreshold}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        tokens required to propose
                                    </div>
                                </div>
                            </div>

                            {/* Propose Change Button */}
                            <div className="mt-8 p-6 brutal-card bg-primary/10 border-2 border-primary">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-black text-lg">Request Parameter Change</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Changes require a PARAMETER type proposal with 25% quorum
                                        </p>
                                    </div>
                                    <button className="brutal-button bg-primary text-primary-foreground px-6 py-3 font-black flex items-center gap-2 hover:scale-102 transition-all">
                                        CREATE PROPOSAL
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* MODULE B: Role Management */}
                {activeModule === 'roles' && (
                    <Card className="brutal-card glass">
                        <CardHeader className="border-b-4 border-foreground">
                            <CardTitle className="text-xl font-black flex items-center gap-2">
                                <Users className="w-6 h-6" />
                                Role Assignment Registry (Read-Only)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {/* Role Definitions */}
                            <div className="grid grid-cols-4 gap-4 mb-8">
                                {[
                                    { role: 'CITIZEN', count: demoMode ? 12543 : (realData?.governance?.totalCitizens || 0), color: 'bg-primary', desc: 'Can vote on proposals' },
                                    { role: 'DELEGATE', count: demoMode ? 48 : 0, color: 'bg-accent', desc: 'Can vote + create proposals' },
                                    { role: 'AUDITOR', count: demoMode ? 5 : 0, color: 'bg-cyber-green', desc: 'Read-only audit access' },
                                    { role: 'OPERATOR', count: demoMode ? 3 : 0, color: 'bg-yellow-500', desc: 'Admin dashboard access' },
                                ].map((item) => (
                                    <div key={item.role} className="brutal-card bg-muted/30 p-4">
                                        <Badge className={`${item.color} text-background font-black mb-2`}>
                                            {item.role}
                                        </Badge>
                                        <div className="text-2xl font-black">{item.count.toLocaleString()}</div>
                                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Identity Verification Queue */}
                            <div className="brutal-card bg-muted/20 p-6">
                                <h4 className="font-black mb-4 flex items-center gap-2">
                                    <Shield className="w-5 h-5" />
                                    Identity Verification Queue
                                </h4>
                                <div className="space-y-3">
                                    {demoMode ? (
                                        [
                                            { wallet: '0x7a3F...9c2D', hash: 'keccak256(...)', status: 'PENDING', date: '2026-01-15' },
                                            { wallet: '0x4b2E...1f8A', hash: 'keccak256(...)', status: 'APPROVED', date: '2026-01-14' },
                                        ].map((item, i) => (
                                            <div key={i} className="brutal-card bg-background p-4 flex items-center justify-between">
                                                <div>
                                                    <code className="text-sm font-mono bg-muted px-2 py-1">{item.wallet}</code>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Identity Hash: {item.hash}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs text-muted-foreground">{item.date}</span>
                                                    <Badge className={item.status === 'PENDING' ? 'bg-yellow-500' : 'bg-cyber-green'}>
                                                        {item.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            Connect wallet to view pending verifications
                                        </div>
                                    )}
                                </div>

                                <button className="brutal-button w-full mt-4 bg-accent text-accent-foreground py-3 font-black flex items-center justify-center gap-2">
                                    CREATE VERIFICATION PROPOSAL
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* MODULE C: Treasury Safety */}
                {activeModule === 'treasury' && (
                    <Card className="brutal-card glass">
                        <CardHeader className="border-b-4 border-foreground">
                            <CardTitle className="text-xl font-black flex items-center gap-2">
                                <Vault className="w-6 h-6" />
                                Treasury Safety Configuration (Read-Only)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="brutal-card bg-muted/30 p-6">
                                    <span className="text-sm font-bold text-muted-foreground">DAILY WITHDRAWAL LIMIT</span>
                                    <div className="text-3xl font-black mt-2">5 ETH</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Maximum per 24-hour period
                                    </div>
                                </div>

                                <div className="brutal-card bg-muted/30 p-6">
                                    <span className="text-sm font-bold text-muted-foreground">SINGLE TRANSACTION LIMIT</span>
                                    <div className="text-3xl font-black mt-2">2 ETH</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Maximum per transaction
                                    </div>
                                </div>

                                <div className="brutal-card bg-muted/30 p-6">
                                    <span className="text-sm font-bold text-muted-foreground">MULTI-SIG THRESHOLD</span>
                                    <div className="text-3xl font-black mt-2">3 of 5</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Required signers for execution
                                    </div>
                                </div>

                                <div className="brutal-card bg-muted/30 p-6">
                                    <span className="text-sm font-bold text-muted-foreground">TIMELOCK DELAY</span>
                                    <div className="text-3xl font-black mt-2">48 hours</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        After proposal passes
                                    </div>
                                </div>
                            </div>

                            {/* Current Treasury Status */}
                            <div className="mt-6 brutal-card bg-cyber-green/10 border-2 border-cyber-green p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-sm font-bold text-cyber-green">CURRENT TREASURY BALANCE</span>
                                        <div className="text-4xl font-black mt-2">
                                            {demoMode ? '127.5 ETH' : `${realData?.treasury?.ethBalance || '0'} ETH`}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-muted-foreground">24H WITHDRAWALS</span>
                                        <div className="text-2xl font-black mt-2">0.5 ETH</div>
                                        <div className="text-xs text-muted-foreground">of 5 ETH limit</div>
                                    </div>
                                </div>
                            </div>

                            <button className="brutal-button w-full mt-6 bg-primary text-primary-foreground py-3 font-black flex items-center justify-center gap-2">
                                PROPOSE LIMIT CHANGE
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </CardContent>
                    </Card>
                )}

                {/* MODULE D: Emergency Controls */}
                {activeModule === 'emergency' && (
                    <Card className="brutal-card glass">
                        <CardHeader className="border-b-4 border-foreground">
                            <CardTitle className="text-xl font-black flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                                Emergency Controls (Governed)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {/* Current System Status */}
                            <div className="brutal-card bg-cyber-green/10 border-2 border-cyber-green p-6 mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-4 h-4 rounded-full bg-cyber-green animate-pulse shadow-bloom" />
                                    <div>
                                        <span className="font-black text-cyber-green text-xl">SYSTEM OPERATIONAL</span>
                                        <div className="text-sm text-muted-foreground">
                                            All governance functions are active
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Emergency Actions */}
                            <div className="space-y-4">
                                <div className="brutal-card bg-red-500/10 border-2 border-red-500 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-black text-red-500 flex items-center gap-2">
                                                <AlertTriangle className="w-5 h-5" />
                                                Emergency Pause
                                            </h4>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Halt all governance operations. Requires EMERGENCY proposal (24h vote, 30% quorum).
                                            </p>
                                        </div>
                                        <button className="brutal-button bg-red-500 text-white px-6 py-3 font-black">
                                            INITIATE PAUSE PROPOSAL
                                        </button>
                                    </div>
                                </div>

                                <div className="brutal-card bg-muted/30 p-6">
                                    <h4 className="font-black mb-4">Emergency Pause History</h4>
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        No emergency pauses recorded
                                    </div>
                                </div>
                            </div>

                            {/* Restrictions Reminder */}
                            <div className="mt-6 brutal-card bg-yellow-500/10 border-2 border-yellow-500 p-4">
                                <div className="flex items-center gap-2 text-sm">
                                    <Info className="w-4 h-4 text-yellow-500" />
                                    <span className="text-yellow-500 font-bold">
                                        Emergency actions require governance approval and are fully logged.
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* MODULE E: System Health */}
                {activeModule === 'health' && (
                    <Card className="brutal-card glass">
                        <CardHeader className="border-b-4 border-foreground">
                            <CardTitle className="text-xl font-black flex items-center gap-2">
                                <Activity className="w-6 h-6" />
                                System Health & Metrics
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-3 gap-6">
                                {/* Infrastructure Status */}
                                <div className="brutal-card bg-muted/30 p-6">
                                    <h4 className="font-black mb-4 text-sm text-muted-foreground">INFRASTRUCTURE</h4>
                                    <div className="space-y-3">
                                        {[
                                            { label: 'RPC Connection', status: 'CONNECTED', ok: true },
                                            { label: 'Subgraph Sync', status: 'SYNCED', ok: true },
                                            { label: 'Contracts Verified', status: 'YES', ok: true },
                                            { label: 'Monitoring Service', status: 'ACTIVE', ok: true },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <span className="text-sm">{item.label}</span>
                                                <Badge className={item.ok ? 'bg-cyber-green' : 'bg-red-500'}>
                                                    {item.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Governance Metrics */}
                                <div className="brutal-card bg-muted/30 p-6">
                                    <h4 className="font-black mb-4 text-sm text-muted-foreground">GOVERNANCE METRICS</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Active Proposals</span>
                                            <span className="font-black">{demoMode ? 8 : (realData?.governance?.proposalCount || 0)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Pending Executions</span>
                                            <span className="font-black">2</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">30-Day Participation</span>
                                            <span className="font-black">67%</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Success Rate</span>
                                            <span className="font-black">82%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Network Info */}
                                <div className="brutal-card bg-muted/30 p-6">
                                    <h4 className="font-black mb-4 text-sm text-muted-foreground">NETWORK</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Network</span>
                                            <Badge className="bg-primary">Sepolia</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Chain ID</span>
                                            <span className="font-mono text-xs">11155111</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Latest Block</span>
                                            <span className="font-mono text-xs">10,065,920</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Gas Price</span>
                                            <span className="font-mono text-xs">~3 gwei</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* MODULE F: Audit Access */}
                {activeModule === 'audit' && (
                    <Card className="brutal-card glass">
                        <CardHeader className="border-b-4 border-foreground">
                            <CardTitle className="text-xl font-black flex items-center gap-2">
                                <Eye className="w-6 h-6" />
                                Audit Access (Read-Only)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {/* Permission Matrix */}
                            <div className="brutal-card bg-muted/20 p-6 mb-6">
                                <h4 className="font-black mb-4">Admin Permission Matrix</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {restrictions.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 brutal-card bg-background">
                                            {item.allowed ? (
                                                <Check className="w-5 h-5 text-cyber-green flex-shrink-0" />
                                            ) : (
                                                <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                                            )}
                                            <span className={`text-sm ${item.allowed ? '' : 'text-muted-foreground'}`}>
                                                {item.action}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Audit Log Summary */}
                            <div className="brutal-card bg-muted/20 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-black">Recent Audit Events</h4>
                                    <button className="text-sm text-primary font-bold hover:underline">
                                        View Full Log →
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { time: '2 min ago', event: 'Admin panel accessed', actor: '0x400...5194' },
                                        { time: '15 min ago', event: 'Governance params viewed', actor: '0x400...5194' },
                                        { time: '1 hour ago', event: 'Treasury balance queried', actor: '0x7a3...9c2D' },
                                    ].map((log, i) => (
                                        <div key={i} className="brutal-card bg-background p-3 flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-muted-foreground w-16">{log.time}</span>
                                                <span>{log.event}</span>
                                            </div>
                                            <code className="text-xs bg-muted px-2 py-1">{log.actor}</code>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
