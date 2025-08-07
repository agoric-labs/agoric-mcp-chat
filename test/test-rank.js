const ALPHA = 0.04; // Lambda parameter: 96% previous data, 4% current data

// Function to compute EWMA from an array of values (assumes data is sorted chronologically, most recent last)
function computeEMA(values) {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  // Apply exponentially decreasing weights, with most recent data getting highest weight
  for (let i = 0; i < values.length; i++) {
    const ageFromMostRecent = values.length - 1 - i; // 0 for most recent, increases for older data
    const weight = ALPHA * Math.pow(1 - ALPHA, ageFromMostRecent);
    weightedSum += values[i] * weight;
    totalWeight += weight;
  }
  
  return weightedSum / totalWeight;
}

// Fetch pool data using Agoric APY worker
async function getPool(project, chain, symbol) {
  const code = "usdc%2Busdc"; // URL encoded "usdc+usdc"
  const url = `https://apy-worker.agoric-core.workers.dev/opportunities?chain=${chain.toLowerCase()}&platform=${project}&code=${code}`;
  const response = await fetch(url);
  const pool = await response.json();
  return pool;
}

// Fetch historical data using Agoric APY worker
async function getHistorical(poolId) {
  const url = `https://apy-worker.agoric-core.workers.dev/historical/${poolId}?interval=MONTH`;
  const response = await fetch(url);
  const data = await response.json();
  return data.slice(-30);
}

// Compute metrics for a protocol/pool
async function getMetrics(protocol) {
  const { project, chain, symbol, rf } = protocol;
  const pool = await getPool(project, chain, symbol);
  const historical = await getHistorical(pool.item.id);

  // APY data: use averageApr field from historical data
  const apyData = historical.map((h) => h.averageApr);

  // TVL data: use averageValueLocked field from historical data
  const tvlData = historical.map((h) => h.averageValueLocked);

  const emaApy = computeEMA(apyData);
  const emaTvl = computeEMA(tvlData);

  // Current values from Agoric worker response
  const currentTvl = pool.item.totalValueLocked;
  const currentApy = pool.item.apr;
  const U = 0.5; // Default utilization rate
  const BRate = currentApy;
  const core = BRate * U * (1 - rf);
  const IR = 0; // No separate incentives data available

  // Engagement Score (placeholder: 0; could integrate X API if keys provided)
  const ES = 0;

  // Liquidity Inflow/Outflow: last period's change
  let LIO = 0;
  if (historical.length >= 2) {
    const lastTvl = historical[historical.length - 1].averageValueLocked;
    const prevTvl = historical[historical.length - 2].averageValueLocked;
    LIO = lastTvl - prevTvl;
  }

  return {
    name: `${project}-${chain}-${symbol}`,
    core: isNaN(core) ? 0 : core,
    IR: isNaN(IR) ? 0 : IR,
    emaApy: isNaN(emaApy) ? 0 : emaApy,
    emaTvl: isNaN(emaTvl) ? 0 : emaTvl,
    currentTvl: isNaN(currentTvl) ? 0 : currentTvl,
    ES,
    LIO: isNaN(LIO) ? 0 : LIO,
  };
}

// Main function to rank protocols
async function rankProtocols(userAllocations = []) {
  // Define protocols to rank (add more as needed; RF hardcoded based on typical values)
  const protocols = [
    { project: "aave-v3", chain: "Ethereum", symbol: "USDC", rf: 0.1 },
    { project: "aave-v3", chain: "Arbitrum", symbol: "USDC", rf: 0.1 },
    { project: "aave-v3", chain: "Optimism", symbol: "USDC", rf: 0.1 },
    {
      project: "compound-finance",
      chain: "Ethereum",
      symbol: "USDC",
      rf: 0.15,
    },
  ];

  const metrics = await Promise.all(protocols.map(getMetrics));

  // Compute normalization values
  const maxEmaTvl = Math.max(...metrics.map((m) => m.emaTvl || 0));
  const maxTvl = Math.max(...metrics.map((m) => m.currentTvl || 0));
  const lios = metrics.map((m) => m.LIO);
  const avgLIO = lios.reduce((sum, val) => sum + val, 0) / lios.length || 1; // Avoid division by zero

  // Weights as per the formula
  const wEmaApy = 0.3;
  const wEmaTvl = 0.2;
  const wTvl = 0.1;
  const wEs = 0.1;
  const wLio = 0.1;

  // Compute PY for each
  const rankings = metrics.map((m) => ({
    name: m.name,
    py:
      m.core +
      m.IR +
      wEmaApy * m.emaApy +
      wEmaTvl * (m.emaTvl / (maxEmaTvl || 1)) +
      wTvl * (m.currentTvl / (maxTvl || 1)) +
      wEs * m.ES +
      wLio * (m.LIO / avgLIO),
  }));

  // Sort by PY descending
  rankings.sort((a, b) => b.py - a.py);

  // Filter out user's current allocations to find new opportunities
  const newOpportunities = rankings.filter(
    (ranking) => !userAllocations.includes(ranking.name),
  );

  // Display results
  if (userAllocations.length > 0) {
    console.log("User's Current Allocations:");
    userAllocations.forEach((allocation, index) => {
      const currentRanking = rankings.find((r) => r.name === allocation);
      if (currentRanking) {
        console.log(
          `  ${index + 1}. ${allocation}: PY = ${currentRanking.py.toFixed(2)}%`,
        );
      } else {
        console.log(
          `  ${index + 1}. ${allocation}: Not ranked (not in analysis)`,
        );
      }
    });
    console.log("");
  }

  if (newOpportunities.length === 0) {
    console.log(
      "No new opportunities found. User is already invested in all analyzed protocols.",
    );
  } else {
    const topOpportunities = newOpportunities.slice(0, 3); // Limit to top 3
    console.log("Suggested New Opportunities (Top 3):");
    topOpportunities.forEach((r, index) => {
      console.log(`${index + 1}. ${r.name}: PY = ${r.py.toFixed(2)}%`);
    });

    if (newOpportunities.length > 3) {
      console.log(
        `\n${newOpportunities.length - 3} additional opportunities available.`,
      );
    }
  }

  // Optional: Show full rankings for debugging
  if (process.argv.includes("--show-all")) {
    console.log("\nFull Rankings:");
    rankings.forEach((r, index) => {
      console.log(`${index + 1}. ${r.name}: PY = ${r.py.toFixed(2)}%`);
    });
  }
}

// Parse user allocations from command line arguments or use default for testing
function getUserAllocations() {
  // Check for command line arguments
  const argIndex = process.argv.indexOf("--user-allocations");
  if (argIndex !== -1 && process.argv[argIndex + 1] !== undefined) {
    const allocationsStr = process.argv[argIndex + 1];
    if (allocationsStr === "" || allocationsStr === "none") {
      return [];
    }
    return allocationsStr
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  // Default allocations for testing (can be empty array [] for no current investments)
  return [
    // Example: user is currently invested in Aave V3 on Ethereum
    "aave-v3-Ethereum-USDC",
  ];
}

const userAllocations = getUserAllocations();
rankProtocols(userAllocations).catch(console.error);
