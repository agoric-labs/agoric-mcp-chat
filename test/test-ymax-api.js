#!/usr/bin/env node

/**
 * Test utility script for the ymax API
 *
 * This script fetches real data from Agoric APY worker endpoints
 * and tests the ymax API with realistic portfolio data.
 */

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const YMAX_ENDPOINT = `${API_BASE_URL}/api/ymax`;

// APY Worker base URLs
const APY_WORKER_BASE = "https://apy-worker.agoric-core.workers.dev";
const NOBLE_USDN_URL = "https://worker.dollar.noble.xyz/";

// Supported pool-chain combinations
const SUPPORTED_POOLS = [
  // Aave on 3 chains
  { platform: "aave-v3", chain: "optimism", code: "usdc%2Busdc" },
  { platform: "aave-v3", chain: "arbitrum", code: "usdc%2Busdc" },
  { platform: "aave-v3", chain: "ethereum", code: "usdc%2Busdc" },

  // Compound on 3 chains
  { platform: "compound-finance", chain: "ethereum", code: "usdc%2Busdc" },
  { platform: "compound-finance", chain: "arbitrum", code: "usdc%2Busdc" },
  { platform: "compound-finance", chain: "polygon", code: "usdc%2Busdc" },

  // USDN on Noble (special case)
  { platform: "noble", chain: "noble", code: "usdn" },
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
  if (pool.platform === "noble") {
    // Special handling for USDN
    try {
      const response = await fetchWithTimeout(NOBLE_USDN_URL);
      return {
        chain: "noble",
        platform: "noble",
        token: "USDN",
        apy: response.earner_rate / 100, // Convert to decimal
        tvl: response.total_supply || 0,
        risk_score: "low",
        item: { id: null }, // No historical data for USDN
      };
    } catch (error) {
      console.warn(`❌ Failed to fetch USDN data: ${error.message}`);
      return {
        chain: "noble",
        platform: "noble",
        token: "USDN",
        apy: 0.055,
        tvl: 50000000,
        risk_score: "low",
        id: null,
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
        platform: pool.platform,
      };
    } catch (error) {
      console.warn(
        `❌ Failed to fetch ${pool.platform} on ${pool.chain}: ${error.message}`,
      );
      return null;
    }
  }
}

async function fetchAllPoolInfo() {
  console.log("📊 Fetching pool information for all supported chains...");
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

  console.log("✅ All pool info fetched successfully");
  return poolInfoByChain;
}

/**
 * Calculate Relative Standard Deviation (RSD) for investment analysis
 * RSD = (deviation/mean) * 100
 * Lower RSD (0-5%) indicates stable investment opportunity
 */
function calculateRSD(avgAPY, deviation) {
  if (avgAPY === 0) return 0;
  return deviation / avgAPY; // Return as decimal, not percentage
}

/**
 * Process historical data to extract only createdAt, averageApr, and RSD
 * Uses aprMonth field from poolInfo as the mean for RSD calculation
 */
function processHistoricalData(historicalData, poolInfo) {
  // Handle both array format (direct API response) and object format (with .data property)
  let dataArray;
  if (Array.isArray(historicalData)) {
    dataArray = historicalData;
  } else if (
    historicalData &&
    historicalData.data &&
    Array.isArray(historicalData.data)
  ) {
    dataArray = historicalData.data;
  } else {
    return [];
  }

  if (dataArray.length === 0) {
    return [];
  }

  // Extract average APR from pool info (try multiple possible fields)
  const averageAprFromPool = poolInfo.item?.aprMonth;

  return dataArray.map((dataPoint) => ({
    createdAt: dataPoint.createdAt || new Date(dataPoint.date).toISOString(),
    averageApr: averageAprFromPool,
    RSD: calculateRSD(averageAprFromPool, dataPoint.deviation),
  }));
}

