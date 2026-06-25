import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CASIVMH4EMUZZEUIDDTRZGG6JCB7WLWSZ33NVDGZQOPHA3HTGPS2F5CW",
  }
} as const

export type DataKey = {tag: "Admin", values: void} | {tag: "Agent", values: readonly [string]} | {tag: "AllAgents", values: void};


export interface AgentProfile {
  address: string;
  bounties_done: u32;
  description: string;
  endpoint: string;
  name: string;
  registered_at: u64;
  score: i128;
}

export interface Client {
  /**
   * Construct and simulate a init transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialize with an admin address.
   */
  init: ({admin}: {admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a register transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Register a new agent. The agent must sign.
   */
  register: ({agent, name, endpoint, description}: {agent: string, name: string, endpoint: string, description: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_agent transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get an agent's profile.
   */
  get_agent: ({agent}: {agent: string}, options?: MethodOptions) => Promise<AssembledTransaction<Option<AgentProfile>>>

  /**
   * Construct and simulate a agent_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Total agents registered. Useful for stats.
   */
  agent_count: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a record_payment transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Record a payment for an agent. Only callable by the admin (the indexer).
   * 
   * # Arguments
   * 
   * * `caller` — must be admin (the indexer service)
   * * `agent` — the agent that received payment
   * * `amount` — paid amount in token base units
   */
  record_payment: ({caller, agent, amount}: {caller: string, agent: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a update_profile transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Update an existing agent's metadata. Agent must sign.
   */
  update_profile: ({agent, name, endpoint, description}: {agent: string, name: Option<string>, endpoint: Option<string>, description: Option<string>}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_leaderboard transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the top-N agents by score. Returns a sorted vec of (address, score).
   */
  get_leaderboard: ({limit}: {limit: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Array<readonly [string, i128]>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAACFJbml0aWFsaXplIHdpdGggYW4gYWRtaW4gYWRkcmVzcy4AAAAAAAAEaW5pdAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAACpSZWdpc3RlciBhIG5ldyBhZ2VudC4gVGhlIGFnZW50IG11c3Qgc2lnbi4AAAAAAAhyZWdpc3RlcgAAAAQAAAAAAAAABWFnZW50AAAAAAAAEwAAAAAAAAAEbmFtZQAAABAAAAAAAAAACGVuZHBvaW50AAAAEAAAAAAAAAALZGVzY3JpcHRpb24AAAAAEAAAAAA=",
        "AAAAAAAAABdHZXQgYW4gYWdlbnQncyBwcm9maWxlLgAAAAAJZ2V0X2FnZW50AAAAAAAAAQAAAAAAAAAFYWdlbnQAAAAAAAATAAAAAQAAA+gAAAfQAAAADEFnZW50UHJvZmlsZQ==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAwAAAAAAAAA1U2luZ2xldG9uOiBjb250cmFjdCBhZG1pbiAoY2FuIHVwZGF0ZSBhZ2VudCBwcm9maWxlcykAAAAAAAAFQWRtaW4AAAAAAAABAAAAEVBlci1hZ2VudCBwcm9maWxlAAAAAAAABUFnZW50AAAAAAAAAQAAABMAAAAAAAAAOkFsbCByZWdpc3RlcmVkIGFnZW50IGFkZHJlc3NlcyAoZm9yIGxlYWRlcmJvYXJkIGl0ZXJhdGlvbikAAAAAAAlBbGxBZ2VudHMAAAA=",
        "AAAAAAAAACpUb3RhbCBhZ2VudHMgcmVnaXN0ZXJlZC4gVXNlZnVsIGZvciBzdGF0cy4AAAAAAAthZ2VudF9jb3VudAAAAAAAAAAAAQAAAAQ=",
        "AAAAAAAAAOZSZWNvcmQgYSBwYXltZW50IGZvciBhbiBhZ2VudC4gT25seSBjYWxsYWJsZSBieSB0aGUgYWRtaW4gKHRoZSBpbmRleGVyKS4KCiMgQXJndW1lbnRzCgoqIGBjYWxsZXJgIOKAlCBtdXN0IGJlIGFkbWluICh0aGUgaW5kZXhlciBzZXJ2aWNlKQoqIGBhZ2VudGAg4oCUIHRoZSBhZ2VudCB0aGF0IHJlY2VpdmVkIHBheW1lbnQKKiBgYW1vdW50YCDigJQgcGFpZCBhbW91bnQgaW4gdG9rZW4gYmFzZSB1bml0cwAAAAAADnJlY29yZF9wYXltZW50AAAAAAADAAAAAAAAAAZjYWxsZXIAAAAAABMAAAAAAAAABWFnZW50AAAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==",
        "AAAAAAAAADVVcGRhdGUgYW4gZXhpc3RpbmcgYWdlbnQncyBtZXRhZGF0YS4gQWdlbnQgbXVzdCBzaWduLgAAAAAAAA51cGRhdGVfcHJvZmlsZQAAAAAABAAAAAAAAAAFYWdlbnQAAAAAAAATAAAAAAAAAARuYW1lAAAD6AAAABAAAAAAAAAACGVuZHBvaW50AAAD6AAAABAAAAAAAAAAC2Rlc2NyaXB0aW9uAAAAA+gAAAAQAAAAAA==",
        "AAAAAQAAAAAAAAAAAAAADEFnZW50UHJvZmlsZQAAAAcAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAAAAAANYm91bnRpZXNfZG9uZQAAAAAAAAQAAAAAAAAAC2Rlc2NyaXB0aW9uAAAAABAAAAAAAAAACGVuZHBvaW50AAAAEAAAAAAAAAAEbmFtZQAAABAAAAAAAAAADXJlZ2lzdGVyZWRfYXQAAAAAAAAGAAAAAAAAAAVzY29yZQAAAAAAAAs=",
        "AAAAAAAAAEhHZXQgdGhlIHRvcC1OIGFnZW50cyBieSBzY29yZS4gUmV0dXJucyBhIHNvcnRlZCB2ZWMgb2YgKGFkZHJlc3MsIHNjb3JlKS4AAAAPZ2V0X2xlYWRlcmJvYXJkAAAAAAEAAAAAAAAABWxpbWl0AAAAAAAABAAAAAEAAAPqAAAD7QAAAAIAAAATAAAACw==" ]),
      options
    )
  }
  public readonly fromJSON = {
    init: this.txFromJSON<null>,
        register: this.txFromJSON<null>,
        get_agent: this.txFromJSON<Option<AgentProfile>>,
        agent_count: this.txFromJSON<u32>,
        record_payment: this.txFromJSON<null>,
        update_profile: this.txFromJSON<null>,
        get_leaderboard: this.txFromJSON<Array<readonly [string, i128]>>
  }
}