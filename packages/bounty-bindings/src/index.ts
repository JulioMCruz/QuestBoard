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
    contractId: "CAM3JCDPWDVOPWDT4CH6LJ2ZFNYAKNKMATEG45ZROCOJAHISGYDC4SG6",
  }
} as const


export interface Bounty {
  agent: Option<string>;
  amount: i128;
  created_at: u64;
  deadline: u64;
  description: string;
  id: u64;
  poster: string;
  status: BountyStatus;
  submission_proof: Option<string>;
  title: string;
  token: string;
}

export type DataKey = {tag: "NextId", values: void} | {tag: "Bounty", values: readonly [u64]} | {tag: "Admin", values: void};

export type BountyStatus = {tag: "Open", values: void} | {tag: "Claimed", values: void} | {tag: "Submitted", values: void} | {tag: "Released", values: void} | {tag: "Refunded", values: void};

export interface Client {
  /**
   * Construct and simulate a init transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialize the factory. Optionally set an admin.
   */
  init: ({admin}: {admin: Option<string>}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a refund transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Refund a bounty back to the poster. Allowed when:
   * - Poster explicitly rejects (any state before Released)
   * - Deadline passed and still Open or Claimed
   */
  refund: ({bounty_id}: {bounty_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_bounty transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Read a bounty by id.
   */
  get_bounty: ({bounty_id}: {bounty_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Option<Bounty>>>

  /**
   * Construct and simulate a claim_bounty transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Claim an open bounty. Agent must sign.
   */
  claim_bounty: ({bounty_id, agent}: {bounty_id: u64, agent: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a submit_proof transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Agent submits proof of completion. Moves to Submitted status.
   */
  submit_proof: ({bounty_id, agent, proof}: {bounty_id: u64, agent: string, proof: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a create_bounty transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Create a new bounty and lock `amount` of `token` in escrow.
   * 
   * # Arguments
   * 
   * * `poster` — The address funding the bounty (must sign)
   * * `title` — Short title
   * * `description` — Full description of the work
   * * `amount` — Token amount (in stroops for XLM, or micro-units for SAC)
   * * `token` — The token contract address (typically USDC SAC)
   * * `deadline_hours` — From now, in hours. After this, poster can refund.
   */
  create_bounty: ({poster, title, description, amount, token, deadline_hours}: {poster: string, title: string, description: string, amount: i128, token: string, deadline_hours: u32}, options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a list_by_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * List all bounties with a given status. Helper for off-chain indexers.
   * 
   * Note: this scans storage. For production with many bounties, an indexer
   * is preferred.
   */
  list_by_status: ({status}: {status: BountyStatus}, options?: MethodOptions) => Promise<AssembledTransaction<Array<u64>>>

  /**
   * Construct and simulate a release_payment transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Poster releases payment to agent. Bounty terminal in Released state.
   */
  release_payment: ({bounty_id}: {bounty_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

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
      new ContractSpec([ "AAAAAAAAADBJbml0aWFsaXplIHRoZSBmYWN0b3J5LiBPcHRpb25hbGx5IHNldCBhbiBhZG1pbi4AAAAEaW5pdAAAAAEAAAAAAAAABWFkbWluAAAAAAAD6AAAABMAAAAA",
        "AAAAAAAAAJVSZWZ1bmQgYSBib3VudHkgYmFjayB0byB0aGUgcG9zdGVyLiBBbGxvd2VkIHdoZW46Ci0gUG9zdGVyIGV4cGxpY2l0bHkgcmVqZWN0cyAoYW55IHN0YXRlIGJlZm9yZSBSZWxlYXNlZCkKLSBEZWFkbGluZSBwYXNzZWQgYW5kIHN0aWxsIE9wZW4gb3IgQ2xhaW1lZAAAAAAAAAZyZWZ1bmQAAAAAAAEAAAAAAAAACWJvdW50eV9pZAAAAAAAAAYAAAAA",
        "AAAAAQAAAAAAAAAAAAAABkJvdW50eQAAAAAACwAAAAAAAAAFYWdlbnQAAAAAAAPoAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAApjcmVhdGVkX2F0AAAAAAAGAAAAAAAAAAhkZWFkbGluZQAAAAYAAAAAAAAAC2Rlc2NyaXB0aW9uAAAAABAAAAAAAAAAAmlkAAAAAAAGAAAAAAAAAAZwb3N0ZXIAAAAAABMAAAAAAAAABnN0YXR1cwAAAAAH0AAAAAxCb3VudHlTdGF0dXMAAAAAAAAAEHN1Ym1pc3Npb25fcHJvb2YAAAPoAAAAEAAAAAAAAAAFdGl0bGUAAAAAAAAQAAAAAAAAAAV0b2tlbgAAAAAAABM=",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAwAAAAAAAAAZU2luZ2xldG9uOiBuZXh0IGJvdW50eSBpZAAAAAAAAAZOZXh0SWQAAAAAAAEAAAASUGVyLWJvdW50eSBzdG9yYWdlAAAAAAAGQm91bnR5AAAAAAABAAAABgAAAAAAAAAqT3B0aW9uYWwgYWRtaW4gZm9yIGZhY3Rvcnktd2lkZSBvcGVyYXRpb25zAAAAAAAFQWRtaW4AAAA=",
        "AAAAAAAAABRSZWFkIGEgYm91bnR5IGJ5IGlkLgAAAApnZXRfYm91bnR5AAAAAAABAAAAAAAAAAlib3VudHlfaWQAAAAAAAAGAAAAAQAAA+gAAAfQAAAABkJvdW50eQAA",
        "AAAAAAAAACZDbGFpbSBhbiBvcGVuIGJvdW50eS4gQWdlbnQgbXVzdCBzaWduLgAAAAAADGNsYWltX2JvdW50eQAAAAIAAAAAAAAACWJvdW50eV9pZAAAAAAAAAYAAAAAAAAABWFnZW50AAAAAAAAEwAAAAA=",
        "AAAAAAAAAD1BZ2VudCBzdWJtaXRzIHByb29mIG9mIGNvbXBsZXRpb24uIE1vdmVzIHRvIFN1Ym1pdHRlZCBzdGF0dXMuAAAAAAAADHN1Ym1pdF9wcm9vZgAAAAMAAAAAAAAACWJvdW50eV9pZAAAAAAAAAYAAAAAAAAABWFnZW50AAAAAAAAEwAAAAAAAAAFcHJvb2YAAAAAAAAQAAAAAA==",
        "AAAAAAAAAZ9DcmVhdGUgYSBuZXcgYm91bnR5IGFuZCBsb2NrIGBhbW91bnRgIG9mIGB0b2tlbmAgaW4gZXNjcm93LgoKIyBBcmd1bWVudHMKCiogYHBvc3RlcmAg4oCUIFRoZSBhZGRyZXNzIGZ1bmRpbmcgdGhlIGJvdW50eSAobXVzdCBzaWduKQoqIGB0aXRsZWAg4oCUIFNob3J0IHRpdGxlCiogYGRlc2NyaXB0aW9uYCDigJQgRnVsbCBkZXNjcmlwdGlvbiBvZiB0aGUgd29yawoqIGBhbW91bnRgIOKAlCBUb2tlbiBhbW91bnQgKGluIHN0cm9vcHMgZm9yIFhMTSwgb3IgbWljcm8tdW5pdHMgZm9yIFNBQykKKiBgdG9rZW5gIOKAlCBUaGUgdG9rZW4gY29udHJhY3QgYWRkcmVzcyAodHlwaWNhbGx5IFVTREMgU0FDKQoqIGBkZWFkbGluZV9ob3Vyc2Ag4oCUIEZyb20gbm93LCBpbiBob3Vycy4gQWZ0ZXIgdGhpcywgcG9zdGVyIGNhbiByZWZ1bmQuAAAAAA1jcmVhdGVfYm91bnR5AAAAAAAABgAAAAAAAAAGcG9zdGVyAAAAAAATAAAAAAAAAAV0aXRsZQAAAAAAABAAAAAAAAAAC2Rlc2NyaXB0aW9uAAAAABAAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAA5kZWFkbGluZV9ob3VycwAAAAAABAAAAAEAAAAG",
        "AAAAAAAAAJxMaXN0IGFsbCBib3VudGllcyB3aXRoIGEgZ2l2ZW4gc3RhdHVzLiBIZWxwZXIgZm9yIG9mZi1jaGFpbiBpbmRleGVycy4KCk5vdGU6IHRoaXMgc2NhbnMgc3RvcmFnZS4gRm9yIHByb2R1Y3Rpb24gd2l0aCBtYW55IGJvdW50aWVzLCBhbiBpbmRleGVyCmlzIHByZWZlcnJlZC4AAAAObGlzdF9ieV9zdGF0dXMAAAAAAAEAAAAAAAAABnN0YXR1cwAAAAAH0AAAAAxCb3VudHlTdGF0dXMAAAABAAAD6gAAAAY=",
        "AAAAAgAAAAAAAAAAAAAADEJvdW50eVN0YXR1cwAAAAUAAAAAAAAAGkNyZWF0ZWQsIGF3YWl0aW5nIGFuIGFnZW50AAAAAAAET3BlbgAAAAAAAAATQW4gYWdlbnQgY2xhaW1lZCBpdAAAAAAHQ2xhaW1lZAAAAAAAAAAALUFnZW50IGRlbGl2ZXJlZCBwcm9vZiwgYXdhaXRpbmcgcG9zdGVyIHJldmlldwAAAAAAAAlTdWJtaXR0ZWQAAAAAAAAAAAAAJFBheW1lbnQgcmVsZWFzZWQgdG8gYWdlbnQgKHRlcm1pbmFsKQAAAAhSZWxlYXNlZAAAAAAAAABTUGF5bWVudCByZXR1cm5lZCB0byBwb3N0ZXIg4oCUIGVpdGhlciBkZWFkbGluZSBwYXNzZWQgb3IgcG9zdGVyIHJlamVjdGVkICh0ZXJtaW5hbCkAAAAACFJlZnVuZGVk",
        "AAAAAAAAAERQb3N0ZXIgcmVsZWFzZXMgcGF5bWVudCB0byBhZ2VudC4gQm91bnR5IHRlcm1pbmFsIGluIFJlbGVhc2VkIHN0YXRlLgAAAA9yZWxlYXNlX3BheW1lbnQAAAAAAQAAAAAAAAAJYm91bnR5X2lkAAAAAAAABgAAAAA=" ]),
      options
    )
  }
  public readonly fromJSON = {
    init: this.txFromJSON<null>,
        refund: this.txFromJSON<null>,
        get_bounty: this.txFromJSON<Option<Bounty>>,
        claim_bounty: this.txFromJSON<null>,
        submit_proof: this.txFromJSON<null>,
        create_bounty: this.txFromJSON<u64>,
        list_by_status: this.txFromJSON<Array<u64>>,
        release_payment: this.txFromJSON<null>
  }
}