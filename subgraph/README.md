# Subgraph (The Graph)

This folder contains a starter Subgraph for indexing the `Bounty` contract.

## Quick start

1. Install dependencies:

```bash
cd subgraph
npm i
```

2. Update `subgraph.yaml`:
   - `source.address`
   - `source.startBlock`
   - `network`

3. Generate types and build:

```bash
npm run codegen
npm run build
```

4. Deploy to Graph Studio / hosted infra using `graph deploy`.

## Indexed entities

- `Bounty`
- `Submission`

The frontend can consume the GraphQL endpoint through `VITE_INDEXER_GRAPHQL_URL`.

