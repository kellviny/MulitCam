import { useState, useEffect, useRef } from 'react';
import { Room, RoomEvent, RemoteParticipant } from 'livekit-client';

const host = window.location.hostname;
const tokenApiUrl = `/api/token`;
const livekitUrl = `ws://${host}:7880`;

export function useLiveKit(roomName: string, participantName?: string) {
  // CORREÇÃO: nome estável — gerado uma única vez com useRef, não recalculado a cada render
  const nameRef = useRef(participantName ?? `monitor-${Math.floor(Math.random() * 99999)}`);

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let activeRoom: Room | null = null;
    let syncInterval: number | null = null;

    const connect = async () => {
      try {
        setConnectionState('connecting');
        setError(null);

        const res = await fetch(`${tokenApiUrl}?room=${roomName}&name=${nameRef.current}&role=monitor`);
        if (!res.ok) throw new Error(`Token API retornou ${res.status}`);

        const data = await res.json();
        if (!data.token || typeof data.token !== 'string') {
          throw new Error('Token inválido retornado pela API');
        }

        if (!mounted) return;

        const newRoom = new Room({
          // Evita reconexões agressivas que geram múltiplos PeerConnections
          reconnectPolicy: { nextRetryDelayInMs: (ctx) => Math.min(ctx.retryCount * 2000, 10000) },
        });

        const updateParticipants = () => {
          if (mounted) {
            const cameras = Array.from(newRoom.remoteParticipants.values())
              .filter(p => !p.identity.startsWith('obs-') && !p.identity.startsWith('monitor-'));
            setParticipants(cameras);
          }
        };

        newRoom.on(RoomEvent.Connected, () => {
          if (mounted) setConnectionState('connected');
          updateParticipants();
          
          if (syncInterval) clearInterval(syncInterval);
          syncInterval = window.setInterval(() => {
            if (newRoom.state === 'connected') {
              const msg = JSON.stringify({ type: 'sync', t: Date.now() });
              const encoder = new TextEncoder();
              // @ts-ignore - publishData params depending on precise livekit v2.x version
              newRoom.localParticipant.publishData(encoder.encode(msg), { reliable: false });
            }
          }, 1000);
        });

        newRoom.on(RoomEvent.Disconnected, () => {
          if (mounted) setConnectionState('disconnected');
          setParticipants([]);
          if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
          }
        });

        newRoom.on(RoomEvent.ParticipantConnected, updateParticipants);
        newRoom.on(RoomEvent.ParticipantDisconnected, updateParticipants);
        newRoom.on(RoomEvent.TrackSubscribed, updateParticipants);
        newRoom.on(RoomEvent.TrackUnsubscribed, updateParticipants);

        await newRoom.connect(livekitUrl, data.token);

        if (!mounted) {
          newRoom.disconnect();
          return;
        }

        activeRoom = newRoom;
        setRoom(newRoom);
        updateParticipants();
      } catch (err: unknown) {
        if (mounted) {
          setConnectionState('disconnected');
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      if (syncInterval) clearInterval(syncInterval);
      if (activeRoom) {
        activeRoom.disconnect();
      }
    };
  }, [roomName]); // nameRef é estável — não precisa ser dependência

  return { room, participants, connectionState, error };
}
