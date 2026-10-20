# BREAK POINT — SQLite Database Architecture & Schema Documentation

The Break Point persistence subsystem utilizes local SQLite storage with Full-Text Search (FTS5) and strict relational provenance.

## 1. Schema Definitions

### Table: `conversations`
Stores session-level dialogue threads.
```sql
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `messages`
Stores individual conversational utterances and associated tool calls.
```sql
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT CHECK(role IN ('user', 'assistant', 'system')) NOT NULL,
    content TEXT NOT NULL,
    tone TEXT,
    tool_calls_json TEXT,
    provider_used TEXT,
    latency_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messages_convo ON messages(conversation_id);
```

### Table: `memories`
Stores durable user-approved knowledge items categorized into Facts, Preferences, Context, Goals, and Decisions.
```sql
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    category TEXT CHECK(category IN ('fact', 'preference', 'context', 'goal', 'decision')) NOT NULL,
    content TEXT NOT NULL,
    provenance TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    tags_json TEXT,
    verified_by_user INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_memories_cat ON memories(category);

-- Full-Text Search Virtual Table
CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
    id UNINDEXED,
    content,
    provenance,
    tags_json
);
```

### Table: `tools_audit`
Immutable execution ledger recording all system, file, and application operations.
```sql
CREATE TABLE IF NOT EXISTS tools_audit (
    id TEXT PRIMARY KEY,
    tool_name TEXT NOT NULL,
    parameters_json TEXT NOT NULL,
    result_json TEXT,
    status TEXT CHECK(status IN ('success', 'failed', 'denied', 'pending_confirmation')) NOT NULL,
    confirmed_by_user INTEGER DEFAULT 0,
    duration_ms INTEGER,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_status ON tools_audit(status);
```

### Table: `reminders`
Deterministic task and reminder queue managed by `ProactiveScheduler`.
```sql
CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    due_at DATETIME NOT NULL,
    recurrence TEXT DEFAULT 'none',
    status TEXT CHECK(status IN ('pending', 'completed', 'dismissed')) DEFAULT 'pending',
    priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_at, status);
```

### Table: `research_notes`
Archived web research dossiers with citations.
```sql
CREATE TABLE IF NOT EXISTS research_notes (
    id TEXT PRIMARY KEY,
    query TEXT NOT NULL,
    summary TEXT NOT NULL,
    sources_json TEXT NOT NULL,
    saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 2. Privacy & Credential Sanitization
Before any memory insertion, the database pipeline runs:
```ts
private filterSecrets(content: string): string {
  return content
    .replace(/AIza[0-9A-Za-z-_]{20,50}/gi, '[REDACTED_API_KEY]')
    .replace(/sk-[0-9A-Za-z-_]{20,50}/gi, '[REDACTED_API_KEY]')
    .replace(/gsk_[0-9A-Za-z-_]{20,50}/gi, '[REDACTED_API_KEY]')
    .replace(/(password\s*[:=]\s*)[^\s]+/gi, '$1[REDACTED]');
}
```
Credentials, authorization tokens, and sensitive strings are strictly sanitized before reaching disk persistence.
