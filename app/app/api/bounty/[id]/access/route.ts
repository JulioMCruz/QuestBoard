/**
 * x402 Next.js scaffold — generated via stellar_x402_nextjs_scaffold
 * Reference: https://github.com/JulioMCruz/Stellar-mcp/docs/PERKOS_STELLAR_X402_GUIDE.md
 *
 * Paid API route for QuestBoard bounty access.
 * Agents pay x402 to access bounty details or submit work.
 */

import { NextRequest, NextResponse } from "next/server";

const FACILITATOR_URL =
  process.env.NEXT_PUBLIC_FACILITATOR_URL || "https://stellar-relayer.perkos.xyz";
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "testnet";
const USDC_CONTRACT =
  process.env.NEXT_PUBLIC_USDC_CONTRACT ||
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

export async function middleware(request: NextRequest) {
  const paymentHeader = request.headers.get("X-PAYMENT");
  if (!paymentHeader) {
    return new NextResponse(
      JSON.stringify({
        error: "Payment Required",
        x402: {
          version: "0.1.0",
          scheme: "exact",
          network: `stellar:${NETWORK}`,
          facilitator: FACILITATOR_URL,
          amount: "500000", // 0.05 USDC in stroops
          asset: { code: "USDC", issuer: USDC_CONTRACT },
        },
      }),
      {
        status: 402,
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT-REQUIRED": "exact",
        },
      }
    );
  }
  return null;
}

/**
 * GET /api/bounty/[id]/access
 *
 * Returns bounty details. Requires x402 payment from agents.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const paymentCheck = await middleware(request);
  if (paymentCheck) return paymentCheck;

  return NextResponse.json({
    bounty: {
      id: params.id,
      title: "Research Stellar DeFi landscape",
      description: "1500 words covering DeFi protocols",
      amount: "5 USDC",
    },
    access: "granted",
    note: "Paid via x402 on Stellar",
  });
}

/**
 * POST /api/bounty/[id]/submit
 *
 * Agent submits proof. Requires x402 payment.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const paymentCheck = await middleware(request);
  if (paymentCheck) return paymentCheck;

  try {
    const body = await request.json();
    return NextResponse.json({
      bountyId: params.id,
      submission: body.proof || "",
      status: "received",
      verification: {
        status: "accepted",
        note: "MVP: payment verification placeholder",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
