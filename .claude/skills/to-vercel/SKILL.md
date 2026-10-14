---
name: to-vercel
description: Work with the Vercel project workshop-8bit-game through the Vercel MCP (mcp__vercel__*). Use this whenever the user asks about its deployments, deploy status, build or runtime logs, runtime errors, rollbacks, redeploys, domains, or environment variables on Vercel, even if they don't say "Vercel" or name the project. Also use it when they paste a *.vercel.app URL or ask why the site is down, slow, or returning errors.
---

# To Vercel

Operate on the Vercel project **workshop-8bit-game** using the Vercel MCP tools. Use the MCP tools, not the `vercel` CLI, unless the user explicitly asks for the CLI.

## Target

Every call must be scoped to this project. Do not discover or switch to other projects unless the user asks.

- Project name: `workshop-8bit-game`
- Project ID: `prj_mOFpfyMpFE00qwXKCOwnvVR4Q5ny`
- Team / account ID: `team_HffieAgTiDAED48kgUq1ktE5`
- Scope slug: `joaopsguimaraes-projects`

Pass the team ID and project ID explicitly. Reuse these IDs; don't guess or re-probe them.

## Access check and 403 handling

The API has returned `403 forbidden` for this scope before ("Trying to access resource under scope joaopsguimaraes-projects"). If any call returns 403:

1. Stop. Do not retry the same call unchanged.
2. Tell the user to re-authenticate the Vercel MCP by running `/mcp` in Claude Code and selecting `vercel`, then authorize the `joaopsguimaraes-projects` scope.
3. Resume only after the user says it's done, and then make one fresh call to confirm access.

Don't claim re-authentication fixes the problem in advance. Report the actual error text if it persists.

## Workflow

Read before you write. For any question, start with the read-only tools below. Only fetch what the question needs.

**Read (safe, do freely):**
- Deployments: `mcp__vercel__list_deployments` (filter by project and time), then `mcp__vercel__get_deployment` for one.
- Deployment events and build output: `mcp__vercel__list_deployment_events`, `mcp__vercel__list_deployment_files`, `mcp__vercel__get_deployment_file_contents` for a specific file.
- Runtime logs and errors: `mcp__vercel__get_runtime_logs` and `mcp__vercel__get_runtime_errors`. Always filter by time window and deployment; don't pull unbounded logs.
- Project settings: `mcp__vercel__get_project`.
- Domains: `mcp__vercel__list_project_domains`.
- Environment variables: `mcp__vercel__filter_project_envs` for names and targets only.

**Write (confirm first):**
- Deploy: `mcp__vercel__create_deployment`.
- Cancel: `mcp__vercel__cancel_deployment`.
- Roll back: `mcp__vercel__request_rollback`.
- Change settings or env vars: `mcp__vercel__update_project`, `mcp__vercel__create_project_env`, `mcp__vercel__edit_project_env`.
- Pause or unpause: `mcp__vercel__pause_project`, `mcp__vercel__unpause_project`.

Before any write:
1. Inspect the current state (the latest production deployment, and any errors in the logs).
2. Show the user exactly what you're about to change and where.
3. Wait for an explicit yes.

After any write, read the state back and confirm the result. Distinguish "queued" or "building" from "ready". If the operation is still pending, say so.

## Secrets

- Never print secret values. When listing env vars, show only names, targets, and types.
- Never decrypt env values unless the user explicitly asks, and even then avoid echoing them back into chat.
- Don't ask for tokens or private keys. Use the MCP connection.

## Reporting

- Give the deployment URL, its state, and its commit or branch when you report on a deployment.
- For logs, quote the relevant lines with timestamps, not the full dump. Say how many lines you looked at and over what time window.
- If results are truncated or paginated, say so.
- If a call fails, report the error text and what you did about it. Don't guess a cause you haven't verified.
