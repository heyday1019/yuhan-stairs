'use client';
import Pusher, { Channel } from 'pusher-js';
import { getOrCreateDeviceId } from './device-id';

let _pusher: Pusher | null = null;

export function getPusherClient(): Pusher {
  if (_pusher) return _pusher;
  _pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
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
