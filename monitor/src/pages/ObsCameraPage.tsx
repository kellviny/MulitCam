import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveKit } from '../hooks/useLiveKit';
import { Track } from 'livekit-client';

export default function ObsCameraPage() {
  const { id } = useParams<{ id: string }>();
  const { participants } = useLiveKit('live', `obs-${Math.floor(Math.random() * 1000)}`);
  const videoRef = useRef<HTMLVideoElement>(null);

  const participant = participants.find(p => p.identity === id);

  useEffect(() => {
    if (!participant || !videoRef.current) return;

    const attachVideo = () => {
      const videoTrack = participant.getTrackPublication(Track.Source.Camera)?.videoTrack;
      if (videoTrack && videoRef.current) {
        videoTrack.attach(videoRef.current);
      }
    };

    attachVideo();
    participant.on('trackSubscribed', attachVideo);

    return () => {
      participant.off('trackSubscribed', attachVideo);
      const videoTrack = participant.getTrackPublication(Track.Source.Camera)?.videoTrack;
      if (videoTrack && videoRef.current) {
        videoTrack.detach(videoRef.current);
      }
    };
  }, [participant]);

  if (!participant) {
    return (
      <div style={{ backgroundColor: 'black', width: '100vw', height: '100vh', color: 'red', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        AGUARDANDO SINAL DA CÂMERA: {id}
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'black', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
}
