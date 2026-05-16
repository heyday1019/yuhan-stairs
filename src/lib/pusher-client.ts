'use client';
import Pusher, { Channel } from 'pusher-js';
import { getOrCreateDeviceId } from './device-id';

let _pusher: Pusher | null = null;

function clean(v: string | undefined, name: string): string {
  if (!v) throw new Error(`${name} is not set`);
  return v.replace(/^﻿/, '').trim();
}

export function getPusherClient(): Pusher {
  if (_pusher) return _pusher;
  _pusher = new Pusher(clean(process.env.NEXT_PUBLIC_PUSHER_KEY, 'NEXT_PUBLIC_PUSHER_KEY'), {
    cluster: clean(process.env.NEXT_PUBLIC_PUSHER_CLUSTER, 'NEXT_PUBLIC_PUSHER_CLUSTER'),
    authEndpoint: '/api/pusher/auth',
    auth: { headers: { 'x-device-id': getOrCreateDeviceId() } },
  });
  return _pusher;
}

export function subscribePresenceMatch(matchId: string): Channel {
  return getPusherClient().subscribe(`presence-match-${matchId}`);
}
export function subscribePrivateUser(userId: string): Channel {
  return getPusherClient().subscribe(`private-user-${userId}`);
}
