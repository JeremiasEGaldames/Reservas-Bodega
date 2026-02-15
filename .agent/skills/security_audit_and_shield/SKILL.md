---
name: "security_audit_and_shield"
description: "Audits Supabase security, including RLS policies, authentication checks, potential leaks, and environment variable prefixes."
---

# Security Audit and Shield

This skill checks for proper authentication in the admin panel, configures access policies (RLS), and ensures sensitive information is protected.

## 1. Route Review (Admin Panel)

1.  **Objective**: Ensure the `/app/admin` route (and sub-routes) validates user sessions.
2.  **Scan**: Use `grep_search` or `view_file` to inspect files in `app/admin` (e.g., `page.tsx`, `layout.tsx`).
3.  **Check**: Look for calls to `supabase.auth.getSession()` or `supabase.auth.getUser()`.
4.  **Action**:
    -   If no session check exists, implement a redirection logic to `/login` if the user is not authenticated.
    -   Example snippet:
        ```typescript
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          redirect('/login');
        }
        ```

## 2. SQL Shielding (RLS)

1.  **Objective**: Secure the `disponibilidad` table by removing anonymous access and enforcing authentication.
2.  **Action**:
    -   Use `mcp_supabase_execute_sql` to:
        1.  Drop existing policies that allow `anon` role access on `disponibilidad`.
        2.  Create policies that only allow the `authenticated` role to select/insert/update/delete.
    -   Example Policy:
        ```sql
        create policy "Authenticated access only"
        on "public"."disponibilidad"
        as permissive
        for all
        to authenticated
        using (true);
        ```

## 3. Environment Variable Prefix Validation

1.  **Objective**: Prevent frontend connection failures by ensuring client-side variables use `NEXT_PUBLIC_`.
2.  **Scan**: Search the codebase for `process.env.SUPABASE_URL` and `process.env.SUPABASE_ANON_KEY` (or similar).
3.  **Action**:
    -   Verify they are prefixed with `NEXT_PUBLIC_` if used in client components or passed to client components.
    -   Suggest renaming to `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in code and `.env` files if missing.

## 4. Leak Prevention

1.  **Objective**: Detect hardcoded API keys committed to the codebase.
2.  **Scan**: Search for long random strings (e.g., regex `eyJh...` for JWTs or `sbp_...`).
3.  **Action**:
    -   If found, replace them with `process.env.VARIABLE_NAME`.
    -   Add the key to `.env` (and `.env.local` if appropriate).

## 5. Report Generation

1.  **Objective**: Summarize findings and actions taken.
2.  **Action**:
    -   Create a timestamped markdown report in the root directory (e.g., `security_audit_report_<timestamp>.md`).
    -   List:
        -   Files modified (e.g., for auth checks).
        -   SQL policies applied.
        -   Environment variables checked/fixed.
        -   Leaks detected and remediated.
