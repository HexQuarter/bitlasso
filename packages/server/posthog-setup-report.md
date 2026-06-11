<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into this Node.js/Express API. A new singleton client module (`src/posthog.ts`) was created and wired into three key files. Event tracking covers the full payment lifecycle — from price quoting through request creation to final settlement — as well as the token bundle purchase and redemption flows. Error autocapture is enabled on the global Express error handler, and the PostHog client is cleanly shut down on `SIGINT`/`SIGTERM` to ensure all queued events are flushed before the process exits.

| Event | Description | File |
|---|---|---|
| `payment_request_created` | Fired when a payment request is successfully published to Nostr after validating the on-chain transaction | `src/api/paymentRequest.ts` |
| `token_purchase_completed` | Fired when a user successfully purchases a token bundle (tokens minted and transferred) | `src/api/paymentRequest.ts` |
| `payment_price_quote_generated` | Fired when a new BTC price quote is generated for a payment request (top of payment funnel) | `src/api/paymentRequest.ts` |
| `payment_settled` | Fired when a pending payment is confirmed and settled (via Spark or BTC transaction) | `src/job/confirmPendingPayments.ts` |
| `token_redemption_applied` | Fired when a user redeems tokens for a discount on a payment request | `src/job/confirmPendingPayments.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard – Analytics basics:** https://eu.posthog.com/project/144960/dashboard/583361
- **Payment Conversion Funnel** (price quote → request created → settled): https://eu.posthog.com/project/144960/insights/IdwLvgYJ
- **Key Activity Trends (Weekly):** https://eu.posthog.com/project/144960/insights/TMlLKhYf
- **Token Purchases vs Redemptions:** https://eu.posthog.com/project/144960/insights/3gy8AcBj
- **Payments Settled by Method** (Spark vs BTC breakdown): https://eu.posthog.com/project/144960/insights/BmCC2yuz
- **Daily Payment Volume:** https://eu.posthog.com/project/144960/insights/PaMeH01M

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
