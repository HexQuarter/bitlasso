import sqlite from "better-sqlite3"

const db = new sqlite('./db')

db.exec(`
  CREATE TABLE IF NOT EXISTS quotes(
    request_id TEXT PRIMARY KEY,
    btc INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    ref_price_id TEXT NOT NULL,
    usd_price INTEGER NOT NULL
  )
`)

export { db }
