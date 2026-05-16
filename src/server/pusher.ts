import Pusher from 'pusher';
import crypto from 'node:crypto';

export interface PusherServer {
  trigger(channel: string, event: string, data: unknown): Promise<void>;
  authorizeChannel(socketId: string, channel: string, presenceData?: { user_id: string; user_info?: Record<string, unknown> }): { auth: string; channel_data?: string };
  verifyWebhook(headers: { key: string; signature: string }, rawBody: string): boolean;
}

let _client: PusherServer | null = null;

function cleanEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v.replace(/^﻿/, '').trim();
}

export function getPusher(): PusherServer {
  if (_client) return _client;
  const p = new Pusher({
    appId: cleanEnv('PUSHER_APP_ID'),
    key: cleanEnv('PUSHER_KEY'),
    secret: cleanEnv('PUSHER_SECRET'),
    cluster: cleanEnv('PUSHER_CLUSTER'),
    useTLS: true,
  });
  _client = {
    async trigger(channel, event, data) { await p.trigger(channel, event, data); },
    authorizeChannel(socketId, channel, presenceData) {
      if (presenceData) return p.authorizeChannel(socketId, channel, presenceData);
      return p.authorizeChannel(socketId, channel);
    },
    verifyWebhook({ key, signature }, rawBody) {
      if (key !== cleanEnv('PUSHER_KEY')) return false;
      const expected = crypto.createHmac('sha256', cleanEnv('PUSHER_SECRET')).update(rawBody).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    },
  };
  return _client;
}

export function setPusherForTest(c: PusherServer | null) { _client = c; }
