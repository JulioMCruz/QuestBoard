//! QuestBoard — BountyFactory contract
//!
//! Creates, claims, and releases bounties paid in any Soroban token (typically USDC).
//!
//! State machine per bounty:
//!   Created ──claim──> Claimed ──submit──> Submitted ──release──> Released (paid to agent)
//!                          │                                       │
//!                          │                                       └─refund──> Refunded (back to poster)
//!                          └─refund (after deadline)──> Refunded
//!
//! Event convention:
//!   (symbol_short!("bounty"), symbol_short!("paid"), agent, amount) — emitted on release
//!   The AgentRegistry contract listens for these events to bump scores.
//!
//! Reference: <https://developers.stellar.org/docs/build/smart-contracts/example-contracts/escrow>

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, String, Symbol, Vec,
};

#[cfg(test)]
mod test;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BountyStatus {
    /// Created, awaiting an agent
    Open,
    /// An agent claimed it
    Claimed,
    /// Agent delivered proof, awaiting poster review
    Submitted,
    /// Payment released to agent (terminal)
    Released,
    /// Payment returned to poster — either deadline passed or poster rejected (terminal)
    Refunded,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Bounty {
    pub id: u64,
    pub poster: Address,
    pub agent: Option<Address>,
    pub title: String,
    pub description: String,
    pub token: Address,
    pub amount: i128,
    pub deadline: u64, // ledger timestamp
    pub status: BountyStatus,
    pub submission_proof: Option<String>,
    pub created_at: u64,
}

#[contracttype]
pub enum DataKey {
    /// Singleton: next bounty id
    NextId,
    /// Per-bounty storage
    Bounty(u64),
    /// Optional admin for factory-wide operations
    Admin,
}

#[contract]
pub struct BountyFactory;

#[contractimpl]
impl BountyFactory {
    /// Initialize the factory. Optionally set an admin.
    pub fn init(env: Env, admin: Option<Address>) {
        if let Some(a) = admin {
            a.require_auth();
            env.storage().instance().set(&DataKey::Admin, &a);
        }
        env.storage().instance().set(&DataKey::NextId, &0u64);
    }

    /// Create a new bounty and lock `amount` of `token` in escrow.
    ///
    /// # Arguments
    ///
    /// * `poster` — The address funding the bounty (must sign)
    /// * `title` — Short title
    /// * `description` — Full description of the work
    /// * `amount` — Token amount (in stroops for XLM, or micro-units for SAC)
    /// * `token` — The token contract address (typically USDC SAC)
    /// * `deadline_hours` — From now, in hours. After this, poster can refund.
    pub fn create_bounty(
        env: Env,
        poster: Address,
        title: String,
        description: String,
        amount: i128,
        token: Address,
        deadline_hours: u32,
    ) -> u64 {
        poster.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }
        if deadline_hours == 0 {
            panic!("deadline must be in the future");
        }

        // Pull tokens from poster into escrow
        let factory = env.current_contract_address();
        token::Client::new(&env, &token).transfer(&poster, &factory, &amount);

        // Assign id
        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(0u64);
        let next_id = id.checked_add(1).expect("bounty id overflow");

        let deadline = env.ledger().timestamp() + (deadline_hours as u64) * 3600;

        let bounty = Bounty {
            id,
            poster: poster.clone(),
            agent: None,
            title,
            description,
            token: token.clone(),
            amount,
            deadline,
            status: BountyStatus::Open,
            submission_proof: None,
            created_at: env.ledger().timestamp(),
        };

        env.storage().instance().set(&DataKey::Bounty(id), &bounty);
        env.storage().instance().set(&DataKey::NextId, &next_id);

        // Event for off-chain indexers
        env.events()
            .publish((symbol_short!("bounty"), symbol_short!("created")), (id, poster, amount));

        id
    }

    /// Claim an open bounty. Agent must sign.
    pub fn claim_bounty(env: Env, bounty_id: u64, agent: Address) {
        agent.require_auth();

        let mut bounty: Bounty = env
            .storage()
            .instance()
            .get(&DataKey::Bounty(bounty_id))
            .expect("bounty not found");

        match bounty.status {
            BountyStatus::Open => {}
            _ => panic!("bounty not open"),
        }

        bounty.agent = Some(agent.clone());
        bounty.status = BountyStatus::Claimed;
        env.storage().instance().set(&DataKey::Bounty(bounty_id), &bounty);

        env.events().publish(
            (symbol_short!("bounty"), symbol_short!("claimed")),
            (bounty_id, agent),
        );
    }

