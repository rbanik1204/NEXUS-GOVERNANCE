/**
 * NEXUS DAO - Enhanced Demo Mode Context
 * 
 * Implements Part 5: Government Demo Mode
 * 
 * Features:
 * - Clear visual separation between demo and live data
 * - Auto-prompt when wallet connects
 * - Auditor-friendly indicators
 * - Data source tracking
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import web3Service from '../services/web3Service';
import analyticsService from '../services/analyticsService';

const DemoModeContext = createContext();

// Data source types for auditor clarity
export const DataSource = {
    DEMO: 'DEMO',
    BLOCKCHAIN: 'BLOCKCHAIN',
    SUBGRAPH: 'SUBGRAPH',
    CACHE: 'CACHE',
    PENDING: 'PENDING'
};

export function useDemoMode() {
    const context = useContext(DemoModeContext);
    if (!context) {
        throw new Error('useDemoMode must be used within DemoModeProvider');
    }
    return context;
}

export function DemoModeProvider({ children }) {
    // Core state
    // PHASE 2: Demo mode DISABLED by default - show real blockchain data
    const [demoMode, setDemoMode] = useState(false);
    const [showSwitchPrompt, setShowSwitchPrompt] = useState(false);
    const [dataSource, setDataSource] = useState(DataSource.DEMO);
    const [lastRefresh, setLastRefresh] = useState(null);

    // Real blockchain data
    const [realData, setRealData] = useState({
        treasury: {
            totalValue: 0,
            ethBalance: '0',
            budgetCount: 0,
            transactionCount: 0,
        },
        governance: {
            proposalCount: 0,
            totalCitizens: 0,
            votingPeriod: 0,
            quorumPercentage: 0,
        },
        loading: false,
        error: null,
        analytics: {
            healthScore: null,
            monthlyTrends: [],
            treasury: {
                transactions: [],
                budgets: [],
            }
        }
    });

    const { address, isConnected } = useAccount();

    // Auto-prompt to switch to live mode when wallet connects
    useEffect(() => {
        if (isConnected && address && demoMode) {
            // Show prompt to switch to live mode
            setShowSwitchPrompt(true);

            // Auto-dismiss after 10 seconds if user doesn't respond
            const timer = setTimeout(() => {
                setShowSwitchPrompt(false);
            }, 10000);

            return () => clearTimeout(timer);
        }
    }, [isConnected, address, demoMode]);

    // Load real data when switching to live mode
    useEffect(() => {
        if (!demoMode && isConnected && address) {
            loadRealData();
        }
    }, [demoMode, isConnected, address]);

    // Update data source indicator
    useEffect(() => {
        if (demoMode) {
            setDataSource(DataSource.DEMO);
        } else if (realData.loading) {
            setDataSource(DataSource.PENDING);
        } else {
            setDataSource(DataSource.BLOCKCHAIN);
        }
    }, [demoMode, realData.loading]);

    const loadRealData = useCallback(async () => {
        setRealData(prev => ({ ...prev, loading: true, error: null }));
        setDataSource(DataSource.PENDING);

        try {
            await web3Service.initialize();

            // Load treasury data
            const ethBalance = await web3Service.getTreasuryBalance();
            const budgetCount = await web3Service.getBudgetCount();

            // Load governance data
            const proposalCount = await web3Service.getProposalCount();
            const totalCitizens = await web3Service.getTotalCitizens();
            const govParams = await web3Service.getGovernanceParams();

            // Load analytics
            const dpoHealth = await analyticsService.fetchDAOHealth();
            const monthlyStats = await analyticsService.fetchMonthlyTrends();
            const treasuryAnalytics = await analyticsService.fetchTreasuryAnalytics();

            setRealData({
                treasury: {
                    totalValue: parseFloat(ethBalance) * 2000, // Rough USD estimate
                    ethBalance,
                    budgetCount,
                    transactionCount: treasuryAnalytics?.transactions?.length || 0,
                },
                governance: {
                    proposalCount,
                    totalCitizens,
                    votingPeriod: govParams?.votingPeriod || 0,
                    quorumPercentage: govParams?.quorumPercentage || 0,
                },
                analytics: {
                    healthScore: dpoHealth,
                    monthlyTrends: monthlyStats || [],
                    treasury: {
                        transactions: treasuryAnalytics?.transactions || [],
                        budgets: treasuryAnalytics?.budgets || [],
                    }
                },
                loading: false,
                error: null,
            });

            setDataSource(DataSource.BLOCKCHAIN);
            setLastRefresh(new Date());

        } catch (error) {
            console.error('Error loading real data:', error);
            setRealData(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to load blockchain data'
            }));
            setDataSource(DataSource.DEMO); // Fall back to demo
        }
    }, []);

    // Switch to live mode with confirmation
    const switchToLiveMode = useCallback(() => {
        setDemoMode(false);
        setShowSwitchPrompt(false);
    }, []);

    // Switch to demo mode
    const switchToDemoMode = useCallback(() => {
        setDemoMode(true);
        setDataSource(DataSource.DEMO);
    }, []);

    // Dismiss the switch prompt
    const dismissSwitchPrompt = useCallback(() => {
        setShowSwitchPrompt(false);
    }, []);

    // Get current mode label for display
    const getModeLabel = useCallback(() => {
        if (demoMode) return 'DEMO MODE';
        if (realData.loading) return 'LOADING...';
        return 'LIVE MODE';
    }, [demoMode, realData.loading]);

    // Get data source label for auditors
    const getDataSourceLabel = useCallback(() => {
        switch (dataSource) {
            case DataSource.DEMO:
                return 'Demonstration Data';
            case DataSource.BLOCKCHAIN:
                return 'Sepolia Blockchain (Live)';
            case DataSource.SUBGRAPH:
                return 'Subgraph v0.0.2 (Indexed)';
            case DataSource.CACHE:
                return 'Cached Data';
            case DataSource.PENDING:
                return 'Fetching from blockchain...';
            default:
                return 'Unknown Source';
        }
    }, [dataSource]);

    // Check if current data is from blockchain
    const isLiveData = useCallback(() => {
        return !demoMode && dataSource === DataSource.BLOCKCHAIN;
    }, [demoMode, dataSource]);

    // Get warning message if data might be stale or demo
    const getDataWarning = useCallback(() => {
        if (demoMode) {
            return {
                type: 'warning',
                message: 'Displaying demonstration data. Switch to Live Mode for blockchain data.',
                action: 'Switch to Live'
            };
        }

        if (realData.error) {
            return {
                type: 'error',
                message: `Error loading data: ${realData.error}`,
                action: 'Retry'
            };
        }

        if (lastRefresh) {
            const minutesSinceRefresh = (Date.now() - lastRefresh.getTime()) / 60000;
            if (minutesSinceRefresh > 5) {
                return {
                    type: 'info',
                    message: `Data last refreshed ${Math.floor(minutesSinceRefresh)} minutes ago`,
                    action: 'Refresh'
                };
            }
        }

        return null;
    }, [demoMode, realData.error, lastRefresh]);

    const contextValue = {
        // Core state
        demoMode,
        setDemoMode,
        realData,
        loading: realData.loading,
        error: realData.error,

        // Data source tracking
        dataSource,
        lastRefresh,

        // UI state
        showSwitchPrompt,

        // Actions
        loadRealData,
        switchToLiveMode,
        switchToDemoMode,
        dismissSwitchPrompt,

        // Display helpers
        getModeLabel,
        getDataSourceLabel,
        isLiveData,
        getDataWarning,

        // Convenience flags
        isDemo: demoMode,
        isLive: !demoMode,
        isConnected: isConnected && !!address,
        walletAddress: address
    };

    return (
        <DemoModeContext.Provider value={contextValue}>
            {children}
        </DemoModeContext.Provider>
    );
}

// Export DataSource for use in components
export { DataSource as DemoDataSource };
