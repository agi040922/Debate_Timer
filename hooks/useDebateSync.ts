"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { WebPubSubClient } from '@azure/web-pubsub-client';
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
  isModerator: boolean;
  userRole: string;
  updateDebateState: (updater: (prevState: DebateState) => Partial<DebateState>) => void;
  initializeDebateState: (initialState: DebateState) => void;
}

export function useDebateSync(roomId: string): UseDebateSyncReturn {
  const [debateState, setDebateState] = useState<DebateState | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isModerator, setIsModerator] = useState(false);
  const [userRole, setUserRole] = useState('observer');
  const clientRef = useRef<WebPubSubClient | null>(null);
  
  // 진행자 여부 판단
  const checkModeratorStatus = () => {
    // 로컬 방(local-로 시작)은 항상 진행자
    if (roomId.startsWith('local-')) {
      return true;
    }
    
    const debateConfig = localStorage.getItem("debateConfig");
    if (!debateConfig) return false;
    
    try {
      const config = JSON.parse(debateConfig);
      // 현재 방 ID와 localStorage의 방 ID가 일치하면 진행자
      return config.roomId === roomId;
    } catch {
      return false;
    }
  };

  const broadcastState = useCallback(async (state: DebateState) => {
    if (clientRef.current) {
      try {
        const groupName = `debate.${roomId}`;
        await clientRef.current.sendToGroup(groupName, JSON.stringify(state), 'text');
        console.log('🔄 토론 상태 브로드캐스트 완료:', groupName);
      } catch (error) {
        console.error('❌ 토론 상태 브로드캐스트 실패:', error);
      }
    }
  }, [roomId]);

  const initializeDebateState = useCallback((initialState: DebateState) => {
    setDebateState(initialState);
    if (roomId && !roomId.startsWith('local-')) {
      broadcastState(initialState);
    }
  }, [roomId, broadcastState]);

  const updateDebateState = useCallback((updater: (prevState: DebateState) => Partial<DebateState>) => {
    // 진행자만 상태를 변경할 수 있음
    if (!isModerator) {
      console.warn('⚠️ 관찰자는 토론 상태를 변경할 수 없습니다.');
      return;
    }
    
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
  }, [roomId, broadcastState, isModerator]);

  useEffect(() => {
    if (!roomId) {
      setIsConnecting(false);
      return;
    }
    
    // 로컬 방인 경우 진행자로 설정하고 연결 종료
    if (roomId.startsWith('local-')) {
      const isModeratorUser = checkModeratorStatus();
      setIsModerator(isModeratorUser);
      setUserRole(isModeratorUser ? 'moderator' : 'observer');
      setIsConnecting(false);
      console.log('🏠 로컬 방 - 진행자 여부:', isModeratorUser);
      return;
    }

    const connect = async () => {
      setIsConnecting(true);
      try {
        console.log('🔄 토론 동기화 연결 시작...', roomId);
        
        // localStorage에 debateConfig가 있으면 진행자, 없으면 참가자
        const isModeratorUser = checkModeratorStatus();
        const requestedRole = isModeratorUser ? "moderator" : "observer";
        console.log('🎭 요청할 역할:', requestedRole, '(localStorage 기반)');
        
        // negotiate API에서 WebSocket URL 가져오기
        const response = await fetch(`/api/negotiate?room=${roomId}&role=${requestedRole}`);
        if (!response.ok) throw new Error(`Negotiation failed: ${response.statusText}`);
        const data = await response.json();
        
        // 역할 정보 저장
        setUserRole(data.role || 'observer');
        setIsModerator(data.role === 'moderator');
        console.log('👤 할당된 역할:', data.role, '진행자 여부:', data.role === 'moderator');

        console.log('🔗 토론 동기화 URL 받음:', data.url);

        // Azure Web PubSub Client 생성
        const client = new WebPubSubClient(data.url);
        clientRef.current = client;

        // 연결 성공 이벤트
        client.on('connected', (e) => {
          console.log('✅ 토론 동기화 연결 성공!', e.connectionId);
          setIsConnecting(false);
        });

        // 연결 해제 이벤트
        client.on('disconnected', (e) => {
          console.log('🔌 토론 동기화 연결 종료:', e.message);
          clientRef.current = null;
          setIsConnecting(false);
        });

        // 그룹 메시지 수신 이벤트 (토론 상태 동기화)
        client.on('group-message', (e) => {
          console.log('📨 토론 상태 수신:', e);
          try {
            const messageData = typeof e.message.data === 'string' 
              ? JSON.parse(e.message.data) 
              : e.message.data;
            
            console.log('🔄 토론 상태 업데이트:', messageData);
            setDebateState(messageData as DebateState);
          } catch (error) {
            console.error('❌ 토론 상태 파싱 오류:', error);
          }
        });

        // 연결 시작
        await client.start();
        
        // 그룹 조인
        const groupName = `debate.${roomId}`;
        console.log('🏠 토론 그룹 조인:', groupName);
        await client.joinGroup(groupName);
        
        // 연결 완료 후 참가자는 localStorage의 debateConfig 삭제 (진행자만 유지)
        if (!isModeratorUser) {
          console.log('👁️ 참가자는 debateConfig 삭제');
          // 참가자는 debateConfig를 삭제하여 다음 접속 시에도 참가자로 인식되도록 함
          // localStorage.removeItem("debateConfig"); // 주석 처리: 페이지 새로고침 시 문제 방지
        }

      } catch (error) {
        console.error('💥 토론 동기화 연결 오류:', error);
        setIsConnecting(false);
      }
    };

    connect();

    return () => {
      if (clientRef.current) {
        console.log('🔌 토론 동기화 연결 해제...');
        clientRef.current.stop();
      }
    };
  }, [roomId]);

  return { 
    debateState, 
    isConnecting, 
    isModerator, 
    userRole, 
    updateDebateState, 
    initializeDebateState 
  };
}