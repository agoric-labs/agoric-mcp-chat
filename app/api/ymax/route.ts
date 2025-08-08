// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400", // 24 hours
};

const ALPHA = 0.04; // Lambda parameter: 96% previous data, 4% current data

interface Protocol {
  project: string;
  chain: string;
  symbol: string;
  rf: number;
}

// Handle preflight OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Function to compute EWMA from an array of values (assumes data is sorted chronologically, most recent last)
function computeEMA(values: number[]): number {
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
async function getPool(
  project: string,
  chain: string,
  symbol: string,
): Promise<any> {
  const code = "usdc%2Busdc"; // URL encoded "usdc+usdc"
  const url = `https://apy-worker.agoric-core.workers.dev/opportunities?chain=${chain.toLowerCase()}&platform=${project}&code=${code}`;
  const response = await fetch(url);
  const pool = await response.json();
  return pool;
}

// Fetch historical data using Agoric APY worker
async function getHistorical(poolId: string): Promise<any[]> {
  const url = `https://apy-worker.agoric-core.workers.dev/historical/${poolId}?interval=MONTH`;
  const response = await fetch(url);
  const data = await response.json();
  return data.slice(-30);
}

// Compute metrics for a protocol/pool
async function getMetrics(protocol: Protocol): Promise<any> {
  const { project, chain, symbol, rf } = protocol;
  const pool = await getPool(project, chain, symbol);
  const historical = await getHistorical(pool.item.id);

  // APY data: use averageApr field from historical data
  const apyData = historical.map((h: any) => h.averageApr);

  // TVL data: use averageValueLocked field from historical data
  const tvlData = historical.map((h: any) => h.averageValueLocked);

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
    protocol: project,
    chain,
    symbol,
  };
}

export async function GET() {
  try {
    // Define protocols to rank (add more as needed; RF hardcoded based on typical values)
    const protocols: Protocol[] = [
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
      protocol: m.protocol,
      chain: m.chain,
      symbol: m.symbol,
      score: (
        m.core +
        m.IR +
        wEmaApy * m.emaApy +
        wEmaTvl * (m.emaTvl / (maxEmaTvl || 1)) +
        wTvl * (m.currentTvl / (maxTvl || 1)) +
        wEs * m.ES +
        wLio * (m.LIO / avgLIO)
      ).toFixed(3),
    }));

    // Sort by score descending
    rankings.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

    return new Response(JSON.stringify(rankings), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error in ymax API:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }
}
