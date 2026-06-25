//! Soroban unit tests for AgentRegistry.
//!
//! Run with: `cargo test` from `contracts/agent_registry/`

use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

use crate::{AgentRegistry, AgentRegistryClient};

#[test]
fn test_init() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);

    client.init(&admin);
    assert_eq!(client.agent_count(), 0);
}

#[test]
fn test_register_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);
    client.init(&admin);

    client.register(
        &agent,
        &String::from_str(&env, "ScraperBot"),
        &String::from_str(&env, "https://agent-b.example.com"),
        &String::from_str(&env, "Scrapes anything"),
    );

    let profile = client.get_agent(&agent).unwrap();
    assert_eq!(profile.name, String::from_str(&env, "ScraperBot"));
    assert_eq!(profile.score, 0);
    assert_eq!(profile.bounties_done, 0);
    assert_eq!(client.agent_count(), 1);
}

#[test]
fn test_cannot_register_twice() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);
    client.init(&admin);

    client.register(
        &agent,
        &String::from_str(&env, "Bot"),
        &String::from_str(&env, "https://example.com"),
        &String::from_str(&env, ""),
    );

    let result = client.try_register(
        &agent,
        &String::from_str(&env, "Bot2"),
        &String::from_str(&env, "https://example2.com"),
        &String::from_str(&env, ""),
    );
    assert!(result.is_err(), "cannot register twice");
}

#[test]
fn test_update_profile() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);
    client.init(&admin);

    client.register(
        &agent,
        &String::from_str(&env, "OldName"),
        &String::from_str(&env, "https://old.com"),
        &String::from_str(&env, "old"),
    );

    client.update_profile(
        &agent,
        &Some(String::from_str(&env, "NewName")),
        &None,
        &Some(String::from_str(&env, "new desc")),
    );

    let p = client.get_agent(&agent).unwrap();
    assert_eq!(p.name, String::from_str(&env, "NewName"));
    // endpoint unchanged
    assert_eq!(p.endpoint, String::from_str(&env, "https://old.com"));
    assert_eq!(p.description, String::from_str(&env, "new desc"));
}

#[test]
fn test_record_payment_by_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);
    client.init(&admin);

    client.register(
        &agent,
        &String::from_str(&env, "Bot"),
        &String::from_str(&env, "https://example.com"),
        &String::from_str(&env, ""),
    );

    client.record_payment(&admin, &agent, &500i128);

    let p = client.get_agent(&agent).unwrap();
    assert_eq!(p.score, 500);
    assert_eq!(p.bounties_done, 1);

    client.record_payment(&admin, &agent, &250i128);
    let p = client.get_agent(&agent).unwrap();
    assert_eq!(p.score, 750);
    assert_eq!(p.bounties_done, 2);
}

#[test]
fn test_record_payment_rejects_non_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let rando = Address::generate(&env);
    let agent = Address::generate(&env);
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);
    client.init(&admin);

    client.register(
        &agent,
        &String::from_str(&env, "Bot"),
        &String::from_str(&env, "https://example.com"),
        &String::from_str(&env, ""),
    );

    let result = client.try_record_payment(&rando, &agent, &100i128);
    assert!(result.is_err(), "non-admin must not record payments");
}

#[test]
fn test_record_payment_requires_caller_signature() {
    // Regression: an attacker can read the admin's (public) address and pass it
    // as `caller`. The contract must still reject the call unless the admin
    // actually authorized it (caller.require_auth()).
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);
    client.init(&admin);
    client.register(
        &agent,
        &String::from_str(&env, "Bot"),
        &String::from_str(&env, "https://example.com"),
        &String::from_str(&env, ""),
    );

    // Drop to enforcing mode with no authorizations present.
    env.set_auths(&[]);
    let result = client.try_record_payment(&admin, &agent, &100i128);
    assert!(
        result.is_err(),
        "record_payment must require the caller's signature, not just a matching address"
    );
}

#[test]
fn test_record_payment_rejects_unregistered_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let rando = Address::generate(&env);
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);
    client.init(&admin);

    let result = client.try_record_payment(&admin, &rando, &100i128);
    assert!(result.is_err(), "must not record payment for unregistered agent");
}

#[test]
fn test_leaderboard_returns_sorted_top_n() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);
    client.init(&admin);

    // Register 4 agents
    let mut addrs: Vec<Address> = Vec::new(&env);
    for i in 0..4 {
        let a = Address::generate(&env);
        client.register(
            &a,
            &String::from_str(&env, "Bot"),
            &String::from_str(&env, ""),
            &String::from_str(&env, ""),
        );
        addrs.push_back(a.clone());
        // Bump different scores
        let score = match i {
            0 => 100i128,
            1 => 500i128,
            2 => 300i128,
            _ => 50i128,
        };
        for _ in 0..(score / 50) {
            client.record_payment(&admin, &a, &50i128);
        }
    }

    // Top 3 should be: addr[1]=500, addr[2]=300, addr[0]=100
    let top3 = client.get_leaderboard(&3u32);
    assert_eq!(top3.len(), 3);
    assert_eq!(top3.get(0).unwrap().1, 500);
    assert_eq!(top3.get(1).unwrap().1, 300);
    assert_eq!(top3.get(2).unwrap().1, 100);
}

#[test]
fn test_leaderboard_limit_larger_than_count() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);
    client.init(&admin);

    let a = Address::generate(&env);
    client.register(
        &a,
        &String::from_str(&env, "OnlyBot"),
        &String::from_str(&env, ""),
        &String::from_str(&env, ""),
    );

    // limit=10 with only 1 agent
    let top = client.get_leaderboard(&10u32);
    assert_eq!(top.len(), 1);
}

#[test]
fn test_leaderboard_empty() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);
    client.init(&admin);

    let top = client.get_leaderboard(&10u32);
    assert_eq!(top.len(), 0);
}