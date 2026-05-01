/**
 * useRealVoiceSession
 * -------------------
 * Connects the React frontend to the LiveKit room,
 * publishes the founder's microphone, and receives:
 *   - Transcription events (via data channel)
 *   - Context JSON when the agent completes the intake
 *
 * Usage:
 *   const { status, transcript, context, start, stop } = useRealVoiceSession();
 */

import { useState, useRef, useCallback } from 'react';
import { Room, RoomEvent, DataPacket_Kind, Track } from 'livekit-client';

const TOKEN_SERVER = import.meta.env.VITE_TOKEN_SERVER_URL || 'http://localhost:8000';

export function useRealVoiceSession() {
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState([]);
  const [fields, setFields]   = useState({ founder: '', company: '', issue: '', urgency: '' });
  const [context, setContext]  = useState(null);
  const [error, setError]      = useState(null);

  const roomRef = useRef(null);

  // ------------------------------------------------------------------
  // Start — fetch token, join room, publish mic
  // ------------------------------------------------------------------
  const start = useCallback(async (category, language) => {
    setStatus('connecting');
    setError(null);
    setTranscript([]);
    setFields({ founder: '', company: '', issue: '', urgency: '' });
    setContext(null);

    try {
      // 1. Request a room token from our server
      const res = await fetch(`${TOKEN_SERVER}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, language }),
      });

      if (!res.ok) throw new Error(`Token server error: ${res.status}`);
      const { token, ws_url, session_id } = await res.json();

      // 2. Create and connect to LiveKit room
      const room = new Room({
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      // 3. Wire up events
      room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
        if (topic !== 'launchpad.context' && topic !== 'launchpad.transcript') return;

        try {
          const msg = JSON.parse(new TextDecoder().decode(payload));

          if (msg.type === 'context_ready') {
            setContext(msg.context);
            setStatus('complete');
            _updateFieldsFromContext(msg.context);
          }

          if (msg.type === 'transcript_chunk') {
            const { role, text } = msg;
            setTranscript(prev => [...prev, { role, text, id: Date.now() + Math.random() }]);

            // Heuristic field extraction from live transcript
            if (role === 'agent') {
              setStatus('speaking');
            } else {
              setStatus('listening');
              _extractFieldsFromText(text);
            }
          }
        } catch {
          // ignore malformed data messages
        }
      });

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.style.display = 'none';
          document.body.appendChild(el);
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setStatus(prev => prev === 'complete' ? 'complete' : 'idle');
      });

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === 'connected') setStatus('listening');
        if (state === 'reconnecting') setStatus('connecting');
      });

      await room.connect(ws_url, token);

      // 4. Publish microphone
      await room.localParticipant.setMicrophoneEnabled(true);
      setStatus('listening');

    } catch (err) {
      console.error('Voice session error:', err);
      setError(err.message);
      setStatus('idle');
    }
  }, []);

  // ------------------------------------------------------------------
  // Stop — disconnect cleanly
  // ------------------------------------------------------------------
  const stop = useCallback(async () => {
    const room = roomRef.current;
    if (room) {
      await room.localParticipant.setMicrophoneEnabled(false);
      await room.disconnect();
      roomRef.current = null;
    }
    setStatus('idle');
  }, []);

  // ------------------------------------------------------------------
  // Reset — full state clear
  // ------------------------------------------------------------------
  const reset = useCallback(async () => {
    await stop();
    setTranscript([]);
    setFields({ founder: '', company: '', issue: '', urgency: '' });
    setContext(null);
    setError(null);
    setStatus('idle');
  }, [stop]);

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  function _updateFieldsFromContext(ctx) {
    const f = ctx.founder || {};
    const i = ctx.issue || {};
    setFields({
      founder: f.name || '',
      company: f.company || '',
      issue: [i.type, i.description].filter(Boolean).join(' · ').slice(0, 40),
      urgency: ctx.urgency_score >= 8 ? 'Critical' : ctx.urgency_score >= 5 ? 'High' : 'Medium',
    });
  }

  function _extractFieldsFromText(text) {
    // Light heuristic extraction from user speech — real extraction comes from context JSON
    const lower = text.toLowerCase();
    if (!fields.founder && /my name is (.+?)[\.,]/i.test(text)) {
      const m = text.match(/my name is (.+?)[\.,]/i);
      if (m) setFields(prev => ({ ...prev, founder: m[1].trim() }));
    }
    if (!fields.company && /(building|founder of|co-founder of|run) (.+?)[\.,]/i.test(text)) {
      const m = text.match(/(building|founder of|co-founder of|run) (.+?)[\.,]/i);
      if (m) setFields(prev => ({ ...prev, company: m[2].trim() }));
    }
    if (!fields.urgency && (lower.includes('critical') || lower.includes('urgent') || lower.includes('9 days') || lower.includes('6 weeks'))) {
      setFields(prev => ({ ...prev, urgency: 'Urgent' }));
    }
  }

  return { status, transcript, fields, context, error, start, stop, reset };
}
