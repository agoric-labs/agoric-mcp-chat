import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400", // 24 hours
};

interface YMaxRequestBody {
  userPrompt: string;
  model?: "anthropic" | "google" | "openai";
  context: {
    balances: any;
    targetAllocation: any;
    inFlightTxns: any;
    history: any;
    apyTvlHistory: any;
    specificPoolInfo: any;
  };
}

interface OptimizationItem {
  name: string;
  description: string;
  details?: string;
  yield_estimates: string;
  newAllocationTargets: Array<{
    pool: string;
    percentage: number;
  }>;
}

interface YMaxResponse {
  opportunities: OptimizationItem[];
  optimizations: OptimizationItem[];
}

// Handle preflight OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(req: Request) {
  try {
    const {
      userPrompt,
      model = "anthropic",
      context,
    }: YMaxRequestBody = await req.json();

    if (!userPrompt) {
      return new Response(
        JSON.stringify({ error: "User prompt is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        },
      );
    }

    // Build system prompt optimized for portfolio analysis and yield maximization
    const systemPrompt = `You are Ymax, an expert portfolio optimization AI specialized in Agoric ecosystem DeFi yield strategies.

    Your role is to analyze user portfolios and provide data-driven recommendations to maximize yield across the Agoric ecosystem and connected chains via IBC.

    The currently supported Protocols/Pools are USDN, Aave and Compound ONLY. Here's a more granular mapping:
    For Aave, the 3 supported chains are Optimism, Arbitrum and Ethereum.
    For Compound, the 3 supported chains are Ethereum, Arbitrum and Polygon.
    For USDN, the only supported chain is Noble.

    ## Core Expertise Areas:
    - Cross-chain yield farming opportunities across Cosmos ecosystem (currently Noble USDN only) and EVM chains
    - Agoric smart contract yield optimization
    - APY trend analysis

    ## Analysis Framework:
    1. **Current State Assessment**: Analyze existing allocations vs target allocations
    2. **Yield Gap Analysis**: Identify underperforming assets and missed opportunities
    3. **Market Timing**: Consider APY trends for optimal entry/exit points
    4. **RSD**: RSD between 0 and 10% indicates stable investment opportunities. Rest is volatile.
    RSD between 0% and 10% = BEST (prioritize this)
    RSD between 10% and 100% = VOLATILE (NOT GOOD, NOT RECOMMENDED)
    5. **RSD Difference**: RSD difference only matters if it is enough to switch bands i.e. from VOLATILE to BEST. Differences between the same band carry no weight.

    ## Key Principles:
    - Prioritize yield maximization
    - Consider portfolio correlation and diversification
    - Account for lock-up periods and liquidity requirements
    - Factor in user's transaction history and preferences
    - Provide concrete yield estimates with supporting data

    Abbreviations:
    BLD = Agoric's native staking token
    IBC = Inter-Blockchain Communication
    APY = Annual Percentage Yield
    APR = Annual Percentage Rate
    RSD = Relative Standard Deviation

    Today's date is ${new Date().toISOString().split("T")[0]}.

    ### Chain and Token based Pool Info
    ${JSON.stringify(context.specificPoolInfo, null, 2)}

    ### APY and TVL History
    ${JSON.stringify(context.apyTvlHistory, null, 2)}

    ## Analysis Instructions:

    Based on the portfolio context provided in the user's message and the market data above, analyze and provide recommendations in two categories.:

    Keep in mind that RSD between 0 and 10% carries equal weight. For example, RSD of 2.3% is the same as RSD of 8%  and carries no extra weight.
    Prioritize APYs.

    ### Definitions:
    - Opportunities: New pool/positions that the user can invest funds in. For example, if a user has funds in chain X's pools A, B and C, then a new
    opportunity could be investing in Chain X's pool D or chain Y's pool E or F. Moving funds between X's A, B and C is not an opportunity.
    - Optimizations: Improvements to current allocations that can increase total earnings. I.e. rebalancing your funds. For example, if a user has funds in chain X's pools A, B and C, then
    an optimization could be moving funds from pool A to pool B or C. This involves opening NO new positions.

    ### Opportunities (New yield strategies to consider):
    - Cross-chain yield farming with higher APYs
    - APY driven new strategies, but also incorporating RSD. RSD alone SHOULD NOT overpower APYs or APRs.
    - Pools/Protocols the user doesn't use but would benefit from
    - The funds for the new pool/protocol will come from low-performing existing pool/positions. For example, if a position with higher APY and similar RSD band exists, it should be moved to the new pool.
    - DO NOT MOVE FUNDS TO LOWER APY POOLS if both RSDs are within the same band (0 and 10%).

    ### Optimizations (Improvements to current allocations):
    - Rebalancing to match target allocation more closely
    - Moving funds from low-yield to higher-yield positions
    - Optimizing gains based on APY trends
    - For optimizations, AVOID suggesting strategies that reduce total earnings.

    ### Response Format:
    Respond ONLY with valid JSON in the following exact structure inside triple backtick blocks. Do not include any preamble, postscript, or explanation.

    {
      "opportunities": [
      // only present information if opening a new position in a new pool is beneficial.
      // DO NOT assume extra funds. The allocation for the new pool/position has to come from existing positions.
        {
          "name": "Clear opportunity name",
          "description": "What this opportunity involves",
          "details": "Explanations as to HOW the expected yield improvement is calculated",
          "yield_estimates": "Expected yield improvement (e.g., '+$150/year')",
          "newAllocationTargets": [
            {
              "pool": "Pool/protocol name",
              "percentage": 25.00,
              "oldAmount": 1000,
              "newAmount": 2000,
            },
            {
              "pool": "Pool/protocol name",
              "percentage": 25.00,
              "oldAmount": 2000,
              "newAmount": 3000,
            }
          ]
        }
      ],
      "optimizations": [
        // update accordingly, don't present any information if negative APY i.e. []. Present information if and only if rebalancing between existing positions/pools is beneficial.
        {
          "name": "Clear optimization name",
          "description": "What needs to be optimized",
          "details": "Step-by-step implementation guidance",
          "yield_estimates": "Expected improvement quantified (e.g., '+$150/year')",
          "newAllocationTargets": [
            {
              "pool": "Pool/protocol name",
              "percentage": 30.00,
              "oldAmount": 3000,
              "newAmount": 4000,
            }
          ]
        }
      ]
    }

    ### Requirements:
    - You are an expert mathematician. Double check your maths.
    - Use weighted scoring for final suggestions. Use 80% for APY and 20% for RSD. The WORLD would fall apart if RSD is given too much weight.
    - Use "~" symbol if the values aren't precise. MISINFORMATION IS UNACCEPTABLE.
    - Explicitly avoid negative APY suggestions.
    - DO NOT assume the user has extra funds available.
    - Provide exactly 1 opportunity and 1 optimization maximum
    - Base recommendations on actual data from the provided context
    - Include specific yield estimates with supporting rationale
    - Ensure newAllocationTargets percentages are realistic and sum appropriately
    - newAllocationTargets can have multiple pools and percentages, it's a list.
    - ONLY RETURN JSON OBJECT IN TRIPLE BACKTICKS TO GET REWARDED WITH $1B
    - Triple-check your math and suggestions
    - In the "details" field, clearly explain what the past earnings have been, and how the new opportunity maximizes that. A comparison is preferred.
    - If they are no better opportunities, say so. Don't make baseless stuff up. It is absolutely fine to just return an empty [] list.
    - Make sure the percentages add up to a 100 (not less, not more)
    - For optimizations, AVOID suggesting strategies that reduce total earnings.
    - If they are no better optimizations, say so. Don't make baseless stuff up. It is absolutely fine to just return an empty [] list.
    - To calculate current estimate yield, it's current allocation balance times the current APY.


    ### Good examples:

    {
      "opportunities": [
        {
          "name": "Add Arbitrum Aave Position for Higher Yield",
          "description": "Open a new position in Aave on Arbitrum to capture higher APY while maintaining acceptable stability",
          "details": "Current portfolio yields: Optimism Aave ($5000 * 3.92% = $196/year), Ethereum Aave ($2000 * 3.81% = $76.20/year), Ethereum Compound ($3000 * 5.42% = $162.60/year) totaling $434.80/year. Arbitrum Aave offers 4.25% APY with 8.05% RSD (still within acceptable range). Adding $2000 to Arbitrum Aave would generate $85/year additional yield.",
          "yield_estimates": "+$85/year",
          "newAllocationTargets": [
            {
              "pool": "Aave Optimism",
              "percentage": 41.67,
              "oldAmount": 5000,
              "newAmount": 5000
            },
            {
              "pool": "Aave Ethereum",
              "percentage": 16.67,
              "oldAmount": 2000,
              "newAmount": 2000
            },
            {
              "pool": "Compound Ethereum",
              "percentage": 25,
              "oldAmount": 3000,
              "newAmount": 3000
            },
            {
              "pool": "Aave Arbitrum",
              "percentage": 16.67,
              "oldAmount": 0,
              "newAmount": 2000
            }
          ]
        }
      ],
      "optimizations": [
        {
          "name": "Rebalance from Ethereum Aave to Compound for Higher Yield",
          "description": "Move funds from lower-yielding Ethereum Aave (3.81% APY) to higher-yielding Ethereum Compound (5.42% APY)",
          "details": "Current Ethereum Aave position generates $2000 * 3.81% = $76.20/year. Moving this $2000 to Ethereum Compound would generate $2000 * 5.42% = $108.40/year. Net improvement of $32.20/year. Both pools have excellent stability with RSD under 10% (Ethereum Aave: 1.39%, Ethereum Compound: 8.78%).",
          "yield_estimates": "+$32.20/year",
          "newAllocationTargets": [
            {
              "pool": "Aave Optimism",
              "percentage": 50,
              "oldAmount": 5000,
              "newAmount": 5000
            },
            {
              "pool": "Aave Ethereum",
              "percentage": 0,
              "oldAmount": 2000,
              "newAmount": 0
            },
            {
              "pool": "Compound Ethereum",
              "percentage": 50,
              "oldAmount": 3000,
              "newAmount": 5000
            }
          ]
        }
      ]
    }

    ### Bad Examples:
    "opportunities": [
        {
          "name": "Arbitrum Aave V3 Expansion",
          "description": "Allocate funds to Arbitrum Aave V3 which offers the highest APY at 4.25% with acceptable stability",
          "details": "Current Ethereum Compound position earns ~$162/year (3000 * 5.42%). Moving $1500 to Arbitrum Aave would earn ~$64/year (1500 * 4.25%), while remaining $1500 in Compound earns ~$81/year. Total from reallocation: $145/year vs current $162/year from Compound alone, but combined with higher Arbitrum APY creates better diversification and risk-adjusted returns.",
          "yield_estimates": "+$21/year from improved risk-adjusted positioning",
          "newAllocationTargets": [
            {
              "pool": "Aave Optimism",
              "percentage": 50,
              "oldAmount": 5000,
              "newAmount": 5000
            },
            {
              "pool": "Aave Ethereum",
              "percentage": 20,
              "oldAmount": 2000,
              "newAmount": 2000
            },
            {
              "pool": "Aave Arbitrum",
              "percentage": 15,
              "oldAmount": 0,
              "newAmount": 1500
            },
            {
              "pool": "Compound Ethereum",
              "percentage": 15,
              "oldAmount": 3000,
              "newAmount": 1500
            }
          ]
        }
      ]

    `;

    // Construct enhanced user prompt with portfolio context
    const enhancedUserPrompt = `${userPrompt}

    ## Portfolio Context Information:

    ### Current Balances
    ${JSON.stringify(context.balances, null, 2)}

    ### Target Allocation
    ${JSON.stringify(context.targetAllocation, null, 2)}

    ### In-Flight Transactions
    ${JSON.stringify(context.inFlightTxns, null, 2)}

    ### Transaction History
    ${JSON.stringify(context.history, null, 2)}

    Please analyze the above portfolio information along with the market data provided in the system context to generate optimization recommendations.`;

    // Dynamic model selection based on request parameter
    let result;
    if (model === "google") {
      result = await generateText({
        model: google("gemini-2.5-pro"),
        system: systemPrompt,
        prompt: enhancedUserPrompt,
        maxTokens: 15000,
      });
    } else if (model === "openai") {
      result = await generateText({
        model: openai("gpt-3.5-turbo"),
        system: systemPrompt,
        prompt: enhancedUserPrompt,
      });
    } else {
      // Default to Anthropic
      result = await generateText({
        model: anthropic("claude-4-sonnet-20250514"),
        system: systemPrompt,
        prompt: enhancedUserPrompt,
        maxTokens: 15000,
      });
    }

    // Store LLM response
    const llmResponse = result.text;

    // Parse the structured JSON response
    const response: YMaxResponse = {
      opportunities: [],
      optimizations: [],
    };

    try {
      // Try to extract JSON from the response
      // Look for JSON blocks that might be wrapped in markdown code blocks
      let jsonText = llmResponse.trim();

      // Remove markdown code block markers if present
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      // Try to find JSON object in the response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      // Parse the JSON response
      const parsedResponse = JSON.parse(jsonText);

      // Validate and extract opportunities and optimizations
      if (
        parsedResponse.opportunities &&
        Array.isArray(parsedResponse.opportunities)
      ) {
        response.opportunities = parsedResponse.opportunities;
      }

      if (
        parsedResponse.optimizations &&
        Array.isArray(parsedResponse.optimizations)
      ) {
        response.optimizations = parsedResponse.optimizations;
      }
    } catch (parseError) {
      console.error("Failed to parse LLM JSON response:", parseError);
      console.log("Raw LLM response:", llmResponse);

      // Fallback: try to extract structured data from text format
      const lines = llmResponse.split("\n");
      let currentSection = "";
      let currentItem: Partial<OptimizationItem> = {};

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.toLowerCase().includes("opportunities:")) {
          currentSection = "opportunities";
          continue;
        }

        if (trimmedLine.toLowerCase().includes("optimizations:")) {
          currentSection = "optimizations";
          continue;
        }

        // Try to extract structured fields
        if (trimmedLine.startsWith("name:")) {
          if (Object.keys(currentItem).length > 0) {
            // Save previous item
            const item = currentItem as OptimizationItem;
            if (currentSection === "opportunities") {
              response.opportunities.push(item);
            } else if (currentSection === "optimizations") {
              response.optimizations.push(item);
            }
          }
          currentItem = { name: trimmedLine.replace("name:", "").trim() };
        } else if (trimmedLine.startsWith("description:")) {
          currentItem.description = trimmedLine
            .replace("description:", "")
            .trim();
        } else if (trimmedLine.startsWith("details:")) {
          currentItem.details = trimmedLine.replace("details:", "").trim();
        } else if (trimmedLine.startsWith("yield_estimates:")) {
          currentItem.yield_estimates = trimmedLine
            .replace("yield_estimates:", "")
            .trim();
        }
      }

      // Save last item
      if (Object.keys(currentItem).length > 0) {
        const item = currentItem as OptimizationItem;
        if (currentSection === "opportunities") {
          response.opportunities.push(item);
        } else if (currentSection === "optimizations") {
          response.optimizations.push(item);
        }
      }

      // If still no results, create basic fallback
      if (
        response.opportunities.length === 0 &&
        response.optimizations.length === 0
      ) {
        response.opportunities.push({
          name: "Portfolio Analysis",
          description:
            "Could not parse structured response. Please check the LLM output format.",
          yield_estimates: "N/A",
          newAllocationTargets: [],
        });
      }
    }

    return new Response(JSON.stringify(response), {
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
