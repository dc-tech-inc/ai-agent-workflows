# 3. Hashed bag-of-words retrieval instead of an embedding model or vector database

Status: accepted

## Context

The support bot needs retrieval over a small corpus (6 documents, 29 sections). An embedding model would need a download or an API key; a vector database would be a service to run.

## Decision

Chunks are the `##` sections of the Markdown files. Each chunk and each query becomes a 512-dimensional hashed bag of words plus bigrams, normalised, and ranked by cosine similarity in memory. A second gate requires that a minimum share of the query's words literally appear in the best chunk, because hash collisions alone let unrelated questions look related (the evals caught this).

## Consequences

- Deterministic, offline, no dependency, easy to read.
- It matches words, not meaning: a question phrased with synonyms the docs never use will miss. Fine for a fictional 6-document corpus, wrong for a real knowledge base; swap `support-bot/rag.ts` for an embedding index there.
