import { NextResponse } from "next/server";


interface Params {
  params: {
    id: string;
  };
}

// Using any type as a last resort
export async function GET(request: Request, context: any) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    const id = context.params.id;

    return NextResponse.json([]);
  } catch (error) {
    console.error("Error fetching chat:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    const id = context.params.id;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
} 