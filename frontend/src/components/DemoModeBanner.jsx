/**
 * NEXUS DAO - Demo Mode Banner
 * 
 * Provides clear visual separation between demo and live data
 * for government auditor clarity.
 */

import React from 'react';
import { useDemoMode } from '../contexts/DemoModeContext';
import { AlertTriangle, Wifi, WifiOff, RefreshCw, X, Check } from 'lucide-react';

export function DemoModeBanner() {
    const {
        demoMode,
        showSwitchPrompt,
        switchToLiveMode,
        dismissSwitchPrompt,
        getDataSourceLabel,
        isConnected,
        loading
    } = useDemoMode();

    // Live Mode Banner
    if (!demoMode) {
        return (
            <div className="bg-cyber-green/90 text-background py-2 px-4 text-center font-bold text-sm flex items-center justify-center gap-2">
                <Wifi className="w-4 h-4" />
                <span>🔴 LIVE MODE - Connected to Sepolia Network</span>
                <span className="text-xs opacity-80 ml-2">
                    | Source: {getDataSourceLabel()}
                </span>
            </div>
        );
    }

    // Switch Prompt Banner
    if (showSwitchPrompt && isConnected) {
        return (
            <div className="bg-primary text-primary-foreground py-3 px-4">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Check className="w-5 h-5" />
                        <span className="font-bold">Wallet Connected! Switch to Live Mode to view real blockchain data?</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={switchToLiveMode}
                            className="bg-background text-foreground px-4 py-1 font-bold text-sm brutal-card hover:scale-102 transition-all"
                        >
                            Switch to Live
                        </button>
                        <button
                            onClick={dismissSwitchPrompt}
                            className="p-1 hover:bg-white/20 rounded"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Demo Mode Banner (Default)
    return (
        <div className="bg-yellow-500 text-black py-2 px-4">
            <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-bold text-sm">
                        ⚠️ DEMO MODE - Displaying simulated data for demonstration purposes only
                    </span>
                </div>
                {isConnected && (
                    <button
                        onClick={switchToLiveMode}
                        className="bg-black text-yellow-500 px-3 py-1 font-bold text-xs brutal-card hover:scale-102 transition-all flex items-center gap-1"
                    >
                        <Wifi className="w-3 h-3" />
                        Switch to Live
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Data Source Badge - Shows where data is coming from
 */
export function DataSourceBadge({ className = '' }) {
    const { demoMode, getDataSourceLabel, loading } = useDemoMode();

    if (loading) {
        return (
            <div className={`flex items-center gap-1 text-xs ${className}`}>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span className="text-muted-foreground">Loading...</span>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-1 text-xs ${className}`}>
            {demoMode ? (
                <WifiOff className="w-3 h-3 text-yellow-500" />
            ) : (
                <Wifi className="w-3 h-3 text-cyber-green" />
            )}
            <span className={demoMode ? 'text-yellow-500' : 'text-cyber-green'}>
                {getDataSourceLabel()}
            </span>
        </div>
    );
}

/**
 * Demo Data Warning - For individual cards/components
 */
export function DemoDataWarning({ show = true }) {
    const { demoMode } = useDemoMode();

    if (!demoMode || !show) return null;

    return (
        <div className="text-xs text-yellow-500 flex items-center gap-1 mt-2">
            <AlertTriangle className="w-3 h-3" />
            <span>Demo Data - Not from blockchain</span>
        </div>
    );
}

/**
 * Live Data Indicator - Shows when data is verified from chain
 */
export function LiveDataIndicator({ txHash, blockNumber }) {
    const { demoMode } = useDemoMode();

    if (demoMode) return null;

    return (
        <div className="text-xs text-cyber-green flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>Verified on-chain</span>
            {txHash && (
                <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white"
                >
                    (View TX)
                </a>
            )}
        </div>
    );
}

export default DemoModeBanner;
