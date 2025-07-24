import { model } from "@/ai/providers";
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from "ai";

export const maxDuration = 120;

interface YMaxRequestBody {
  userPrompt: string;
  context: {
    balances: any;
    targetAllocation: any;
    inFlightTxns: any;
    history: any;
    apyTvlHistory: any;
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

export async function POST(req: Request) {
  try {
    const {
      userPrompt,
      context
    }: YMaxRequestBody = await req.json();

    if (!userPrompt) {
      return new Response(
        JSON.stringify({ error: "User prompt is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build system prompt optimized for portfolio analysis and yield maximization
    const systemPrompt = `You are Ymax, an expert portfolio optimization AI specialized in Agoric ecosystem DeFi yield strategies.

    Your role is to analyze user portfolios and provide data-driven recommendations to maximize yield while managing risk across the Agoric ecosystem and connected chains via IBC.

    The currently supported Protocols/Pools are USDN, Aave, Compound and Beefy ONLY.

    ## Core Expertise Areas:
    - Cross-chain yield farming opportunities across Cosmos ecosystem (currently Noble USDN only) and EVM chains
    - Agoric smart contract yield optimization
    - Risk-adjusted portfolio allocation strategies
    - TVL and APY trend analysis
    - IBC transfer and gas cost-benefit analysis 

    ## Analysis Framework:
    1. **Current State Assessment**: Analyze existing allocations vs target allocations
    2. **Yield Gap Analysis**: Identify underperforming assets and missed opportunities  
    3. **Risk Evaluation**: Assess concentration risk, impermanent loss exposure, smart contract risks
    4. **Market Timing**: Consider APY trends and TVL movements for optimal entry/exit points
    5. **Transaction Cost Optimization**: Factor in gas fees, slippage, and time costs

    ## Key Principles:
    - Prioritize yield maximization but do consider risk management
    - Consider portfolio correlation and diversification
    - Account for lock-up periods and liquidity requirements
    - Factor in user's transaction history and preferences
    - Provide concrete yield estimates with supporting data

    Abbreviations:
    BLD = Agoric's native staking token
    IBC = Inter-Blockchain Communication
    TVL = Total Value Locked
    APY = Annual Percentage Yield

    Today's date is ${new Date().toISOString().split('T')[0]}.

    ## Context Information
    You have been provided with the following context about the user's portfolio:
    
    ### Balances
    ${JSON.stringify(context.balances, null, 2)}
    
    ### Target Allocation
    ${JSON.stringify(context.targetAllocation, null, 2)}
    
    ### In-Flight Transactions
    ${JSON.stringify(context.inFlightTxns, null, 2)}
    
    ### Transaction History
    ${JSON.stringify(context.history, null, 2)}
    
    ### APY and TVL History
    ${JSON.stringify(context.apyTvlHistory, null, 2)}

    ## Analysis Instructions:
    
    Based on the portfolio context and user prompt, analyze and provide recommendations in two categories:

    ### Opportunities (New yield strategies to consider):
    - Cross-chain yield farming with higher APYs
    - Underutilized staking opportunities
    - Pools/Protocols with high liquidity and low risk
    - Pools/Protocols other users are interested in
    - Pools/Protocols the user doesn't use but would benefit from 

    ### Optimizations (Improvements to current allocations):
    - Rebalancing to match target allocation more closely
    - Moving funds from low-yield to higher-yield positions
    - Reducing concentration risk through diversification
    - Optimizing transaction timing based on APY trends
    - Optimizing gains based on APY and TVL trends

    ## Response Format:
    Respond ONLY with valid JSON in the following exact structure inside triple backtick blocks. Do not include any preamble, postscript, or explanation. :

    {
      "opportunities": [
        {
          "name": "Clear opportunity name",
          "description": "What this opportunity involves",
          "details": "Implementation details and considerations",
          "yield_estimates": "Expected yield improvement (e.g., '+2.5% APY' or '+$150/month')",
          "newAllocationTargets": [
            {
              "pool": "Pool/protocol name",
              "percentage": 25
            }
          ]
        }
      ],
      "optimizations": [
        {
          "name": "Clear optimization name", 
          "description": "What needs to be optimized",
          "details": "Step-by-step implementation guidance",
          "yield_estimates": "Expected improvement quantified",
          "newAllocationTargets": [
            {
              "pool": "Pool/protocol name",
              "percentage": 30
            }
          ]
        }
      ]
    }

    Requirements:
    - Provide 2-5 opportunities and 2-5 optimizations maximum
    - Base recommendations on actual data from the provided context
    - Include specific yield estimates with supporting rationale
    - Ensure newAllocationTargets percentages are realistic and sum appropriately
    - Consider risk-adjusted returns, not just highest yields 


    `;

    // Use Claude-3-7-Sonnet as it's the closest to Claude-4 available
    const result = await generateText({
      model: anthropic("claude-4-sonnet-20250514"),
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 20000,
    });

    // Store LLM response
    const llmResponse = result.text;

    // Parse the structured JSON response
    const response: YMaxResponse = {
      opportunities: [],
      optimizations: []
    };

    try {
      // Try to extract JSON from the response
      // Look for JSON blocks that might be wrapped in markdown code blocks
      let jsonText = llmResponse.trim();
      
      // Remove markdown code block markers if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to find JSON object in the response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      // Parse the JSON response
      const parsedResponse = JSON.parse(jsonText);
      
      // Validate and extract opportunities and optimizations
      if (parsedResponse.opportunities && Array.isArray(parsedResponse.opportunities)) {
        response.opportunities = parsedResponse.opportunities;
      }
      
      if (parsedResponse.optimizations && Array.isArray(parsedResponse.optimizations)) {
        response.optimizations = parsedResponse.optimizations;
      }
      
    } catch (parseError) {
      console.error("Failed to parse LLM JSON response:", parseError);
      console.log("Raw LLM response:", llmResponse);
      
      // Fallback: try to extract structured data from text format
      const lines = llmResponse.split('\n');
      let currentSection = '';
      let currentItem: Partial<OptimizationItem> = {};
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.toLowerCase().includes('opportunities:')) {
          currentSection = 'opportunities';
          continue;
        }
        
        if (trimmedLine.toLowerCase().includes('optimizations:')) {
          currentSection = 'optimizations';
          continue;
        }
        
        // Try to extract structured fields
        if (trimmedLine.startsWith('name:')) {
          if (Object.keys(currentItem).length > 0) {
            // Save previous item
            const item = currentItem as OptimizationItem;
            if (currentSection === 'opportunities') {
              response.opportunities.push(item);
            } else if (currentSection === 'optimizations') {
              response.optimizations.push(item);
            }
          }
          currentItem = { name: trimmedLine.replace('name:', '').trim() };
        } else if (trimmedLine.startsWith('description:')) {
          currentItem.description = trimmedLine.replace('description:', '').trim();
        } else if (trimmedLine.startsWith('details:')) {
          currentItem.details = trimmedLine.replace('details:', '').trim();
        } else if (trimmedLine.startsWith('yield_estimates:')) {
          currentItem.yield_estimates = trimmedLine.replace('yield_estimates:', '').trim();
        }
      }
      
      // Save last item
      if (Object.keys(currentItem).length > 0) {
        const item = currentItem as OptimizationItem;
        if (currentSection === 'opportunities') {
          response.opportunities.push(item);
        } else if (currentSection === 'optimizations') {
          response.optimizations.push(item);
        }
      }
      
      // If still no results, create basic fallback
      if (response.opportunities.length === 0 && response.optimizations.length === 0) {
        response.opportunities.push({
          name: "Portfolio Analysis",
          description: "Could not parse structured response. Please check the LLM output format.",
          yield_estimates: "N/A",
          newAllocationTargets: []
        });
      }
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in ymax API:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}