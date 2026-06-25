//! QuestBoard — AgentRegistry contract
//!
//! On-chain registry of agent identities with reputation scoring. Tracks:
//!   - Agent metadata (name, endpoint, description)
//!   - Cumulative paid amount (score)
//!   - Number of bounties completed
//!   - ERC-8004 compatible identity record (so PerkOS Stack can discover agents)
//!
//! Reputation events:
//!   - BountyFactory emits `(bounty, paid)` events on `release_payment`
//!   - AgentRegistry listens via a **trusted indexer** (off-chain) which calls
//!     `record_payment(agent, amount)` on this contract
//!
//! Why a trusted indexer and not a cross-contract call?
//! - Cross-contract calls cost gas on every paid bounty; the indexer batches them
//!   and amortizes cost. This is the same pattern OpenZeppelin Defender uses.
//! - Avoids hard-coding the BountyFactory address into AgentRegistry, which
//!   makes the two contracts independently deployable.
//!
//! For the Stellar PULSO hackathon demo, the indexer is a small Node.js worker
//! in `app/lib/poller.ts` that watches Horizon events and calls `record_payment`.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};

#[cfg(test)]
mod test;

#[contracttype]
#[derive(Clone, Debug)]
pub struct AgentProfile {
    pub address: Address,
    pub name: String,
    pub endpoint: String, // HTTP endpoint where agent accepts x402 requests
    pub description: String,
    pub score: i128,      // cumulative paid amount in token base units
    pub bounties_done: u32,
    pub registered_at: u64,
}

#[contracttype]
pub enum DataKey {
    /// Singleton: contract admin (can update agent profiles)
    Admin,
    /// Per-agent profile
    Agent(Address),
    /// All registered agent addresses (for leaderboard iteration)
    AllAgents,
}

#[contract]
pub struct AgentRegistry;

#[contractimpl]
impl AgentRegistry {
    /// Initialize with an admin address.
    pub fn init(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Register a new agent. The agent must sign.
    pub fn register(
        env: Env,
        agent: Address,
        name: String,
        endpoint: String,
        description: String,
    ) {
        agent.require_auth();

        if env
            .storage()
            .instance()
            .get::<DataKey, AgentProfile>(&DataKey::Agent(agent.clone()))
            .is_some()
        {
            panic!("agent already registered");
        }

        let profile = AgentProfile {
            address: agent.clone(),
            name,
            endpoint,
            description,
            score: 0,
            bounties_done: 0,
            registered_at: env.ledger().timestamp(),
        };

        env.storage()
            .instance()
            .set(&DataKey::Agent(agent.clone()), &profile);

        // Append to all-agents list
        let mut all: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::AllAgents)
            .unwrap_or_else(|| Vec::new(&env));
        all.push_back(agent.clone());
        env.storage().instance().set(&DataKey::AllAgents, &all);

        env.events().publish(
            (symbol_short!("agent"), symbol_short!("register")),
            agent,
        );
    }

    /// Update an existing agent's metadata. Agent must sign.
    pub fn update_profile(
        env: Env,
        agent: Address,
        name: Option<String>,
        endpoint: Option<String>,
        description: Option<String>,
    ) {
        agent.require_auth();

        let mut profile: AgentProfile = env
            .storage()
            .instance()
            .get(&DataKey::Agent(agent.clone()))
            .expect("agent not registered");

        if let Some(n) = name {
            profile.name = n;
        }
        if let Some(e) = endpoint {
            profile.endpoint = e;
        }
        if let Some(d) = description {
            profile.description = d;
        }

        env.storage()
            .instance()
            .set(&DataKey::Agent(agent.clone()), &profile);

        env.events().publish(
            (symbol_short!("agent"), symbol_short!("updated")),
            agent,
        );
    }

    /// Record a payment for an agent. Only callable by the admin (the indexer).
    ///
    /// # Arguments
    ///
    /// * `caller` — must be admin (the indexer service)
    /// * `agent` — the agent that received payment
    /// * `amount` — paid amount in token base units
    pub fn record_payment(env: Env, caller: Address, agent: Address, amount: i128) {
        // SECURITY: require_auth proves the caller actually signed this tx.
        // Without it, anyone could pass the admin's (public) address as `caller`
        // and forge reputation updates. The `caller != admin` check alone is NOT
        // sufficient because addresses are public.
        caller.require_auth();

        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("contract not initialized");
        if caller != admin {
            panic!("only admin can record payments");
        }

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let mut profile: AgentProfile = env
            .storage()
            .instance()
            .get(&DataKey::Agent(agent.clone()))
            .expect("agent not registered");

        profile.score = profile.score.checked_add(amount).expect("score overflow");
        profile.bounties_done = profile.bounties_done.checked_add(1).expect("overflow");

        env.storage()
            .instance()
            .set(&DataKey::Agent(agent.clone()), &profile);

        env.events().publish(
            (symbol_short!("agent"), symbol_short!("paid")),
            (agent, amount),
        );
    }

    /// Get an agent's profile.
    pub fn get_agent(env: Env, agent: Address) -> Option<AgentProfile> {
        env.storage().instance().get(&DataKey::Agent(agent))
    }

    /// Get the top-N agents by score. Returns a sorted vec of (address, score).
    ///
    /// Note: this is O(n log n) and bounded by `limit`. For production with
    /// thousands of agents, an off-chain indexer is preferred.
    pub fn get_leaderboard(env: Env, limit: u32) -> Vec<(Address, i128)> {
        let all: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::AllAgents)
            .unwrap_or_else(|| Vec::new(&env));

        // Collect (address, score) pairs
        let mut entries: Vec<(Address, i128)> = Vec::new(&env);
        for addr in all.iter() {
            if let Some(p) = env
                .storage()
                .instance()
                .get::<DataKey, AgentProfile>(&DataKey::Agent(addr.clone()))
            {
                entries.push_back((addr.clone(), p.score));
            }
        }

        // Selection sort descending by score (fine for small N)
        let n = entries.len();
        for i in 0..n {
            let mut best_idx = i;
            for j in (i + 1)..n {
                let a = entries.get_unchecked(j).1;
                let b = entries.get_unchecked(best_idx).1;
                if a > b {
                    best_idx = j;
                }
            }
            if best_idx != i {
                let tmp = entries.get_unchecked(i);
                let other = entries.get_unchecked(best_idx);
                entries.set(i, other);
                entries.set(best_idx, tmp);
            }
        }

        let mut out: Vec<(Address, i128)> = Vec::new(&env);
        let take = if limit > n { n } else { limit };
        for i in 0..take {
            out.push_back(entries.get_unchecked(i));
        }
        out
    }

    /// Total agents registered. Useful for stats.
    pub fn agent_count(env: Env) -> u32 {
        let all: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::AllAgents)
            .unwrap_or_else(|| Vec::new(&env));
        all.len()
    }
}