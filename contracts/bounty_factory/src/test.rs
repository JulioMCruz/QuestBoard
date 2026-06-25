//! Soroban unit tests for BountyFactory.
//!
//! Run with: `cargo test` from `contracts/bounty_factory/`

use soroban_sdk::{
    testutils::Address as _,
    token, Address, Env, String,
};

use crate::{BountyFactory, BountyFactoryClient, BountyStatus};

/// Helper: register a Soroban token contract for testing.
fn create_token_contract<'a>(env: &'a Env, admin: &Address) -> token::Client<'a> {
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    token::Client::new(env, &sac.address())
}

/// Helper: mint tokens to a user.
fn mint(env: &Env, token: &token::Client, to: &Address, amount: i128) {
    token::StellarAssetClient::new(env, &token.address).mint(to, &amount);
}

#[test]
fn test_init_creates_factory() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BountyFactory, ());
    let client = BountyFactoryClient::new(&env, &contract_id);

    client.init(&None);
    // No way to inspect init state directly, but a create_bounty should work
}

#[test]
fn test_create_bounty_locks_funds() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let poster = Address::generate(&env);
    let token = create_token_contract(&env, &admin);
    mint(&env, &token, &poster, 1000);

    let contract_id = env.register(BountyFactory, ());
    let client = BountyFactoryClient::new(&env, &contract_id);
    client.init(&None);

    let factory_addr = contract_id.clone();
    let id = client.create_bounty(
        &poster,
        &String::from_str(&env, "Write README"),
        &String::from_str(&env, "Need a clear README"),
        &500i128,
        &token.address.clone(),
        &24u32,
    );

    assert_eq!(id, 0);

    // Check that funds are locked in escrow
    let balance_factory = token.balance(&factory_addr);
    let balance_poster = token.balance(&poster);
    assert_eq!(balance_factory, 500);
    assert_eq!(balance_poster, 500);

    // Check bounty state
    let bounty = client.get_bounty(&id).unwrap();
    assert_eq!(bounty.amount, 500);
    assert_eq!(bounty.status, BountyStatus::Open);
    assert!(bounty.agent.is_none());
}

#[test]
fn test_full_lifecycle_release_to_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let poster = Address::generate(&env);
    let agent = Address::generate(&env);
    let token = create_token_contract(&env, &admin);
    mint(&env, &token, &poster, 1000);

    let contract_id = env.register(BountyFactory, ());
    let client = BountyFactoryClient::new(&env, &contract_id);
    client.init(&None);

    let factory_addr = contract_id.clone();

    // Create
    let id = client.create_bounty(
        &poster,
        &String::from_str(&env, "Write README"),
        &String::from_str(&env, "Need a clear README"),
        &500i128,
        &token.address.clone(),
        &24u32,
    );

    // Claim
    client.claim_bounty(&id, &agent);
    let b = client.get_bounty(&id).unwrap();
    assert_eq!(b.status, BountyStatus::Claimed);
    assert_eq!(b.agent, Some(agent.clone()));

    // Submit proof
    client.submit_proof(
        &id,
        &agent,
        &String::from_str(&env, "https://github.com/me/readme"),
    );
    let b = client.get_bounty(&id).unwrap();
    assert_eq!(b.status, BountyStatus::Submitted);

    // Release
    client.release_payment(&id);
    let b = client.get_bounty(&id).unwrap();
    assert_eq!(b.status, BountyStatus::Released);

    // Funds moved to agent
    assert_eq!(token.balance(&agent), 500);
    assert_eq!(token.balance(&factory_addr), 0);
}

#[test]
fn test_only_claiming_agent_can_submit() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let poster = Address::generate(&env);
    let agent_a = Address::generate(&env);
    let agent_b = Address::generate(&env);
    let token = create_token_contract(&env, &admin);
    mint(&env, &token, &poster, 1000);

    let contract_id = env.register(BountyFactory, ());
    let client = BountyFactoryClient::new(&env, &contract_id);
    client.init(&None);

    let id = client.create_bounty(
        &poster,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "Description"),
        &100i128,
        &token.address.clone(),
        &24u32,
    );
    client.claim_bounty(&id, &agent_a);

    // Agent B tries to submit — should panic
    let result = client.try_submit_proof(
        &id,
        &agent_b,
        &String::from_str(&env, "stolen proof"),
    );
    assert!(result.is_err(), "non-claiming agent must not submit");
}

