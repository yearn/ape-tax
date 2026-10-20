# Vercel deployment

`.github/workflows/vercel-deploy.yml` calls Yearn's shared workflow pinned to
`ca8eb206d09f5d3af56c9df14c3ab7b652cfafcc`. Pull requests deploy previews; pushes
to `main` deploy production. Fork pull requests are rejected by the shared workflow.

## Required configuration

Set these GitHub Actions **repository variables** (identity IDs are not secrets):

| Variable | Value |
| --- | --- |
| `DOPPLER_PREVIEW_IDENTITY_ID` | Preview OIDC identity ID |
| `DOPPLER_PRODUCTION_IDENTITY_ID` | Production OIDC identity ID |

Both identities need read access to exactly these Doppler configs:

| Project | Config | Deployment credentials |
| --- | --- | --- |
| `webops-shared-prod` | `deploy-configs` | `VERCEL_TOKEN`, `VERCEL_ORG_ID` |
| `ape-tax` | `deploy-configs` | `VERCEL_PROJECT_ID` for the existing `ape-tax` Vercel project |

Keep application secrets out of `deploy-configs`: the workflow exports that
config to the runner. No Doppler service token or Vercel credentials need to
be stored in GitHub. This change adds no application environment variables.

## OIDC identities

Use GitHub's issuer `https://token.actions.githubusercontent.com` and confirm the
issued audience (normally `https://github.com/yearn`). Bind both identities to:

`job_workflow_ref=yearn/yearn-gha/.github/workflows/vercel-deploy.yml@ca8eb206d09f5d3af56c9df14c3ab7b652cfafcc`

- Preview subject: `repo:yearn/ape-tax:pull_request`; require `event_name=pull_request`.
- Production subject: `repo:yearn/ape-tax:ref:refs/heads/main`; require
  `event_name=push` and `ref=refs/heads/main`.

Use the equivalent immutable subject if the repository enables GitHub's immutable
OIDC subject format. Keep the workflow SHA and identity claims in sync when updating.

## Application secrets and cutover

Sync `ape-tax` / `preview` to Vercel Preview and `ape-tax` / `prd` to
Vercel Production through Doppler's Vercel integration, with Sensitive enabled.
Do not sync `deploy-configs` to Vercel. Verify the existing application values
before enabling a new sync. The build runs remotely on Vercel with those values.

Configure both identities and repository variables before expecting deployments
to succeed. After a successful Actions preview, disable Vercel's automatic Git
deployments in the project settings to avoid duplicate deployments. This PR does
not change those external settings or provision Doppler resources.

See [the shared deployment guide](https://github.com/yearn/yearn-gha/blob/ca8eb206d09f5d3af56c9df14c3ab7b652cfafcc/specs/doppler-vercel.md)
for the full setup and cutover procedure.
