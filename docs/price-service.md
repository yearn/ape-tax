# Yearn Price Service

The server route `/api/prices/spot` forwards authenticated requests to the Price Service.

| Environment variable | Required | Default | Scope |
| --- | --- | --- | --- |
| `YEARN_PRICES_API_KEY` | Yes | None | Server only |
| `YEARN_PRICES_BASE_URL` | No | `https://prices.yearn.dev` | Server only |

The proxy resolves `/api/prices/spot` against the configured base URL.
Store both variables in the app's Doppler `prd` and `preview` configs and sync
them to the matching Vercel environments. Do not add the API key to Next.js
`env`, use a `NEXT_PUBLIC_` prefix, or expose it to browser code.

Each consumer key is also registered in Doppler `yearn-price/prd` under its
`API_KEY_<CLIENT>` name and published to the Price Service Worker. A Vercel
redeploy is required after changing the consumer's environment variables.