    /// Agent submits proof of completion. Moves to Submitted status.
    pub fn submit_proof(env: Env, bounty_id: u64, agent: Address, proof: String) {
        agent.require_auth();

        let mut bounty: Bounty = env
            .storage()
            .instance()
            .get(&DataKey::Bounty(bounty_id))
            .expect("bounty not found");

        match bounty.status {
            BountyStatus::Claimed => {}
            _ => panic!("bounty not in claimed state"),
        }

        // Verify the agent is the one who claimed
        match &bounty.agent {
            Some(a) if a == &agent => {}
            _ => panic!("only the claiming agent can submit"),
        }

        bounty.submission_proof = Some(proof);
        bounty.status = BountyStatus::Submitted;
        env.storage().instance().set(&DataKey::Bounty(bounty_id), &bounty);

        env.events().publish(
            (symbol_short!("bounty"), symbol_short!("submitted")),
            (bounty_id, agent),
        );
    }

    /// Poster releases payment to agent. Bounty terminal in Released state.
    pub fn release_payment(env: Env, bounty_id: u64) {
        let mut bounty: Bounty = env
            .storage()
            .instance()
            .get(&DataKey::Bounty(bounty_id))
            .expect("bounty not found");

        bounty.poster.require_auth();

        match bounty.status {
            BountyStatus::Submitted | BountyStatus::Claimed => {}
            _ => panic!("bounty not in claimable state"),
        }

        let agent = bounty
            .agent
            .clone()
            .expect("bounty has no agent — should not happen");

        // Transfer from escrow to agent
        let factory = env.current_contract_address();
        token::Client::new(&env, &bounty.token).transfer(
            &factory,
            &agent,
            &bounty.amount,
        );

        bounty.status = BountyStatus::Released;
        env.storage().instance().set(&DataKey::Bounty(bounty_id), &bounty);

        // Event for AgentRegistry indexer
        env.events().publish(
            (symbol_short!("bounty"), symbol_short!("paid")),
            (bounty_id, agent.clone(), bounty.amount),
        );
    }

    /// Refund a bounty back to the poster. Allowed when:
    ///   - Poster explicitly rejects (any state before Released)
    ///   - Deadline passed and still Open or Claimed
    pub fn refund(env: Env, bounty_id: u64) {
        let mut bounty: Bounty = env
            .storage()
            .instance()
            .get(&DataKey::Bounty(bounty_id))
            .expect("bounty not found");

        let now = env.ledger().timestamp();
        let deadline_passed = now > bounty.deadline;

        match bounty.status {
            BountyStatus::Open | BountyStatus::Claimed | BountyStatus::Submitted => {
                // Either poster signs OR deadline passed
                if !deadline_passed {
                    bounty.poster.require_auth();
                }
            }
            _ => panic!("bounty already finalized"),
        }

        // Transfer from escrow back to poster
        let factory = env.current_contract_address();
        token::Client::new(&env, &bounty.token).transfer(
            &factory,
            &bounty.poster,
            &bounty.amount,
        );

        bounty.status = BountyStatus::Refunded;
        env.storage().instance().set(&DataKey::Bounty(bounty_id), &bounty);

        env.events().publish(
            (symbol_short!("bounty"), symbol_short!("refunded")),
            (bounty_id, bounty.poster.clone()),
        );
    }

    /// Read a bounty by id.
    pub fn get_bounty(env: Env, bounty_id: u64) -> Option<Bounty> {
        env.storage().instance().get(&DataKey::Bounty(bounty_id))
    }

    /// List all bounties with a given status. Helper for off-chain indexers.
    ///
    /// Note: this scans storage. For production with many bounties, an indexer
    /// is preferred.
    pub fn list_by_status(env: Env, status: BountyStatus) -> Vec<u64> {
        let max_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(0u64);
        let mut out: Vec<u64> = Vec::new(&env);
        for id in 0..max_id {
            if let Some(b) = env
                .storage()
                .instance()
                .get::<DataKey, Bounty>(&DataKey::Bounty(id))
            {
                if b.status == status {
                    out.push_back(id);
                }
            }
        }
        out
    }
}

// Force the unused-import warning away in no_std builds
#[allow(dead_code)]
const _: Symbol = symbol_short!("bounty");