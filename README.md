# woia-identity

Portable Agent Plugin for Shared Person and Organization identity with scoped aliases and external references.

## Capability

~~~text
DISCOVER -> DECIDE -> IMPLEMENT -> VALIDATE -> REPORT
~~~

The plugin adapts to the repository it operates on without requiring the consumer to adopt WOIA's authoring toolchain.

## Portable package

~~~text
plugin.json
README.md
CHANGELOG.md
LICENSE
skills/**
# optional source diagnostic when retained by the repository
CHECKSUMS.sha256
~~~

`CHECKSUMS.sha256` is optional source evidence, not a required portable/release artifact.

Add `mcp.json` only if the capability genuinely requires MCP.

## Consumer requirements

Document only genuine capability/runtime requirements here. Do not list maintenance Node/pnpm/Mise/Docker unless the portable capability itself truly needs them.

## Development

~~~text
mise install
mise run bootstrap
mise run doctor
mise run ci:fast
mise run ci:extended
mise run release:check
~~~

## W1 provider implementation

Identity owns Person/Organization attributes, aliases and external refs only. Merge/correct requires Data governance and independent competent confirmation; authenticated accounts, permissions and contextual roles never merge. Source-authorized fields only; no automatic latest-wins reconciliation.

[Portable operation contract](skills/woia-identity/references/contract.md). Import execute/initial from skills/woia-identity/scripts/provider.mjs. No backend or live adapter is qualified. Public fixtures are synthetic; authenticated host must resolve current policies and persist transitions atomically with revision fencing.
