// nostr/relay.ts
import WebSocket from 'ws';
import { useWebSocketImplementation } from 'nostr-tools/pool';
useWebSocketImplementation(WebSocket);

import { NostrRelay } from '@nostr-relay/core';
import { createOutgoingNoticeMessage } from '@nostr-relay/common';
import { EventRepositorySqlite } from '@nostr-relay/event-repository-sqlite';
import { Validator } from '@nostr-relay/validator';
import { WebSocketServer } from 'ws';
import { PolicyPlugin } from './policy';
import { db } from '../db'

export async function initNostrRelay(server: any): Promise<void> {
  
  const eventRepository = new EventRepositorySqlite(db);
  await eventRepository.init();

  const relay = new NostrRelay(eventRepository);
  const validator = new Validator();

  // PolicyPlugin only — no sync, no push
  relay.register(new PolicyPlugin());

  const wss = new WebSocketServer({ server, path: '/nostr' });

  wss.on('connection', ws => {
    relay.handleConnection(ws);

    ws.on('message', async data => {
      try {
        const message = await validator.validateIncomingMessage(data);
        await relay.handleMessage(ws, message);
      } catch (err) {
        if (err instanceof Error) {
          ws.send(JSON.stringify(createOutgoingNoticeMessage(err.message)));
        }
      }
    });

    ws.on('close', () => relay.handleDisconnect(ws));
    ws.on('error', err => {
      ws.send(JSON.stringify(createOutgoingNoticeMessage(err.message)));
    });
  });

  console.log('Nostr relay ready at wss://[host]/nostr');
}