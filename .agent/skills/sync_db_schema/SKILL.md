---
name: sync_db_schema
description: Synchronizes codebase table names with Supabase schema and enforces NEXT_PUBLIC_ prefix for env vars.
---

# Sync DB Schema Skill

This skill ensures your local codebase references correct Supabase table names and environment variables.

## Usage

When executing this skill, you must perform the following steps sequentially. As an agent, you have access to tools that can perform these actions.

### Step 1: Fetch Supabase Schema
1.  **Identify Project ID**: Call `supabase-mcp-server_list_projects`. Select the relevant project ID for the current workspace.
2.  **List Tables**: Call `supabase-mcp-server_list_tables` with the `project_id`.
    -   Store the list of table names (e.g., `['disponibilidad', 'reservas', 'users']`).

### Step 2: Scan Codebase for Table References
1.  **Search Code**: Use `grep_search` to find all occurrences of `supabase.from(`.
    -   Target directories: `/app`, `/lib`.
    -   Query: `\.from\(['"]` (escaped as needed).
2.  **Extract Names**: Parse the search results to identify the table names being used (e.g., `supabase.from('horarios')` -> `horarios`).

### Step 3: Analyze and Fix Table Name Mismatches
1.  **Compare**: Check if each extracted table name exists in the list from Step 1.
2.  **Identify Errors**: Flag any name that does not match.
    -   Example: Code uses `horarios`, but DB has `disponibilidad`.
3.  **Auto-Correct**:
    -   If a mismatch is found, determine the correct table name from the schema list (look for synonyms, singular/plural variations, or translation matches).
    -   Use `replace_file_content` to update the code with the correct table name.
    -   *Constraint*: If the correct table is ambiguous, ask the user for clarification before applying changes.

### Step 4: Enforce Environment Variable Prefixes
1.  **Scan Env Files**: Use `find_by_name` to locate `.env` files (e.g., `.env.local`, `.env`).
2.  **Audit Variables**: Read the files. Identify variables that:
    -   Are used in client-side code (imported or referenced in `/app` components).
    -   Do **not** start with `NEXT_PUBLIC_`.
3.  **Apply Fixes**:
    -   Rename the variable in the `.env` file (append `NEXT_PUBLIC_`).
    -   Search the codebase for usages of the old variable name.
    -   Update all usages to the new `NEXT_PUBLIC_` prefixed name.
