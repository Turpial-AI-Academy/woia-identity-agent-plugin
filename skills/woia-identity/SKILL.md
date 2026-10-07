---
name: woia-identity
description: Use woia-identity for identity owns person/organization attributes, aliases and external refs only.
license: MIT
---

# woia-identity

## DISCOVER

Resolve exact organization, actor, accepted source authority and affected resources before retrieval. Load [operation contract](references/contract.md) for action, authority or persistence decisions. Missing current configuration blocks the operation.

## DECIDE

Identity owns Person/Organization attributes, aliases and external refs only. Merge/correct requires Data governance and independent competent confirmation; authenticated accounts, permissions and contextual roles never merge. Source-authorized fields only; no automatic latest-wins reconciliation.

## IMPLEMENT

Use scripts/provider.mjs execute with authenticated host-provided authority and stable operation_id. Do not trust caller-supplied permission claims. Persist returned state only through a qualified atomic revision/fencing boundary. Read requests are resource scoped. No direct network effects are implemented.

## VALIDATE

Run owning provider tests and Ecosystem thin certification on clean exact candidate. Do not infer backend/host/operator qualification from local helper PASS.

## REPORT

Report operation result, source evidence, candidate and support limitations. Block unsupported adapters and preserve original evidence; never substitute inference for accepted organizational fact.
