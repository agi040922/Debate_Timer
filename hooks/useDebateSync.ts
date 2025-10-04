"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Debater, DebateStep } from '@/lib/types/debate';

// The structure of the debate state to be synchronized
export interface DebateState {
  steps: DebateStep[];
  currentStepIndex: number;
  remainingTime: number;
  isRunning: boolean;
  debaters: Debater[];
  currentSpeaker: Debater | null;
  speakerTimeRemaining: number;
  teamRemainingTime: {
    [key: string]: number;
  };
  activeSpeakingTeam: "찬성" | "반대" | "긍정" | "부정" | null;
}

// The hook's return type
interface UseDebateSyncReturn {
  debateState: DebateState | null;
  isConnecting: boolean;
  updateDebateState: (updater: (prevState: DebateState) => Partial<DebateState>) => void;
  initializeDebateState: (initialState: DebateState) => void;
}

export function useDebateSync(roomId: string): UseDebateSyncReturn {
  const [debateState, setDebateState] = useState<DebateState | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const ws = useRef<WebSocket | null>(null);

  const broadcastState = useCallback((state: DebateState) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'sendToGroup',
        group: `debate.${roomId}`,
        dataType: 'json',
        data: state,
      }));
    }
  }, [roomId]);

  const initializeDebateState = useCallback((initialState: DebateState) => {
    setDebateState(initialState);
    if (roomId && !roomId.startsWith('local-')) {
      broadcastState(initialState);
    }
  }, [roomId, broadcastState]);

  const updateDebateState = useCallback((updater: (prevState: DebateState) => Partial<DebateState>) => {
    setDebateState(prevState => {
      if (!prevState) return null;
      const partialNewState = updater(prevState);
      const updatedState = { ...prevState, ...partialNewState };

      if (roomId && !roomId.startsWith('local-')) {
        if (JSON.stringify(prevState) !== JSON.stringify(updatedState)) {
          broadcastState(updatedState);
        }
      }
      return updatedState;
    });
  }, [roomId, broadcastState]);

  useEffect(() => {
    if (!roomId || roomId.startsWith('local-')) {
      setIsConnecting(false);
      return;
    }

    const connect = async () => {
      setIsConnecting(true);
      try {
        const response = await fetch(`/api/negotiate?room=${roomId}`);
        if (!response.ok) throw new Error(`Negotiation failed: ${response.statusText}`);
        const data = await response.json();

        const socket = new WebSocket(data.url);
        ws.current = socket;

        socket.onopen = () => {
          console.log('WebSocket connection established');
          setIsConnecting(false);
          socket.send(JSON.stringify({
            type: 'joinGroup',
            group: `debate.${roomId}`,
          }));
        };

        socket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.type === 'message' && message.group === `debate.${roomId}`) {
            const receivedState = message.data as DebateState;
            setDebateState(receivedState);
          }
        };

        socket.onclose = () => {
          console.log('WebSocket connection closed');
          ws.current = null;
          setIsConnecting(false);
        };

        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          ws.current = null;
          setIsConnecting(false);
        };

      } catch (error) {
        console.error("Failed to connect to Web PubSub:", error);
        setIsConnecting(false);
      }
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [roomId]);

  return { debateState, isConnecting, updateDebateState, initializeDebateState };
}