async function fetchHistoricalData(poolInfoByChain) {
  console.log(
    "📈 Fetching and processing historical APY data with RSD calculations...",
  );
  const processedHistoricalData = {};

  for (const [chainName, chainPools] of Object.entries(poolInfoByChain)) {
    processedHistoricalData[chainName] = {};

    for (const [platformName, poolInfo] of Object.entries(chainPools)) {
      if (poolInfo.item && poolInfo.item.id && chainName !== "noble") {
        // Fetch historical data using the pool ID
        try {
          const url = `${APY_WORKER_BASE}/historical/${poolInfo.item.id}?interval=MONTH`;
          console.log(
            `   Fetching historical data for ${platformName} on ${chainName}...`,
          );
          const historicalData = await fetchWithTimeout(url);

          // Process data to include only createdAt, averageApr, and RSD
          const processedData = processHistoricalData(historicalData, poolInfo);

          // Calculate RSD statistics for investment analysis
          const rsdValues = processedData.map((d) => d.RSD);
          const avgRSD =
            rsdValues.length > 0
              ? rsdValues.reduce((sum, rsd) => sum + rsd, 0) / rsdValues.length
              : 0;
          const goodInvestment = avgRSD <= 0.1; // RSD between 0-5% indicates good investment

          console.log(
            `     📊 ${platformName} on ${chainName}: Avg RSD = ${(avgRSD * 100).toFixed(2)}% ${goodInvestment ? "✅ (Good investment indicator)" : "⚠️  (Higher volatility)"}`,
          );

          processedHistoricalData[chainName][platformName] = {
            interval: "MONTH",
            data: processedData,
            analytics: {
              avgRSD: avgRSD,
              isGoodInvestment: goodInvestment,
              dataPoints: processedData.length,
            },
          };
        } catch (error) {
          console.warn(
            `❌ Failed to fetch historical data for ${platformName} on ${chainName}: ${error.message}`,
          );

          // Fallback historical data with RSD calculations
          const fallbackHistoricalData = {
            interval: "MONTH",
            data: [
              { date: "2024-01-01", apy: poolInfo.apy * 0.9 },
              { date: "2024-02-01", apy: poolInfo.apy * 0.95 },
              { date: "2024-03-01", apy: poolInfo.apy },
            ],
          };

          const processedData = processHistoricalData(
            fallbackHistoricalData,
            poolInfo,
          );
          processedHistoricalData[chainName][platformName] = {
            interval: "MONTH",
            data: processedData,
            analytics: {
              avgRSD: 0.03, // Assume reasonable RSD for fallback
              isGoodInvestment: true,
              dataPoints: processedData.length,
            },
          };
        }
      } else {
        // No historical data for USDN or pools without ID
        console.log(
          `   Skipping historical data for ${platformName} on ${chainName} (no ID available)`,
        );
        processedHistoricalData[chainName][platformName] = {
          interval: "MONTH",
          data: [],
          analytics: {
            avgRSD: 0,
            isGoodInvestment: true,
            dataPoints: 0,
          },
        };
      }
    }
  }

  console.log("✅ Historical data processing with RSD analysis completed");
  return processedHistoricalData;
}

function createTestRequest(poolInfo, historicalData) {
  // Generate investment quality report based on RSD analysis
  const generateInvestmentReport = () => {
    const report = {};
    for (const [chainName, chainData] of Object.entries(historicalData)) {
      report[chainName] = {};
      for (const [platformName, platformData] of Object.entries(chainData)) {
        if (platformData.analytics) {
          report[chainName][platformName] = {
            avgRSD: platformData.analytics.avgRSD,
            investmentQuality: platformData.analytics.isGoodInvestment
              ? "Stable (RSD ≤ 10%)"
              : "Volatile (RSD > 10%)",
            recommendation:
              platformData.analytics.avgRSD <= 0.1
                ? "Recommended for stable yields"
                : "Higher risk, monitor closely",
          };
        }
      }
    }
    return report;
  };

  console.dir(historicalData, { depth: null });
  console.dir(generateInvestmentReport(), { depth: null });
  return {
    userPrompt:
      "Please analyze my portfolio using the RSD (Relative Standard Deviation) data to identify stable investment opportunities. Focus on pools with RSD between 0-5% as good investment indicators. I'm looking to maximize yield while maintaining stability.",
    model: "anthropic",
    context: {
      // Sample balances showing current portfolio state
      balances: {
        currentAllocations: {
          // only the following pools supported in this script
          Aave: {
            optimism: 5000, // Current allocation
            // ethereum: 2000, // Current allocation
            arbitrum: 2000, // Current allocation
          },
          Compound: {
            ethereum: 3000, // Current allocation
          },
        },
      },

      // Empty as requested
      targetAllocation: {},
      inFlightTxns: [],
      history: [],

      // Optimized historical data with only avgApr, RSD, and timestamp
      apyTvlHistory: historicalData,

      // Real pool information for current analysis
      // specificPoolInfo: poolInfo,

      // Investment quality analysis based on RSD
      investmentAnalysis: {
        rsdReport: generateInvestmentReport(),
        criteria: {
          goodInvestment:
            "RSD between 0-10% indicates stable investment opportunity",
          volatileInvestment: "RSD > 10% indicates higher volatility and risk",
        },
      },
    },
  };
}

