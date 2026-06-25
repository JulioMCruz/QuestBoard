/**
 * QuestBoard contract clients.
 *
 * Wraps the generated TypeScript bindings (packages/{bounty,registry}-bindings)
 * into ready-to-use clients:
 *   - read clients  → simulate-only, no wallet needed
 *   - write clients → sign with Freighter and submit
 *
 * The deployed + verified testnet contract IDs come from NEXT_PUBLIC_* env vars
 * (see app/.env.example).
 */

import { Client as BountyContract } from "@/lib/bindings/bountyBindings";
import { Client as RegistryContract } from "@/lib/bindings/registryBindings";

export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC ?? "https://soroban-testnet.stellar.org";

export const BOUNTY_FACTORY_ID = process.env.NEXT_PUBLIC_BOUNTY_FACTORY_ID ?? "";
export const AGENT_REGISTRY_ID = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ID ?? "";

// Token escrowed by create_bounty. Defaults to the native XLM SAC (testnet),
// which needs no trustline. Override with a USDC SAC via NEXT_PUBLIC_TOKEN_ID.
export const TOKEN_ID =
  process.env.NEXT_PUBLIC_TOKEN_ID ??
  process.env.NEXT_PUBLIC_XLM_SAC ??
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

// Source account used only as the (read-only) simulation source when no wallet
// is connected. Any *funded* testnet account works — it never signs anything.
// Defaults to the contract deployer. Override with NEXT_PUBLIC_READ_SOURCE.
export const READ_SOURCE =
  process.env.NEXT_PUBLIC_READ_SOURCE ??
  "GDHKGVHM3YUNIE7TFGN46BAGETEZB34OQBMXWJLVPUW4ML6I5LGWVFAM";

export function assertConfigured() {
  if (!BOUNTY_FACTORY_ID || !AGENT_REGISTRY_ID) {
    throw new Error(
      "Contract IDs not set. Configure NEXT_PUBLIC_BOUNTY_FACTORY_ID and " +
        "NEXT_PUBLIC_AGENT_REGISTRY_ID (see app/.env.example)."
    );
  }
}

/** Adapter: turn Freighter's signTransaction into the shape the bindings expect. */
function freighterSigner(address: string) {
  return async (
    xdr: string,
    opts?: { networkPassphrase?: string }
  ): Promise<{ signedTxXdr: string; signerAddress: string }> => {
    const { signTransaction } = await import("@stellar/freighter-api");
    const res: any = await signTransaction(xdr, {
      networkPassphrase: opts?.networkPassphrase ?? NETWORK_PASSPHRASE,
      address,
    });
    if (res?.error) throw new Error(String(res.error));
    return { signedTxXdr: res.signedTxXdr, signerAddress: res.signerAddress ?? address };
  };
}

export function bountyReadClient(source: string = READ_SOURCE): BountyContract {
  assertConfigured();
  return new BountyContract({
    contractId: BOUNTY_FACTORY_ID,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
    publicKey: source,
  });
}

export function bountyWriteClient(address: string): BountyContract {
  assertConfigured();
  return new BountyContract({
    contractId: BOUNTY_FACTORY_ID,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
    publicKey: address,
    signTransaction: freighterSigner(address),
  });
}

export function registryReadClient(source: string = READ_SOURCE): RegistryContract {
  assertConfigured();
  return new RegistryContract({
    contractId: AGENT_REGISTRY_ID,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
    publicKey: source,
  });
}

export function registryWriteClient(address: string): RegistryContract {
  assertConfigured();
  return new RegistryContract({
    contractId: AGENT_REGISTRY_ID,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
    publicKey: address,
    signTransaction: freighterSigner(address),
  });
}
