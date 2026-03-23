<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Bitlasso project. PostHog was initialised in `src/main.tsx` and the app wrapped with `PostHogProvider`. Thirteen client-side events were instrumented across five files covering the full merchant and customer journeys: wallet onboarding (creation and reconnection with user identification), payment request lifecycle, loyalty token creation, receipt issuance, and the customer-side payment flow including method selection, token redemption, and payment completion. User identification via spark address is called at wallet creation and connection so that all subsequent events are tied to the same identity. `posthog.reset()` is called on disconnect to clear the identity.

| Event | Description | File |
|---|---|---|
| `wallet_created` | User creates a new wallet | `src/pages/LoginPage.tsx` |
| `wallet_connected` | User connects an existing wallet via passphrase | `src/pages/LoginPage.tsx` |
| `wallet_disconnected` | User disconnects their wallet | `src/hooks/use-wallet.tsx` |
| `loyalty_token_created` | Merchant deploys a new loyalty token | `src/pages/DashboardPage.tsx` |
| `payment_request_created` | Merchant creates a payment request | `src/pages/DashboardPage.tsx` |
| `receipt_issued` | Merchant mints tokens and issues a receipt | `src/pages/DashboardPage.tsx` |
| `payment_request_claimed` | Merchant claims funds from a settled request | `src/pages/DashboardPage.tsx` |
| `payment_method_selected` | Customer selects a payment method tab | `src/pages/PaymentPage.tsx` |
| `wallet_connected_for_discount` | Customer connects XVerse wallet for loyalty discount | `src/pages/PaymentPage.tsx` |
| `tokens_redeemed` | Customer redeems loyalty tokens for a discount | `src/pages/PaymentPage.tsx` |
| `payment_completed` | Customer completes a payment via XVerse wallet | `src/pages/PaymentPage.tsx` |
| `notification_settings_saved` | Merchant saves notification settings | `src/pages/Settings.tsx` |
| `wallet_secret_revealed` | User reveals their wallet secret passphrase | `src/pages/Settings.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://eu.posthog.com/project/144960/dashboard/582112
  - **Wallet Onboarding** (trend): https://eu.posthog.com/project/144960/insights/6L1GV8L2
  - **Payment Conversion Funnel** (funnel): https://eu.posthog.com/project/144960/insights/u2hkbE44
  - **Loyalty Token Adoption** (funnel): https://eu.posthog.com/project/144960/insights/47Ug6QxR
  - **Payment Method Breakdown** (pie): https://eu.posthog.com/project/144960/insights/6U09kYpa
  - **Loyalty Discount Funnel** (funnel): https://eu.posthog.com/project/144960/insights/QC5SPILt

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
