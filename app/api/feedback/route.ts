import { Langfuse } from "langfuse";
import { NextRequest, NextResponse } from "next/server";

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl:  process.env.LANGFUSE_BASEURL
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trace_id, score, comment } = body;

    if (!trace_id) {
      return NextResponse.json(
        { error: "trace_id is required" },
        { status: 400 }
      );
    }

    console.log("Creating Langfuse score:", { trace_id, score, comment });

    langfuse.score({
      traceId: trace_id,
      name: "user-feedback",
      value: score,
      comment: comment || undefined,
    });

    // Flush to ensure it's sent
    await Promise.race([
      langfuse.flushAsync(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Flush timeout')), 5000)
      )
    ]);

    console.log("Successfully logged feedback to Langfuse");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging feedback to Langfuse:", error);
    return NextResponse.json(
      { error: "Failed to log feedback" },
      { status: 500 }
    );
  }
}