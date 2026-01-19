import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import {
    FileText, Plus, Clock, CheckCircle, XCircle,
    TrendingUp, Users, Loader2, Vote, AlertCircle,
    ExternalLink, ThumbsUp, ThumbsDown, Minus, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { useDemoMode } from '../contexts/DemoModeContext';
import { useAccount } from 'wagmi';
import web3Service from '../services/web3Service';
import votingService, { VotingError, ERROR_MESSAGES } from '../services/votingService';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';

const PROPOSAL_TYPES = [
    { value: 0, label: 'General', description: 'General governance proposal' },
    { value: 1, label: 'Treasury', description: 'Treasury spending proposal' },
    { value: 2, label: 'Parameter', description: 'Change governance parameters' },
    { value: 3, label: 'Upgrade', description: 'Contract upgrade proposal' },
    { value: 4, label: 'Emergency', description: 'Emergency action' },
];

const PROPOSAL_STATUS = {
    0: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
    1: { label: 'Active', color: 'bg-blue-500', icon: Vote },
    2: { label: 'Canceled', color: 'bg-gray-500', icon: XCircle },
    3: { label: 'Defeated', color: 'bg-red-500', icon: XCircle },
    4: { label: 'Succeeded', color: 'bg-green-500', icon: CheckCircle },
    5: { label: 'Queued', color: 'bg-purple-500', icon: Clock },
    6: { label: 'Expired', color: 'bg-gray-500', icon: XCircle },
    7: { label: 'Executed', color: 'bg-cyber-green', icon: CheckCircle },
};

export default function ProposalsList({ walletConnected }) {
    const { demoMode, realData } = useDemoMode();
    const { address, isConnected } = useAccount();
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [creating, setCreating] = useState(false);

    // Voting state
    const [votingProposalId, setVotingProposalId] = useState(null);
    const [votingSupport, setVotingSupport] = useState(null);
    const [votingStatus, setVotingStatus] = useState(null); // 'checking' | 'sending' | 'confirming' | 'confirmed' | 'error'
    const [votingResult, setVotingResult] = useState(null);
    const [userVotes, setUserVotes] = useState({}); // { proposalId: { support, weight, txHash } }
    const [votingPower, setVotingPower] = useState(null);

    // Form state
    const [newProposal, setNewProposal] = useState({
        title: '',
        description: '',
        type: 0,
    });

    useEffect(() => {
        if (demoMode) {
            loadDemoProposals();
        } else {
            loadRealProposals();
        }
    }, [demoMode, realData.governance.proposalCount]);

    // Check user's existing votes when wallet connects
    useEffect(() => {
        if (isConnected && address && !demoMode && proposals.length > 0) {
            checkUserVotes();
        }
    }, [isConnected, address, proposals, demoMode]);

    const checkUserVotes = async () => {
        // This would check hasVoted for each proposal
        // For now, we'll track votes locally after user votes
    };

    const loadDemoProposals = () => {
        // PHASE 2: No more fake demo data
        // If in demo mode, show empty state with honest message
        setProposals([]);
    };

    const loadRealProposals = async () => {
        if (realData.governance.proposalCount === 0) {
            setProposals([]);
            return;
        }

        setLoading(true);
        try {
            const proposalPromises = [];
            for (let i = 1; i <= realData.governance.proposalCount; i++) {
                proposalPromises.push(web3Service.getProposal(i));
            }
            const loadedProposals = await Promise.all(proposalPromises);
            setProposals(loadedProposals.filter(p => p !== null));
        } catch (error) {
            console.error('Error loading proposals:', error);
            toast.error('Failed to load proposals');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProposal = async () => {
        if (!newProposal.title || !newProposal.description) {
            toast.error('Please fill in all fields');
            return;
        }

        if (!walletConnected) {
            toast.error('Please connect your wallet first');
            return;
        }

        setCreating(true);

        if (demoMode) {
            // Demo mode - simulate creation
            setTimeout(() => {
                const mockProposal = {
                    id: proposals.length + 1,
                    title: newProposal.title,
                    description: newProposal.description,
                    proposer: '0xYour...Address',
                    status: 0,
                    forVotes: 0,
                    againstVotes: 0,
                    abstainVotes: 0,
                    startTime: Date.now(),
                    endTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
                    type: newProposal.type,
                };
                setProposals([mockProposal, ...proposals]);
                setCreateDialogOpen(false);
                setNewProposal({ title: '', description: '', type: 0 });
                toast.success('Proposal created successfully (Demo)');
                setCreating(false);
            }, 2000);
        } else {
            // Real mode - create on blockchain
            try {
                const fullDescription = `${newProposal.title}\n\n${newProposal.description}`;
                await web3Service.createProposal(fullDescription, newProposal.type);
                toast.success('Proposal created successfully!');
                setCreateDialogOpen(false);
                setNewProposal({ title: '', description: '', type: 0 });
                // Reload proposals
                setTimeout(() => loadRealProposals(), 3000);
            } catch (error) {
                console.error('Error creating proposal:', error);
                toast.error('Failed to create proposal: ' + (error.message || 'Unknown error'));
            } finally {
                setCreating(false);
            }
        }
    };

    // ========================================
    // VOTING HANDLER - Full Pipeline
    // ========================================
    const handleVote = async (proposalId, support) => {
        // support: 0 = Against, 1 = For, 2 = Abstain

        if (!isConnected || !address) {
            toast.error('Please connect your wallet to vote');
            return;
        }

        if (demoMode) {
            // Demo mode voting simulation
            setVotingProposalId(proposalId);
            setVotingSupport(support);
            setVotingStatus('checking');

            setTimeout(() => {
                setVotingStatus('sending');
                setTimeout(() => {
                    setVotingStatus('confirming');
                    setTimeout(() => {
                        setVotingStatus('confirmed');
                        setUserVotes(prev => ({
                            ...prev,
                            [proposalId]: { support, weight: 1, txHash: '0xdemo...' }
                        }));

                        // Update proposal vote counts
                        setProposals(prev => prev.map(p => {
                            if (p.id === proposalId) {
                                const updated = { ...p };
                                if (support === 1) updated.forVotes += 1;
                                else if (support === 0) updated.againstVotes += 1;
                                else updated.abstainVotes += 1;
                                return updated;
                            }
                            return p;
                        }));

                        toast.success(`Vote recorded: ${support === 1 ? 'For' : support === 0 ? 'Against' : 'Abstain'}`);

                        setTimeout(() => {
                            setVotingProposalId(null);
                            setVotingStatus(null);
                        }, 2000);
                    }, 1500);
                }, 1500);
            }, 1000);
            return;
        }

        // Real voting pipeline
        setVotingProposalId(proposalId);
        setVotingSupport(support);
        setVotingStatus('checking');
        setVotingResult(null);

        try {
            const result = await votingService.vote(proposalId, support, address, {
                onStart: () => {
                    setVotingStatus('checking');
                },
                onEligibilityChecked: (eligibility) => {
                    console.log('Eligibility:', eligibility);
                },
                onPowerCalculated: (power) => {
                    setVotingPower(power);
                    toast.info(`Voting with ${power.totalPower} voting power`);
                },
                onTransactionSent: (pending) => {
                    setVotingStatus('confirming');
                    toast.loading(`Transaction sent: ${pending.txHash.slice(0, 10)}...`, {
                        id: 'voting-tx'
                    });
                },
                onConfirmed: (confirmed) => {
                    setVotingStatus('confirmed');
                    setVotingResult(confirmed);
                    setUserVotes(prev => ({
                        ...prev,
                        [proposalId]: {
                            support,
                            weight: confirmed.weight || votingPower?.totalPower || 1,
                            txHash: confirmed.txHash
                        }
                    }));

                    toast.success(
                        <div>
                            <div className="font-bold">Vote Confirmed!</div>
                            <a
                                href={confirmed.explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs underline"
                            >
                                View on Etherscan →
                            </a>
                        </div>,
                        { id: 'voting-tx', duration: 5000 }
                    );

                    // Refresh proposals after vote
                    setTimeout(() => loadRealProposals(), 2000);
                },
                onError: (error) => {
                    setVotingStatus('error');
                    toast.dismiss('voting-tx');
                }
            });

        } catch (error) {
            console.error('Voting error:', error);
            setVotingStatus('error');

            if (error instanceof VotingError) {
                toast.error(error.message, { duration: 5000 });
            } else {
                toast.error(error.message || 'An error occurred while voting');
            }
        } finally {
            setTimeout(() => {
                setVotingProposalId(null);
                setVotingStatus(null);
            }, 3000);
        }
    };

    const getTimeRemaining = (endTime) => {
        const now = Date.now();
        const diff = endTime - now;
        if (diff <= 0) return 'Ended';

        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

        if (days > 0) return `${days}d ${hours}h remaining`;
        return `${hours}h remaining`;
    };

    const getVotePercentage = (forVotes, againstVotes, abstainVotes) => {
        const total = forVotes + againstVotes + abstainVotes;
        if (total === 0) return { for: 0, against: 0, abstain: 0 };
        return {
            for: (forVotes / total) * 100,
            against: (againstVotes / total) * 100,
            abstain: (abstainVotes / total) * 100,
        };
    };

    const hasUserVoted = (proposalId) => {
        return userVotes[proposalId] !== undefined;
    };

    const getUserVote = (proposalId) => {
        return userVotes[proposalId];
    };

    const renderVoteButtons = (proposal) => {
        const isVoting = votingProposalId === proposal.id;
        const userVote = getUserVote(proposal.id);
        const hasVoted = hasUserVoted(proposal.id);

        if (hasVoted) {
            // User has voted - show their vote
            return (
                <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-cyber-green" />
                            <span className="text-sm font-bold">
                                You voted:
                                <Badge className={`ml-2 ${userVote.support === 1 ? 'bg-cyber-green' :
                                    userVote.support === 0 ? 'bg-red-500' : 'bg-gray-500'
                                    } text-white`}>
                                    {userVote.support === 1 ? 'For' : userVote.support === 0 ? 'Against' : 'Abstain'}
                                </Badge>
                            </span>
                            {userVote.weight && (
                                <span className="text-xs text-muted-foreground">
                                    ({userVote.weight} votes)
                                </span>
                            )}
                        </div>
                        {userVote.txHash && (
                            <a
                                href={`https://sepolia.etherscan.io/tx/${userVote.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary flex items-center gap-1 hover:underline"
                            >
                                <ExternalLink className="w-3 h-3" />
                                View TX
                            </a>
                        )}
                    </div>
                </div>
            );
        }

        // Voting in progress
        if (isVoting) {
            return (
                <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-center gap-3 py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span className="font-bold">
                            {votingStatus === 'checking' && 'Verifying eligibility...'}
                            {votingStatus === 'sending' && 'Sending transaction...'}
                            {votingStatus === 'confirming' && 'Waiting for confirmation...'}
                            {votingStatus === 'confirmed' && 'Vote recorded!'}
                            {votingStatus === 'error' && 'Voting failed'}
                        </span>
                    </div>
                </div>
            );
        }

        // Show vote buttons
        return (
            <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold">Cast Your Vote</span>
                    {votingPower && (
                        <span className="text-xs text-muted-foreground">
                            Voting Power: {votingPower.totalPower}
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        className="brutal-card bg-cyber-green hover:bg-cyber-green/90 text-background font-bold flex-1"
                        onClick={() => handleVote(proposal.id, 1)}
                        disabled={votingProposalId !== null}
                    >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Vote For
                    </Button>
                    <Button
                        size="sm"
                        className="brutal-card bg-red-500 hover:bg-red-500/90 text-white font-bold flex-1"
                        onClick={() => handleVote(proposal.id, 0)}
                        disabled={votingProposalId !== null}
                    >
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        Vote Against
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="brutal-card font-bold"
                        onClick={() => handleVote(proposal.id, 2)}
                        disabled={votingProposalId !== null}
                    >
                        <Minus className="w-4 h-4 mr-2" />
                        Abstain
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="brutal-card glass">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-3xl font-black flex items-center gap-3">
                            <FileText className="w-8 h-8 text-primary" strokeWidth={3} />
                            Governance Proposals
                            {!demoMode && (
                                <Badge variant="outline" className="brutal-card text-xs">
                                    LIVE DATA
                                </Badge>
                            )}
                        </CardTitle>
                        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    className="brutal-card bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                                    disabled={!walletConnected}
                                >
                                    <Plus className="w-5 h-5 mr-2" />
                                    Create Proposal
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="brutal-card max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black">Create New Proposal</DialogTitle>
                                    <DialogDescription>
                                        Submit a proposal for community voting
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 mt-4">
                                    <div>
                                        <Label htmlFor="title" className="font-bold">Proposal Title</Label>
                                        <Input
                                            id="title"
                                            placeholder="Enter proposal title..."
                                            value={newProposal.title}
                                            onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
                                            className="brutal-card mt-2"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="type" className="font-bold">Proposal Type</Label>
                                        <Select
                                            value={newProposal.type.toString()}
                                            onValueChange={(value) => setNewProposal({ ...newProposal, type: parseInt(value) })}
                                        >
                                            <SelectTrigger className="brutal-card mt-2">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="brutal-card">
                                                {PROPOSAL_TYPES.map((type) => (
                                                    <SelectItem key={type.value} value={type.value.toString()}>
                                                        <div>
                                                            <div className="font-bold">{type.label}</div>
                                                            <div className="text-xs text-muted-foreground">{type.description}</div>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="description" className="font-bold">Description</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Provide detailed description of your proposal..."
                                            value={newProposal.description}
                                            onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
                                            className="brutal-card mt-2 min-h-[150px]"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleCreateProposal}
                                        disabled={creating}
                                        className="w-full brutal-card bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                                    >
                                        {creating ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-5 h-5 mr-2" />
                                                Submit Proposal
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
            </Card>

            {/* Voting Eligibility Banner */}
            {isConnected && !demoMode && (
                <Card className="brutal-card bg-primary/10 border-2 border-primary">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-primary" />
                                <div>
                                    <span className="font-bold">Connected: </span>
                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                        {address?.slice(0, 6)}...{address?.slice(-4)}
                                    </code>
                                </div>
                            </div>
                            <Badge className="bg-cyber-green text-background font-bold">
                                Ready to Vote
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Proposals List */}
            {loading ? (
                <Card className="brutal-card glass">
                    <CardContent className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="ml-3 text-muted-foreground">Loading proposals...</span>
                    </CardContent>
                </Card>
            ) : proposals.length === 0 ? (
                <Card className="brutal-card glass">
                    <CardContent className="py-12 text-center">
                        <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-bold text-lg mb-2">No Proposals Yet</h3>
                        <p className="text-muted-foreground mb-4">
                            {demoMode
                                ? 'Toggle demo mode off to see real proposals, or create one!'
                                : 'Be the first to create a proposal for the community to vote on.'}
                        </p>
                        {walletConnected && (
                            <Button
                                onClick={() => setCreateDialogOpen(true)}
                                className="brutal-card bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                Create First Proposal
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {proposals.map((proposal) => {
                        const status = PROPOSAL_STATUS[proposal.status] || PROPOSAL_STATUS[0];
                        const StatusIcon = status.icon;
                        const percentages = getVotePercentage(
                            proposal.forVotes,
                            proposal.againstVotes,
                            proposal.abstainVotes
                        );
                        const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;

                        return (
                            <Card key={proposal.id} className="brutal-card glass hover:translate-x-1 hover:translate-y-1 transition-all">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Badge className={`brutal-card ${status.color} text-white font-bold`}>
                                                    <StatusIcon className="w-3 h-3 mr-1" />
                                                    {status.label}
                                                </Badge>
                                                <Badge variant="outline" className="brutal-card">
                                                    {PROPOSAL_TYPES.find(t => t.value === proposal.type)?.label || 'General'}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">#{proposal.id}</span>
                                            </div>
                                            <h3 className="text-xl font-black mb-2">{proposal.title}</h3>
                                            <p className="text-muted-foreground text-sm mb-3">{proposal.description}</p>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span>Proposed by {proposal.proposer}</span>
                                                {proposal.status === 1 && (
                                                    <span className="font-semibold text-primary">
                                                        <Clock className="w-3 h-3 inline mr-1" />
                                                        {getTimeRemaining(proposal.endTime)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Voting Stats */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-semibold mb-1">
                                            <span>Voting Results</span>
                                            <span className="text-muted-foreground">
                                                <Users className="w-3 h-3 inline mr-1" />
                                                {totalVotes.toLocaleString()} votes
                                            </span>
                                        </div>

                                        {/* For Votes */}
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-semibold text-cyber-green">For</span>
                                                <span>{percentages.for.toFixed(1)}% ({proposal.forVotes.toLocaleString()})</span>
                                            </div>
                                            <div className="h-2 brutal-card bg-muted overflow-hidden">
                                                <div
                                                    className="h-full bg-cyber-green transition-all"
                                                    style={{ width: `${percentages.for}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Against Votes */}
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-semibold text-destructive">Against</span>
                                                <span>{percentages.against.toFixed(1)}% ({proposal.againstVotes.toLocaleString()})</span>
                                            </div>
                                            <div className="h-2 brutal-card bg-muted overflow-hidden">
                                                <div
                                                    className="h-full bg-destructive transition-all"
                                                    style={{ width: `${percentages.against}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Abstain Votes */}
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-semibold text-muted-foreground">Abstain</span>
                                                <span>{percentages.abstain.toFixed(1)}% ({proposal.abstainVotes.toLocaleString()})</span>
                                            </div>
                                            <div className="h-2 brutal-card bg-muted overflow-hidden">
                                                <div
                                                    className="h-full bg-muted-foreground transition-all"
                                                    style={{ width: `${percentages.abstain}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Vote Button - Only for active proposals and connected wallet */}
                                    {proposal.status === 1 && (walletConnected || isConnected) && (
                                        renderVoteButtons(proposal)
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
