import express, { NextFunction, Request, Response } from "express"
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors'

import { db } from "./db"

import { getSparkAddress, getTokenAddress, init, shutdown as shutdownSpark } from "./spark"
import { getKeyPair } from "./nostr";
import { asyncHandler } from "./utils";
import { initNostrRelay } from "./nostr/relay";
import { PaymentRequestRouter } from "./api/paymentRequest";

import { startPollingPendingPayments } from "./job/confirmPendingPayments";
import { posthog } from "./posthog";

const PORT = process.env.PORT || 3000;
const INTERVAL_PENDING_PAYMENTS_CONF = Number(process.env.INTERVAL_PENDING_PAYMENTS_CONF) || 5000

if (!process.env['NSEC']) {
  throw new Error('NSEC env variable is required')
}

if (!process.env['NPUB']) {
  throw new Error('NPUB env variable is required')
}

const keypair = getKeyPair(process.env['NSEC'], process.env['NPUB'])

/**
 * Initializes and configures the Express application with essential middleware:
 * - Parses incoming JSON requests with a 10kb size limit.
 * - Secures HTTP headers using Helmet.
 * - Enables Cross-Origin Resource Sharing (CORS).
 * - Applies rate limiting to restrict each IP to 60 requests per minute, returning a custom error message on limit exceed.
 * - Sets 'trust proxy' to 1, allowing Express to properly handle proxy headers (e.g., when behind a reverse proxy).
 */
const app = express()
  .use(express.json({ limit: '10kb' }))
  .use(helmet())
  .use(cors({
    exposedHeaders: ['WWW-Authenticate']
  }))
  .use(rateLimit({
    windowMs: 1 * 60_000,
    max: 60,
    message: { error: 'TOO_MANY_REQUESTS' },
  }))
  .use((req: Request & { auth?: Record<string, string> }, _, next: NextFunction): void => {
    const authHeader = req.headers.authorization
    if (!authHeader) return next()
    const auth = authHeader
      .split(';')
      .map(p => p.trim())
      .reduce((acc: Record<string, string>, header) => {
        const [scheme, ...rest] = header.split(' ')
        if(!scheme) return acc
        acc[scheme.toLowerCase()] = rest.join(' ').trim()
        return acc
      }, {})

    req.auth = auth
    next()
  })
  .set('trust proxy', 1)
  .use(PaymentRequestRouter)

app.get('/status', asyncHandler(async (_req, res) => {
  const response = await fetch('https://spark.money/api/v1/status');
  const { status } = await response.json();
  res.json({
    sparkStatus: status
  })
}))

const server = app.listen(PORT, async () => {
  console.log(`Application listening on ${PORT}`)
  init()
  await initNostrRelay(server)
  await startPollingPendingPayments(db, keypair, INTERVAL_PENDING_PAYMENTS_CONF)
})

app.get('/settings', async (_req, res) => {
  const sparkAddress = await getSparkAddress()
  const tokenAddress = await getTokenAddress()
  res.json({
    tokenAddress,
    address: sparkAddress,
    npub: process.env['NPUB'],
    publicKey: keypair.publicKey
  })
})

// global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  posthog.captureException(err);
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
});

process.on('SIGINT', async () => {
  await shutdownSpark()
  await posthog.shutdown()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await shutdownSpark()
  await posthog.shutdown()
  process.exit(0)
})