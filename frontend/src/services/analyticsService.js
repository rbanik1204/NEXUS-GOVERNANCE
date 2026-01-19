import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const SUBGRAPH_ENDPOINTS = [
  'https://api.studio.thegraph.com/query/1723213/nexus-dao-governance/v0.0.2',
  'https://api.studio.thegraph.com/query/1723213/nexus-dao-governance/v0.0.1' // Fallback to earlier version
];

let currentEndpointIndex = 0;

const createClient = (uri) => new ApolloClient({
  uri: uri,
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: 'network-only',
    },
  },
});

let client = createClient(SUBGRAPH_ENDPOINTS[0]);

const rotateEndpoint = () => {
  currentEndpointIndex = (currentEndpointIndex + 1) % SUBGRAPH_ENDPOINTS.length;
  console.warn(`Rotating to fallback subgraph endpoint: ${SUBGRAPH_ENDPOINTS[currentEndpointIndex]}`);
  client = createClient(SUBGRAPH_ENDPOINTS[currentEndpointIndex]);
};

export const GET_DAO_HEALTH = gql`
  query GetDAOHealth {
    citizens(first: 1000) {
      id
      participationRate
      totalVotes
    }
    proposals(first: 1000) {
      id
      status
      totalVotes
      quorumReached
    }
    monthlyStats(first: 12, orderBy: timestamp, orderDirection: desc) {
      id
      proposalsCreated
      proposalsPassed
      totalVotes
      participationRate
      treasuryGrowth
    }
  }
`;

export const GET_GOVERNANCE_METRICS = gql`
  query GetGovernanceMetrics {
    dailyStats(first: 30, orderBy: timestamp, orderDirection: desc) {
      id
      date
      proposalsCreated
      votesCast
      newCitizens
    }
    governanceParameters(first: 20) {
      id
      name
      value
    }
  }
`;

export const GET_TREASURY_ANALYTICS = gql`
  query GetTreasuryAnalytics {
    treasuryTransactions(first: 100, orderBy: timestamp, orderDirection: desc) {
      id
      type
      amount
      tokenSymbol
      timestamp
    }
    budgets(first: 20) {
      id
      category
      amount
      spent
      status
    }
  }
`;

const analyticsService = {
  fetchDAOHealth: async (retry = true) => {
    try {
      const { data } = await client.query({ query: GET_DAO_HEALTH });

      // Calculate aggregate score
      const totalCitizens = data.citizens.length;
      const totalProposals = data.proposals.length;
      const passedProposals = data.proposals.filter(p => p.status === 'EXECUTED' || p.status === 'SUCCEEDED').length;

      const successRate = totalProposals > 0 ? (passedProposals / totalProposals) * 100 : 0;
      const avgParticipation = data.citizens.length > 0
        ? data.citizens.reduce((acc, c) => acc + parseFloat(c.participationRate), 0) / data.citizens.length
        : 0;

      // Health Score Formula: (SuccessRate * 0.4) + (Participation * 0.4) + (VolumeScore * 0.2)
      const volumeScore = Math.min(totalProposals * 5, 20); // Cap at 20
      const healthScore = Math.round((successRate * 0.4) + (avgParticipation * 0.4) + volumeScore);

      return {
        score: healthScore || 50,
        status: healthScore > 75 ? 'Excellent' : healthScore > 50 ? 'Good' : 'Needs Attention',
        color: healthScore > 75 ? 'text-cyber-green' : healthScore > 50 ? 'text-yellow-500' : 'text-red-500',
        metrics: {
          successRate: Math.round(successRate),
          participation: Math.round(avgParticipation),
          totalProposals,
          totalCitizens
        }
      };
    } catch (error) {
      console.error('Error fetching DAO health:', error);
      if (retry && currentEndpointIndex < SUBGRAPH_ENDPOINTS.length - 1) {
        rotateEndpoint();
        return analyticsService.fetchDAOHealth(false);
      }
      return null;
    }
  },

  fetchMonthlyTrends: async () => {
    try {
      const { data } = await client.query({ query: GET_DAO_HEALTH });
      return data.monthlyStats;
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
      return [];
    }
  },

  fetchTreasuryAnalytics: async () => {
    try {
      const { data } = await client.query({ query: GET_TREASURY_ANALYTICS });
      return {
        transactions: data.treasuryTransactions,
        budgets: data.budgets
      };
    } catch (error) {
      console.error('Error fetching treasury analytics:', error);
      return null;
    }
  }
};

export default analyticsService;