#[test]
fn test_refund_when_open() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let poster = Address::generate(&env);
    let token = create_token_contract(&env, &admin);
    mint(&env, &token, &poster, 1000);

    let contract_id = env.register(BountyFactory, ());
    let client = BountyFactoryClient::new(&env, &contract_id);
    client.init(&None);

    let factory_addr = contract_id.clone();

    let id = client.create_bounty(
        &poster,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "Description"),
        &300i128,
        &token.address.clone(),
        &24u32,
    );

    // Poster refunds before anyone claims
    client.refund(&id);

    let b = client.get_bounty(&id).unwrap();
    assert_eq!(b.status, BountyStatus::Refunded);

    // Funds returned
    assert_eq!(token.balance(&poster), 1000);
    assert_eq!(token.balance(&factory_addr), 0);
}

#[test]
fn test_cannot_claim_twice() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let poster = Address::generate(&env);
    let agent_a = Address::generate(&env);
    let agent_b = Address::generate(&env);
    let token = create_token_contract(&env, &admin);
    mint(&env, &token, &poster, 1000);

    let contract_id = env.register(BountyFactory, ());
    let client = BountyFactoryClient::new(&env, &contract_id);
    client.init(&None);

    let id = client.create_bounty(
        &poster,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "Description"),
        &100i128,
        &token.address.clone(),
        &24u32,
    );

    client.claim_bounty(&id, &agent_a);

    // Agent B tries to claim — should panic because already Claimed
    let result = client.try_claim_bounty(&id, &agent_b);
    assert!(result.is_err(), "cannot claim already-claimed bounty");
}

#[test]
fn test_cannot_release_unsubmitted() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let poster = Address::generate(&env);
    let agent = Address::generate(&env);
    let token = create_token_contract(&env, &admin);
    mint(&env, &token, &poster, 1000);

    let contract_id = env.register(BountyFactory, ());
    let client = BountyFactoryClient::new(&env, &contract_id);
    client.init(&None);

    let id = client.create_bounty(
        &poster,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "Description"),
        &100i128,
        &token.address.clone(),
        &24u32,
    );
    client.claim_bounty(&id, &agent);

    // Try to release before submit — should panic
    let result = client.try_release_payment(&id);
    assert!(result.is_err(), "cannot release before submission");
}

#[test]
fn test_list_by_status_returns_open_bounties() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let poster = Address::generate(&env);
    let token = create_token_contract(&env, &admin);
    mint(&env, &token, &poster, 1000);

    let contract_id = env.register(BountyFactory, ());
    let client = BountyFactoryClient::new(&env, &contract_id);
    client.init(&None);

    let _id_0 = client.create_bounty(
        &poster,
        &String::from_str(&env, "Bounty 0"),
        &String::from_str(&env, "Desc"),
        &100i128,
        &token.address.clone(),
        &24u32,
    );
    let id_1 = client.create_bounty(
        &poster,
        &String::from_str(&env, "Bounty 1"),
        &String::from_str(&env, "Desc"),
        &100i128,
        &token.address.clone(),
        &24u32,
    );
    let _id_2 = client.create_bounty(
        &poster,
        &String::from_str(&env, "Bounty 2"),
        &String::from_str(&env, "Desc"),
        &100i128,
        &token.address.clone(),
        &24u32,
    );

    // Claim bounty 1
    let agent = Address::generate(&env);
    client.claim_bounty(&id_1, &agent);

    // Open should be [0, 2]
    let open_ids = client.list_by_status(&BountyStatus::Open);
    assert_eq!(open_ids.len(), 2);
    assert!(open_ids.contains(&0u64));
    assert!(open_ids.contains(&2u64));

    // Claimed should be [1]
    let claimed_ids = client.list_by_status(&BountyStatus::Claimed);
    assert_eq!(claimed_ids.len(), 1);
    assert!(claimed_ids.contains(&1u64));
}

#[test]
fn test_create_bounty_rejects_zero_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let poster = Address::generate(&env);
    let token = create_token_contract(&env, &admin);

    let contract_id = env.register(BountyFactory, ());
    let client = BountyFactoryClient::new(&env, &contract_id);
    client.init(&None);

    let result = client.try_create_bounty(
        &poster,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "Description"),
        &0i128,
        &token.address.clone(),
        &24u32,
    );
    assert!(result.is_err(), "zero amount must panic");
}

#[test]
fn test_create_bounty_rejects_zero_deadline() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let poster = Address::generate(&env);
    let token = create_token_contract(&env, &admin);

    let contract_id = env.register(BountyFactory, ());
    let client = BountyFactoryClient::new(&env, &contract_id);
    client.init(&None);

    let result = client.try_create_bounty(
        &poster,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "Description"),
        &100i128,
        &token.address.clone(),
        &0u32,
    );
    assert!(result.is_err(), "zero deadline must panic");
}