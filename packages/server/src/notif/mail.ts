import mailjet from 'node-mailjet'
import { FullPaymentRequest } from '../nostr'

const mj = mailjet.apiConnect(process.env.MJ_APIKEY_PUBLIC as string, process.env.MJ_APIKEY_PRIVATE as string)

const sendEmail = async (recipient: string, subject: string, html: string) => {
  await mj.post('send').request({
    FromEmail: 'bitlasso@hexquarter.com',
    FromName: 'Bitlasso',
    Subject: subject,
    'Html-part': html,
    Recipients: [{ Email: recipient }],
  })
}

export const sendMonitorNotification = async (subject: string, html: string) => {
  try {
    await sendEmail('bitlasso@hexquarter.com', subject, html)
  } catch (err) {
    console.error('Failed to send monitor email:', err)
  }
}

export const notifyByEmail = async (paymentRequest: FullPaymentRequest, recipient: string) => {
  await sendEmail(recipient, 'Bitlasso: Payment settlement confirmation', `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Payment Settled — Bitlasso</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap');

          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            background-color: #f9f9f9;
            font-family: ui-sans-serif, system-ui, sans-serif;
            color: #1a1a1a;
            -webkit-font-smoothing: antialiased;
          }

          .wrapper {
            max-width: 560px;
            margin: 0 auto;
            padding: 32px 16px 48px;
          }

          .logo-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 28px;
          }

          .logo-text {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 22px;
            font-weight: 400;
            letter-spacing: -0.02em;
            color: #1a1a1a;
          }

          .logo-text span {
            color: rgb(255, 96, 28);
          }

          .card {
            background: #ffffff;
            border: 1px solid rgba(0,0,0,0.08);
            border-radius: 16px;
            overflow: hidden;
          }

          .card-header {
            padding: 20px 24px;
            border-bottom: 1px solid rgba(0,0,0,0.08);
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(34, 197, 94, 0.15);
            border: 1px solid rgba(34, 197, 94, 0.2);
            border-radius: 8px;
            padding: 3px 10px;
            width: fit-content;
          }

          .status-dot {
            width: 8px;
            height: 8px;
            background: #166534;
            border-radius: 50%;
            flex-shrink: 0;
          }

          .status-label {
            font-family: 'Space Mono', monospace;
            font-size: 10px;
            text-transform: uppercase;
            color: #166534;
            font-weight: 700;
          }

          .card-title {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 20px;
            font-weight: 400;
            color: #1a1a1a;
            line-height: 1.3;
          }

          .card-content {
            padding: 20px 24px;
            border-bottom: 1px solid rgba(0,0,0,0.08);
          }

          .section-label {
            font-family: 'Space Mono', monospace;
            font-size: 10px;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: rgba(0,0,0,0.4);
            margin-bottom: 16px;
          }

          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }

          .detail-item {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }

          .detail-key {
            font-family: 'Space Mono', monospace;
            font-size: 10px;
            color: rgba(0,0,0,0.4);
          }

          .detail-value {
            font-family: 'Space Mono', monospace;
            font-size: 12px;
            color: #1a1a1a;
          }

          .detail-value.primary {
            color: rgb(255, 96, 28);
          }

          .claim-section {
            padding: 20px 24px;
            text-align: center;
          }

          .action-block {
            background: rgba(255, 96, 28, 0.04);
            border: 1px solid rgba(255, 96, 28, 0.15);
            border-radius: 10px;
            padding: 16px 20px;
            margin-top: 16px;
          }

          .action-label {
            font-family: 'Space Mono', monospace;
            font-size: 10px;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: rgb(255, 96, 28);
            margin-bottom: 8px;
          }

          .action-text {
            font-size: 13px;
            color: rgba(0,0,0,0.6);
            line-height: 1.6;
            margin-bottom: 16px;
          }

          .action-text strong {
            color: #1a1a1a;
            font-weight: 600;
          }

          .cta-button {
            display: inline-block;
            background: rgb(255, 96, 28);
            color: #ffffff;
            font-family: 'Space Mono', monospace;
            font-size: 11px;
            text-transform: uppercase;
            text-decoration: none;
            padding: 11px 20px;
            border-radius: 6px;
            font-weight: 700;
          }

          .footer {
            margin-top: 24px;
            padding: 0 4px;
          }

          .footer-text {
            font-family: 'Space Mono', monospace;
            font-size: 10px;
            color: rgba(0,0,0,0.3);
            line-height: 1.8;
          }

          .footer-text a {
            color: rgba(0,0,0,0.4);
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">

          <div class="logo-bar">
            <div class="logo-text"><span>bit</span>lasso</div>
          </div>

          <div class="card">

            <div class="card-header">
              <div class="status-badge">
                <div class="status-dot"></div>
                <span class="status-label">Settled</span>
              </div>
              <div class="card-title">Payment settlement confirmation</div>
            </div>

            <div class="card-content">
              <div class="section-label">Payment details</div>
              <div class="details-grid">
                <div class="detail-item">
                  <span class="detail-key">Amount (USD)</span>
                  <span class="detail-value primary" style='font-size: 1em'><strong>${paymentRequest.amount + (paymentRequest.redeemAmount || 0)}</strong></span>
                </div>
                <div class="detail-item">
                  <span class="detail-key">Items</span>
                  ${paymentRequest.items?.map((i) => {
                    `<span class="detail-value"><strong>${i.title}: <span class='detail-value primary'>${i.amount}</span></strong></span>`
                  })}
                </div>
              </div>
            </div>

            <div class="claim-section" >
                <a href="https://bitlasso.xyz/#/payment/${paymentRequest.id}" target='_blank' class="cta-button">See payment certificate →</a>
              </div>
            </div>

            <div class="footer">
              <div class="footer-text">
                You're receiving this because you enabled email notifications.
              </div>
              <br />
              <div class="footer-text">
                <a href='https://bitlasso.xyz/#/app' target='_blank'>Access your billing portal</a>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
      `
  )
}