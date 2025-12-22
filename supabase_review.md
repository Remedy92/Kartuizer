# Supabase MCP Review

I have reviewed the Supabase configuration, specifically focusing on the Database Schema and RLS (Row Level Security) policies.

## 🚨 Critical Security Findings

### 1. Global Read Access on Votes
**Risk Level: HIGH**
The `votes` table has the following policies:
- `Votes readable`: Grants `SELECT` access to all `authenticated` users with `true`.
- `Anon can read votes`: Grants `SELECT` access to all `anon` users with `true`.

**Impact**: This effectively exposes **all voting history** to the public internet. Anyone with your Supabase URL and Anon Key (which is public in the frontend) can download the entire votes table, regardless of group membership. The specific `Members can see votes` policy is rendered useless by these broader permissions.

### 2. Potential Vote Spoofing
**Risk Level: HIGH**
The `Members can vote` policy allows `INSERT` based on:
```sql
EXISTS ( SELECT 1 FROM group_members WHERE group_id = ... AND user_id = auth.uid() )
```
It confirms the *person submitting the request* is a group member, but it **does not** appear to enforce that the `vote.user_id` matches `auth.uid()`.
Since `Votes insert own` is a separate permissive policy, a malicious group member could potentially submit a vote with someone else's `user_id`, and the `Members can vote` policy would authorize it.

### 3. Widespread Public Read Access
**Risk Level: HIGH**
The pattern of global/anon read access exists across multiple sensitive tables:
- **`questions`**: `Anon can read questions` allows anyone to see all questions.
- **`groups`**: `Anon can read groups` allows anyone to see all groups.
- **`user_profiles`**: `Anon can read user_profiles` allows anyone to see user details (emails, names).

This defeats the purpose of the granular RLS policies (like `Members can see group questions`) which are present but ineffective due to these permissive overrides.

## Automated Advisor Findings

### Security Lints
- **Function Search Path Mutable**: `public.send_results_webhook` has a mutable search path. This is a potential security risk (SQL injection via search path).
- **Leaked Password Protection**: Currently disabled. Recommended to enable.

### Performance & Policy Lints
- **Multiple Permissive Policies**: Confirmed duplicate policies on `votes` table which degrade performance and complicate security:
    - **INSERT**: `Members can vote` AND `Votes insert own`.
    - **SELECT**: `Members can see votes` AND `Votes readable`.
- **Unindexed Foreign Keys**: Found 8+ unindexed foreign keys (e.g., `votes.poll_option_id`, `groups.created_by`), which can significantly impact query performance, especially with RLS.

## Database & Schema Observations

- **Migrations**: The migration history looks healthy and sequential.
- **Tables**: `poll_options`, `votes`, `groups` seem correctly structured with foreign keys.
- **Edge Functions**: `send-vote-results` is present and active.

## Recommendations

1.  **Purge Anon/Global Read Policies**:
    - Remove `Anon can read ...` policies from `votes`, `questions`, `groups`, and `user_profiles`.
    - Remove generic `... readable` policies that grant `true` access to all authenticated users.
    - Rely on specific, scoped policies like `Members can see group questions`.

2.  **Harden Vote Insertion**:
    - Ensure the `Members can vote` policy explicitly checks `votes.user_id = auth.uid()` OR rely solely on `Votes insert own` (and add the group check there).
    - Best practice: A single `INSERT` policy that checks:
      ```sql
      ((user_id = auth.uid()) AND (EXISTS (SELECT 1 FROM group_members ...)))
      ```

I can proceed with generating a migration to fix these RLS issues if you would like.