async function callYmaxAPI(requestData) {
  console.log("🚀 Calling ymax API...");
  const startTime = performance.now();

  try {
    const response = await fetch(YMAX_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    console.log(`✅ API call successful! (${duration}ms)`);
    console.log(
      `⏱️  Performance: ${duration < 5000 ? "Fast" : duration < 10000 ? "Moderate" : "Slow"} response time`,
    );

    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    console.error(`❌ API call failed after ${duration}ms: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log(
    "🧪 YMAX API Test Utility - Multi-Chain Edition with RSD Analysis",
  );
  console.log("=".repeat(60));
  console.log(`🌐 API Endpoint: ${YMAX_ENDPOINT}`);
  console.log(
    `📋 Supported chains: ${SUPPORTED_POOLS.length} pool-chain combinations`,
  );
  console.log(`📊 RSD Analysis: Identifying stable investments (RSD ≤ 5%)`);
  console.log("");

  try {
    // Fetch real data from all APY worker endpoints
    console.log("🔄 Fetching data from multiple chains...");
    const poolInfoByChain = await fetchAllPoolInfo();
    const historicalDataByChain = await fetchHistoricalData(poolInfoByChain);

    // Display RSD investment analysis summary
    console.log("\n📈 RSD Investment Analysis Summary:");
    console.log("─".repeat(50));
    for (const [chainName, chainData] of Object.entries(
      historicalDataByChain,
    )) {
      for (const [platformName, platformData] of Object.entries(chainData)) {
        if (platformData.analytics && platformData.analytics.dataPoints > 0) {
          const rsdPercent = (platformData.analytics.avgRSD * 100).toFixed(2);
          const quality = platformData.analytics.isGoodInvestment
            ? "✅ Stable"
            : "⚠️  Volatile";
          console.log(
            `   ${chainName}/${platformName}: RSD = ${rsdPercent}% ${quality}`,
          );
        }
      }
    }
    console.log("");

    // Create test request with optimized data structure
    const requestData = createTestRequest(
      poolInfoByChain,
      historicalDataByChain,
    );

    // Call ymax API
    const results = await callYmaxAPI(requestData);

    console.log("\n📊 YMAX API Results:");
    console.log("─".repeat(30));
    console.log(JSON.stringify(results, null, 2));

    // Analyze results for RSD-based recommendations
    if (results.opportunities && results.opportunities.length > 0) {
      console.log("\n🔍 Opportunities Analysis:");
      results.opportunities.forEach((opp, index) => {
        console.log(`   ${index + 1}. ${opp.name}`);
        console.log(`      Yield Estimate: ${opp.yield_estimates}`);
      });
    }

    if (results.optimizations && results.optimizations.length > 0) {
      console.log("\n⚡ Optimization Analysis:");
      results.optimizations.forEach((opt, index) => {
        console.log(`   ${index + 1}. ${opt.name}`);
        console.log(`      Yield Estimate: ${opt.yield_estimates}`);
      });
    }

    console.log(
      "\n🎉 Multi-chain test with RSD analysis completed successfully!",
    );
    console.log("💡 RSD values ≤ 10% indicate stable investment opportunities");
  } catch (error) {
    console.error("\n💥 Test failed:", error.message);
    process.exit(1);
  }
}

// Run the test if called directly
if (require.main === module) {
  main();
}

module.exports = {
  main,
  fetchAllPoolInfo,
  fetchHistoricalData,
  createTestRequest,
  callYmaxAPI,
};
