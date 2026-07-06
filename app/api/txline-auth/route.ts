import { NextResponse } from "next/server";
import axios from "axios";
import { API_ORIGIN } from "@/utils/txline"; // This imports the config we made earlier!

export async function GET() {
  try {
    console.log("Attempting to fetch guest token from:", `${API_ORIGIN}/auth/guest/start`);

    // 1. Request the temporary Guest JWT from TxLINE
    const authResponse = await axios.post(`${API_ORIGIN}/auth/guest/start`);
    const jwt = authResponse.data.token;

    // 2. Return the token to our frontend
    return NextResponse.json({ 
      success: true, 
      token: jwt 
    });

  } catch (error: any) {
    console.error("TxLINE Authentication Error:", error.message);
    return NextResponse.json(
      { success: false, error: "Failed to connect to TxLINE Devnet" },
      { status: 500 }
    );
  }
}