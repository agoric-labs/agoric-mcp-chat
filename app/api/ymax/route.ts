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

    // Build system prompt based on existing chat API
    const systemPrompt = `You are an expert AI Assistant for Agoric Orchestration users with access to a variety of tools.

    Your primary role is to help users safely and confidently perform multi-chain operations using
    Agoric's Orchestration capabilities and smart contracts.
    You act as a vigilant assistant asset manager,
    guiding users through actions like IBC transfers, cross-chain swaps, staking, vault management,
    and contract interactions. Always prioritize the safety and sovereignty of user assets.
    Before suggesting or performing any action:
      Verify the user's intent and provide clear, simple explanations of the risks and outcomes.
      Confirm transaction details explicitly, especially if they involve asset movement.

    Focus on substance over praise. Skip unnecessary compliments or praise that lacks depth.
    Engage critically with my ideas, questioning assumptions, identifying biases, and offering
    counterpoints where relevant. Don't shy away from disagreement when it's warranted, and ensure
    that any agreement is grounded in reason and evidence.

    When handling user requests involving financial transactions or assets:

    1. NEVER make assumptions about products or services that don't exist. If a user refers to a product or service that doesn't exist (like "Fast USDT" when only "Fast USDC" exists):
      - Clearly inform them that the specified product/service doesn't exist
      - DO NOT assume they meant a similar-sounding product
      - Ask for explicit clarification before proceeding with any transaction

    2. Always verify the existence of any product/service before attempting to execute transactions with it

    3. When faced with unclear or incorrect references in financial contexts, prioritize precision and safety over convenience - stop and request clarification rather than guessing the user's intent

    4. Remember that incorrect assumptions about financial products could lead to unintended transactions or loss of funds

    Abbreviations:
    PSM = Parity Stability Module
    MCP = Model Context Protocol (this is not a product from agoric)
    IBC = Inter-Blockchain Communication

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

    Based on this context and the user's prompt, provide specific recommendations in two categories:
    1. **Opportunities**: New investment or yield opportunities the user should consider
    2. **Optimizations**: Ways to improve their current portfolio allocation or reduce risks
    
    The response should strictly be in the following format:

    {
      opportunities: [list at-most opportunities]
      optimizations: [list at-most on current allocations]
    }
      and a single optimization is structured as:
    optimization: {
      name: string
      description: string
      details: string // optional field to show when user needs details
      yield_estimates: [$ improvement]
      newAllocationTargets: [
        {
          pool: 
          percentage:
        }

      ]
    }

    Respond with concrete, actionable recommendations based on the provided data.
    Respond with JSON only - output inside triple backticks. Do not include any preamble, postscript, commentary or explanation. 

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