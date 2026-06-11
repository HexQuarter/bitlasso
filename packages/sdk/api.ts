/**
 * API client for BitLasso SDK
 */

import { nip98 } from 'nostr-tools';
import type {
  SDKConfig,
  Settings,
  Status,
  PaymentPrice,
  PurchaseCreditsResponse,
  PublishPaymentRequestResponse,
  PaymentRequestPayload
} from './types.js';
import { SDKError } from './types.js';
import type { BreezPayment, Wallet } from './wallet.js';

/**
 * Bitlasso's API client class
 */
export class Client {
  private apiUrl: string;

  /**
   * Creates a new API client instance
   * @param config - SDK configuration
   */
  constructor(config: SDKConfig = {}) {
    this.apiUrl = config.apiUrl ||
      (config.dev ? 'http://localhost:4000' : 'https://api.bitlasso.xyz');
  }

  /**
   * Gets the full API URL for a given path
   * @param path - API path
   * @returns Full URL
   */
  private getApiUrl(path: string): string {
    return `${this.apiUrl}${path}`;
  }

  /**
   * Gets the current price for a payment request
   * @param paymentRequestId - Payment request ID
   * @returns Payment price information or undefined if not found
   * @throws {SDKError} If the request fails
   */
  async getPaymentPrice(paymentRequestId: string): Promise<PaymentPrice | undefined> {
    try {
      const response = await fetch(this.getApiUrl(`/payment-request/${paymentRequestId}/price`));
      if (!response.ok) {
        if (response.status === 404) return undefined;
        throw new SDKError(
          `Failed to get payment price: ${response.statusText}`,
          'GET_PAYMENT_PRICE_FAILED',
          response.status
        );
      }

      const data = await response.json();
      return {
        btc: data.btc,
        endtime: data.endtime,
        lightningInvoice: data.lightningInvoice
      };
    } catch (error) {
      if (error instanceof SDKError) throw error;
      throw new SDKError(
        `Network error while getting payment price: ${error instanceof Error ? error.message : String(error)}`,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Gets the current system status
   * @returns System status information
   * @throws {SDKError} If the request fails
   */
  async getStatus(): Promise<Status> {
    try {
      const response = await fetch(this.getApiUrl('/status'));
      if (!response.ok) {
        throw new SDKError(
          `Failed to get status: ${response.statusText}`,
          'GET_STATUS_FAILED',
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof SDKError) throw error;
      throw new SDKError(
        `Network error while getting status: ${error instanceof Error ? error.message : String(error)}`,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Gets system settings
   * @returns System settings
   * @throws {SDKError} If the request fails
   */
  async getSettings(): Promise<Settings> {
    try {
      const response = await fetch(this.getApiUrl('/settings'));
      if (!response.ok) {
        throw new SDKError(
          `Failed to get settings: ${response.statusText}`,
          'GET_SETTINGS_FAILED',
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof SDKError) throw error;
      throw new SDKError(
        `Network error while getting settings: ${error instanceof Error ? error.message : String(error)}`,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Purchases credits using a bundle
   * @param bundleId - Bundle ID to purchase
   * @param receiverAddress - Spark address to receive credits
   * @param wallet - Wallet instance for payment (if needed for L402 auth)
   * @returns Purchase response
   * @throws {SDKError} If the purchase fails
   */
  async purchaseCredits(
    wallet: Wallet,
    bundleId: string,
  ): Promise<PurchaseCreditsResponse> {
    try {
      const receiverAddress = await wallet.getSparkAddress()
      let response = await fetch(this.getApiUrl('/payment-request/purchase'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bundle: bundleId,
          receiverAddress
        })
      });

      if (response.status === 402 && wallet) {
        const authHeader = response.headers.get('WWW-Authenticate');
        if (authHeader) {
          const macaroonMatch = authHeader.match(/macaroon="([^"]+)"/);
          const invoiceMatch = authHeader.match(/invoice="([^"]+)"/);
          if (macaroonMatch && invoiceMatch) {
            const macaroon = macaroonMatch[1];
            const invoice = invoiceMatch[1];

            // Pay the invoice using the wallet
            const sendPromise = new Promise<BreezPayment>(async (resolve, reject) => {
              const cleanup = () => {
                wallet.off('paymentSent', onPaymentSent)
                wallet.off('paymentFailed', onPaymentFailed)
              }

              const onPaymentSent = (payment: BreezPayment) => {
                cleanup()
                resolve(payment)
              }
              const onPaymentFailed = (error: any) => {
                cleanup()
                reject(error)
              }

              wallet.on('paymentSent', onPaymentSent)
              wallet.on('paymentFailed', onPaymentFailed)

              await wallet.sendLightningPayment(invoice).catch((e) => {
                cleanup()
                reject(e)
              })
            })

            const payment = await sendPromise

            if (payment && payment.details?.type === 'lightning') {
              const preimage = payment.details.htlcDetails.preimage;
              if (preimage) {
                // Retry with Authorization header
                response = await fetch(this.getApiUrl('/payment-request/purchase'), {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `L402 ${macaroon}:${preimage}`
                  },
                  body: JSON.stringify({
                    bundle: bundleId,
                    receiverAddress
                  })
                });
              }
            }
          }
        }
      }

      if (!response.ok) {
        throw new SDKError(
          `Failed to purchase credits: ${response.statusText}`,
          'PURCHASE_CREDITS_FAILED',
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof SDKError) throw error;
      throw new SDKError(
        `Network error while purchasing credits: ${error instanceof Error ? error.message : String(error)}`,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Publishes a new payment request
   * @param paymentRequest - Payment request data
   * @param authToken - Authentication token (NIP-98)
   * @param wallet - Wallet instance for payment (if needed for L402 auth)
   * @param tokenBalances - Optional token balances for credit payments
   * @returns Published payment request response
   * @throws {SDKError} If publishing fails
   */
  async publishPaymentRequest(
    wallet: Wallet,
    paymentRequest: PaymentRequestPayload
  ): Promise<PublishPaymentRequestResponse> {

    const authToken = await nip98.getToken(`${this.apiUrl}/payment-request`, 'POST', async (e: any) => {
      const signed = await wallet.nostrConnection.sign(e);
      return signed;
    }, true, paymentRequest)

    try {
      let response = await fetch(this.getApiUrl('/payment-request'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${authToken}`
        },
        body: JSON.stringify(paymentRequest)
      });

      if (!response.ok) {
        throw new SDKError(
          `Failed to publish payment request: ${response.statusText}`,
          'PUBLISH_PAYMENT_REQUEST_FAILED',
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof SDKError) throw error;
      throw new SDKError(
        `Network error while publishing payment request: ${error instanceof Error ? error.message : String(error)}`,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Create earn intent to get minted BITL tokens for a payment request
   * @param requestId Payment request ID
   * @param address Spark address to receive BITL token
   */
  async publishEarnRequest(requestId: string, address: string) {
    try {
      let response = await fetch(this.getApiUrl(`/payment-request/${requestId}/earn/${address}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        throw new SDKError(
          `Failed to publish earn request: ${response.statusText}`,
          'PUBLISH_EARN_REQUEST_FAILED',
          response.status
        );
      }
    }
    catch (error) {
      if (error instanceof SDKError) throw error;
      throw new SDKError(
        `Network error while publishing earn request: ${error instanceof Error ? error.message : String(error)}`,
        'NETWORK_ERROR'
      );
    }
  }
}