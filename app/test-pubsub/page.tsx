'use client';

import { useState, useEffect, useRef } from 'react';
import { WebPubSubClient } from '@azure/web-pubsub-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  content: string;
  timestamp: string;
  userId: string;
}

export default function TestPubSubPage() {
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [roomId, setRoomId] = useState('test-room');
  const [userId, setUserId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  
  const clientRef = useRef<WebPubSubClient | null>(null);

  // Azure Web PubSub 연결 함수
  const connectToWebSocket = async () => {
    try {
      console.log('🔄 Azure Web PubSub 연결 시작...');
      console.log('📍 룸 ID:', roomId);
      console.log('👤 사용자 ID:', userId);
      
      setConnectionStatus('connecting');
      setErrorMessage('');
      
      // negotiate API에서 WebSocket URL 가져오기
      console.log('🌐 negotiate API 호출 중...');
      const negotiateUrl = `/api/negotiate?room=${roomId}`;
      console.log('📡 요청 URL:', negotiateUrl);
      
      const response = await fetch(negotiateUrl);
      console.log('📥 응답 상태:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📦 응답 데이터:', data);
      
      if (!response.ok) {
        console.error('❌ negotiate API 오류:', data);
        throw new Error(data.message || 'Failed to get WebSocket URL');
      }
      
      if (!data.url) {
        console.error('❌ WebSocket URL이 없습니다:', data);
        throw new Error('WebSocket URL을 받지 못했습니다.');
      }
      
      console.log('🔗 WebSocket URL 받음:', data.url);
      
      // Azure Web PubSub Client 생성
      console.log('🚀 Azure Web PubSub Client 생성 중...');
      const client = new WebPubSubClient(data.url);
      clientRef.current = client;
      
      // 연결 성공 이벤트
      client.on('connected', (e) => {
        console.log('✅ Azure Web PubSub 연결 성공!');
        console.log('🔗 연결 ID:', e.connectionId);
        setConnectionStatus('connected');
      });
      
      // 연결 해제 이벤트
      client.on('disconnected', (e) => {
        console.log('🔌 Azure Web PubSub 연결 종료');
        console.log('📝 종료 이유:', e.message);
        setConnectionStatus('disconnected');
      });
      
      // 그룹 메시지 수신 이벤트
      client.on('group-message', (e) => {
        console.log('📨 그룹 메시지 받음:', e);
        console.log('📋 메시지 데이터:', e.message.data);
        
        try {
          const messageData = typeof e.message.data === 'string' 
            ? JSON.parse(e.message.data) 
            : e.message.data;
          
          console.log('💬 파싱된 메시지:', messageData);
          
          const newMessage: Message = {
            id: Date.now().toString(),
            content: messageData.content || e.message.data,
            timestamp: new Date().toLocaleTimeString(),
            userId: messageData.userId || 'unknown'
          };
          
          setMessages(prev => {
            console.log('📝 메시지 목록 업데이트:', [...prev, newMessage]);
            return [...prev, newMessage];
          });
        } catch (error) {
          console.error('❌ 메시지 파싱 오류:', error);
          console.error('📄 원시 데이터:', e.message.data);
        }
      });
      
      // 서버 메시지 수신 이벤트
      client.on('server-message', (e) => {
        console.log('🔧 서버 메시지:', e);
      });
      
      // 연결 시작
      console.log('🚀 연결 시작...');
      await client.start();
      
      // 그룹 조인
      const groupName = `debate.${roomId}`;
      console.log('🏠 그룹 조인 시도:', groupName);
      await client.joinGroup(groupName);
      console.log('✅ 그룹 조인 완료:', groupName);
      
    } catch (error) {
      console.error('💥 연결 오류:', error);
      console.error('🔍 오류 스택:', error instanceof Error ? error.stack : 'No stack trace');
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    }
  };

  // Azure Web PubSub 연결 해제
  const disconnect = async () => {
    console.log('🔌 연결 해제 시도...');
    if (clientRef.current) {
      try {
        await clientRef.current.stop();
        console.log('✅ 연결 해제 완료');
      } catch (error) {
        console.error('❌ 연결 해제 오류:', error);
      }
      clientRef.current = null;
    }
    setConnectionStatus('disconnected');
  };

  // 메시지 전송
  const sendMessage = async () => {
    console.log('📤 메시지 전송 시도...');
    console.log('📝 입력된 메시지:', messageInput);
    console.log('📊 연결 상태:', connectionStatus);
    
    if (!messageInput.trim()) {
      console.warn('⚠️ 빈 메시지는 전송할 수 없습니다.');
      return;
    }
    
    if (!clientRef.current) {
      console.error('❌ Azure Web PubSub 클라이언트가 없습니다.');
      return;
    }
    
    if (connectionStatus !== 'connected') {
      console.error('❌ Azure Web PubSub가 연결되지 않았습니다. 현재 상태:', connectionStatus);
      return;
    }
    
    const messageData = {
      content: messageInput,
      userId: userId || `anonymous-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    
    const groupName = `debate.${roomId}`;
    console.log('📨 전송할 메시지:', messageData);
    console.log('🎯 대상 그룹:', groupName);
    
    try {
      await clientRef.current.sendToGroup(groupName, JSON.stringify(messageData), 'text');
      console.log('✅ 메시지 전송 성공');
      setMessageInput('');
    } catch (error) {
      console.error('❌ 메시지 전송 실패:', error);
      setErrorMessage('메시지 전송에 실패했습니다.');
    }
  };

  // 컴포넌트 언마운트 시 연결 해제
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.stop();
      }
    };
  }, []);

  // 컴포넌트 마운트 및 사용자 ID 자동 생성
  useEffect(() => {
    console.log('🎬 컴포넌트 마운트 시작');
    const generatedUserId = `user-${Math.random().toString(36).substr(2, 9)}`;
    console.log('👤 사용자 ID 생성:', generatedUserId);
    
    setIsMounted(true);
    setUserId(generatedUserId);
    
    console.log('✅ 컴포넌트 초기화 완료');
  }, []);

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge className="bg-green-500">연결됨</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-500">연결 중...</Badge>;
      case 'error':
        return <Badge className="bg-red-500">오류</Badge>;
      default:
        return <Badge variant="secondary">연결 안됨</Badge>;
    }
  };

  // 클라이언트에서만 렌더링
  if (!isMounted) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">로딩 중...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Azure Web PubSub 연결 테스트</CardTitle>
          <CardDescription>
            Azure Web PubSub 서비스와의 WebSocket 연결을 테스트합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 연결 상태 */}
          <div className="flex items-center gap-2">
            <span className="font-medium">연결 상태:</span>
            {getStatusBadge()}
            <span className="text-sm text-gray-600">
              사용자 ID: {userId || '로딩 중...'}
            </span>
          </div>

          {/* 에러 메시지 */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              {errorMessage}
            </div>
          )}

          {/* 룸 ID 입력 */}
          <div className="flex gap-2">
            <Input
              placeholder="룸 ID 입력"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              disabled={connectionStatus === 'connected'}
              className="flex-1"
            />
            {connectionStatus === 'disconnected' || connectionStatus === 'error' ? (
              <Button onClick={connectToWebSocket} disabled={!roomId.trim()}>
                연결
              </Button>
            ) : (
              <Button onClick={disconnect} variant="outline">
                연결 해제
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 메시지 영역 */}
      <Card>
        <CardHeader>
          <CardTitle>메시지</CardTitle>
          <CardDescription>
            실시간 메시지를 주고받을 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 메시지 목록 */}
          <ScrollArea className="h-64 w-full border rounded-md p-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500">메시지가 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {messages.map((message) => (
                  <div key={message.id} className="p-2 bg-gray-50 rounded-md">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-blue-600">
                          {message.userId}
                        </div>
                        <div className="mt-1">{message.content}</div>
                      </div>
                      <div className="text-xs text-gray-500 ml-2">
                        {message.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* 메시지 입력 */}
          <div className="flex gap-2">
            <Input
              placeholder="메시지를 입력하세요..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={connectionStatus !== 'connected'}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={connectionStatus !== 'connected' || !messageInput.trim()}
            >
              전송
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 사용 방법 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>사용 방법</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>룸 ID를 입력하고 "연결" 버튼을 클릭합니다.</li>
            <li>연결이 성공하면 상태가 "연결됨"으로 변경됩니다.</li>
            <li>메시지를 입력하고 "전송" 버튼을 클릭하거나 Enter 키를 누릅니다.</li>
            <li>같은 룸에 연결된 다른 사용자들과 실시간으로 메시지를 주고받을 수 있습니다.</li>
            <li>여러 브라우저 탭에서 같은 룸에 접속하여 테스트해보세요.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
