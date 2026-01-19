import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { WagmiProvider } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 1. Get projectId from https://cloud.walletconnect.com
// For now using a demo project ID - replace with your own for production
const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'c4f79cc821944d9680842e34466bfbd';

// 2. Create wagmiConfig
const metadata = {
    name: 'NEXUS DAO',
    description: 'Government-Grade Decentralized Governance Platform',
    url: 'https://nexus-org.web.app',
    icons: ['https://nexus-org.web.app/logo.png']
};

const chains = [sepolia];
export const config = defaultWagmiConfig({
    chains,
    projectId,
    metadata,
});

// 3. Create modal
createWeb3Modal({
    wagmiConfig: config,
    projectId,
    enableAnalytics: true,
    enableOnramp: true,
    themeMode: 'dark',
    themeVariables: {
        '--w3m-accent': '#8b5cf6',
        '--w3m-border-radius-master': '2px',
    }
});

export const queryClient = new QueryClient();

export function Web3Provider({ children }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}
