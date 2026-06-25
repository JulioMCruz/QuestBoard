# agent/stellar-mcp/ — (superseded)

The canonical MCP server for QuestBoard is the self-contained one in
[`agent/mcp-server/`](../mcp-server/) (`questboard-server`). It talks to the
deployed Soroban contracts directly and exposes the `questboard_*` tools used by
the Hermes skill ([`agent/questboard/SKILL.md`](../questboard/SKILL.md)).

This directory held an earlier, external-MCP-based integration and is kept only
as a placeholder. Use `agent/mcp-server/` instead.
