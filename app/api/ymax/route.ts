import { model } from "@/ai/providers";
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

interface YMaxResponse {
  opportunities: string[];
  optimizations: string[];
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

    Respond with concrete, actionable recommendations based on the provided data.`;

    // Use Claude-3-7-Sonnet as it's the closest to Claude-4 available
    const result = await generateText({
      model: model.languageModel("claude-3-7-sonnet"),
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 2000,
    });

    // Store LLM response
    const llmResponse = result.text;

    // Parse response into opportunities and optimizations
    // This is a simple parsing approach - can be enhanced based on actual response format
    const response: YMaxResponse = {
      opportunities: [],
      optimizations: []
    };

    // Try to extract opportunities and optimizations from the response
    const lines = llmResponse.split('\n');
    let currentSection = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.toLowerCase().includes('opportunities') || 
          trimmedLine.toLowerCase().includes('opportunity')) {
        currentSection = 'opportunities';
        continue;
      }
      
      if (trimmedLine.toLowerCase().includes('optimizations') || 
          trimmedLine.toLowerCase().includes('optimization')) {
        currentSection = 'optimizations';
        continue;
      }
      
      // Extract bullet points or numbered items
      if ((trimmedLine.startsWith('- ') || 
           trimmedLine.startsWith('* ') || 
           /^\d+\./.test(trimmedLine)) && 
          trimmedLine.length > 3) {
        
        const content = trimmedLine.replace(/^[-*\d.]\s*/, '').trim();
        
        if (currentSection === 'opportunities' && content) {
          response.opportunities.push(content);
        } else if (currentSection === 'optimizations' && content) {
          response.optimizations.push(content);
        }
      }
    }
    
    // If no structured format found, try to split the response roughly
    if (response.opportunities.length === 0 && response.optimizations.length === 0) {
      const sentences = llmResponse.split(/[.!?]+/).filter(s => s.trim().length > 10);
      
      // Simple heuristic: first half as opportunities, second half as optimizations
      const mid = Math.ceil(sentences.length / 2);
      response.opportunities = sentences.slice(0, mid).map(s => s.trim());
      response.optimizations = sentences.slice(mid).map(s => s.trim());
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