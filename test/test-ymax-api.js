#!/usr/bin/env node

/**
 * Test utility script for the ymax API
 * 
 * This script fetches real data from Agoric APY worker endpoints
 * and tests the ymax API with realistic portfolio data.
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const YMAX_ENDPOINT = `${API_BASE_URL}/api/ymax`;

// APY Worker base URLs
const APY_WORKER_BASE = 'https://apy-worker.agoric-core.workers.dev';
const NOBLE_USDN_URL = 'https://worker.dollar.noble.xyz/';

// Supported pool-chain combinations
const SUPPORTED_POOLS = [
  // Aave on 3 chains
  { platform: 'aave-v3', chain: 'optimism', code: 'usdc%2Busdc' },
  { platform: 'aave-v3', chain: 'arbitrum', code: 'usdc%2Busdc' },
  { platform: 'aave-v3', chain: 'ethereum', code: 'usdc%2Busdc' },
  
  // Compound on 3 chains
  { platform: 'compound-finance', chain: 'ethereum', code: 'usdc%2Busdc' },
  { platform: 'compound-finance', chain: 'arbitrum', code: 'usdc%2Busdc' },
  { platform: 'compound-finance', chain: 'polygon', code: 'usdc%2Busdc' },
 

  // USDN on Noble (special case)
  { platform: 'noble', chain: 'noble', code: 'usdn' }
];

async function fetchWithTimeout(url, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function fetchSinglePoolInfo(pool) {
  if (pool.platform === 'noble') {
    // Special handling for USDN
    try {
      const response = await fetchWithTimeout(NOBLE_USDN_URL);
      return {
        chain: 'noble',
        platform: 'noble',
        token: 'USDN',
        apy: response.earner_rate / 100, // Convert to decimal
        tvl: response.total_supply || 0,
        risk_score: 'low',
        item: { id: null } // No historical data for USDN
      };
    } catch (error) {
      console.warn(`❌ Failed to fetch USDN data: ${error.message}`);
      return {
        chain: 'noble',
        platform: 'noble',
        token: 'USDN',
        apy: 0.055,
        tvl: 50000000,
        risk_score: 'low',
        id: null
      };
    }
  } else {
    // Regular APY worker pools
    const url = `${APY_WORKER_BASE}/opportunities?chain=${pool.chain}&platform=${pool.platform}&code=${pool.code}`;
    try {
      const response = await fetchWithTimeout(url);
      return {
        ...response,
        chain: pool.chain,
        platform: pool.platform
      };
    } catch (error) {
      console.warn(`❌ Failed to fetch ${pool.platform} on ${pool.chain}: ${error.message}`);
      return null;
    }
  }
}

async function fetchAllPoolInfo() {
  console.log('📊 Fetching pool information for all supported chains...');
  const poolInfoByChain = {};
  
  for (const pool of SUPPORTED_POOLS) {
    console.log(`   Fetching ${pool.platform} on ${pool.chain}...`);
    const poolInfo = await fetchSinglePoolInfo(pool);
    
    if (poolInfo) {
      if (!poolInfoByChain[pool.chain]) {
        poolInfoByChain[pool.chain] = {};
      }
      poolInfoByChain[pool.chain][pool.platform] = poolInfo;
    }
  }
  
  console.log('✅ All pool info fetched successfully');
  return poolInfoByChain;
}

async function fetchHistoricalData(poolInfoByChain) {
  console.log('📈 Fetching historical APY/TVL data...');
  const historicalDataByChain = {};
  
  for (const [chainName, chainPools] of Object.entries(poolInfoByChain)) {
    historicalDataByChain[chainName] = {};
    
    for (const [platformName, poolInfo] of Object.entries(chainPools)) {
      if (poolInfo.item.id && chainName !== 'noble') {
        // Fetch historical data using the pool ID
        try {
          const url = `${APY_WORKER_BASE}/historical/${poolInfo.item.id}?interval=MONTH`;
          console.log(`   Fetching historical data for ${platformName} on ${chainName}...`);
          const historicalData = await fetchWithTimeout(url);
          historicalDataByChain[chainName][platformName] = historicalData;
        } catch (error) {
          console.warn(`❌ Failed to fetch historical data for ${platformName} on ${chainName}: ${error.message}`);
          // Fallback historical data
          historicalDataByChain[chainName][platformName] = {
            interval: 'MONTH',
            data: [
              { date: '2024-01-01', apy: poolInfo.apy * 0.9, tvl: poolInfo.tvl * 0.8 },
              { date: '2024-02-01', apy: poolInfo.apy * 0.95, tvl: poolInfo.tvl * 0.9 },
              { date: '2024-03-01', apy: poolInfo.apy, tvl: poolInfo.tvl }
            ]
          };
        }
      } else {
        // No historical data for USDN or pools without ID
        console.log(`   Skipping historical data for ${platformName} on ${chainName} (no ID available)`);
        historicalDataByChain[chainName][platformName] = {
          interval: 'MONTH',
          data: []
        };
      }
    }
  }
  
  console.log('✅ Historical data fetching completed');
  return historicalDataByChain;
}

function createTestRequest(poolInfo, historicalData) {
  return {
    userPrompt: "Please analyze my portfolio and provide optimization recommendations. I'm looking to maximize yield while managing risk appropriately.",
    model: "google",
    context: {
      // Sample balances showing current portfolio state
      balances: {
        "USDC": 10000,
        "currentAllocations": {
          "Aave_USDC": 5000,
          "Compound_USDC": 3000
        }
      },
      
      // Empty as requested
      targetAllocation: {},
      inFlightTxns: [],
      history: [],
      
      // Real data from APY worker
      specificPoolInfo: poolInfo,
      apyTvlHistory: historicalData
    }
  };
}

async function callYmaxAPI(requestData) {
  console.log('🚀 Calling ymax API...');
  const startTime = performance.now();
  
  try {
    const response = await fetch(YMAX_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    console.log(`✅ API call successful! (${duration}ms)`);
    console.log(`⏱️  Performance: ${duration < 5000 ? 'Fast' : duration < 10000 ? 'Moderate' : 'Slow'} response time`);
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    console.error(`❌ API call failed after ${duration}ms: ${error.message}`);
    throw error;
  }
}


async function main() {
  console.log('🧪 YMAX API Test Utility - Multi-Chain Edition');
  console.log('='.repeat(45));
  console.log(`🌐 API Endpoint: ${YMAX_ENDPOINT}`);
  console.log(`📋 Supported chains: ${SUPPORTED_POOLS.length} pool-chain combinations`);
  console.log('');
  
  try {
    // Fetch real data from all APY worker endpoints
    console.log('🔄 Fetching data from multiple chains...');
    const poolInfoByChain = await fetchAllPoolInfo();
    const historicalDataByChain = await fetchHistoricalData(poolInfoByChain);
  
    
    // Create test request
    const requestData = createTestRequest(poolInfoByChain, historicalDataByChain);
    
    // Call ymax API
    const results = await callYmaxAPI(requestData);
    
    console.log(JSON.stringify(results, null, 2));
    
    console.log('\n🎉 Multi-chain test completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test if called directly
if (require.main === module) {
  main();
}

module.exports = { main, fetchAllPoolInfo, fetchHistoricalData, createTestRequest, callYmaxAPI };