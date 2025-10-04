import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  console.log('🚀 negotiate API 호출됨');
  
  const hub = "debate"; // A fixed hub name for the debate application
  const room = request.nextUrl.searchParams.get("room"); // Get room id from query
  const requestRole = request.nextUrl.searchParams.get("role"); // Get requested role
  const userId = `user-${Date.now()}`; // Generate a unique user id

  console.log('📋 요청 정보:');
  console.log('  - Hub:', hub);
  console.log('  - Room:', room);
  console.log('  - User ID:', userId);
  console.log('  - 요청된 역할:', requestRole);
  console.log('  - URL:', request.nextUrl.toString());

  if (!room) {
    console.error('❌ Room parameter가 없습니다');
    return NextResponse.json({ message: "Room parameter is required" }, { status: 400 });
  }

  // Ensure the connection string is available
  const connectionString = process.env.AZURE_WEBPUBSUB_CONNECTION_STRING;
  console.log('🔑 연결 문자열 확인:', connectionString ? '✅ 존재함' : '❌ 없음');
  
  if (!connectionString) {
    console.error('❌ Azure Web PubSub 연결 문자열이 설정되지 않았습니다');
    console.error('💡 .env.local 파일에 AZURE_WEBPUBSUB_CONNECTION_STRING을 설정해주세요');
    return NextResponse.json({ 
      message: "Azure Web PubSub connection string is not configured",
      hint: "Please set AZURE_WEBPUBSUB_CONNECTION_STRING in your .env.local file"
    }, { status: 500 });
  }

  try {
    console.log('🔧 WebPubSubServiceClient 생성 중...');
    // Create a new service client
    const serviceClient = new WebPubSubServiceClient(connectionString, hub);
    console.log('✅ ServiceClient 생성 완료');

    console.log('🎫 액세스 토큰 요청 중...');
    
    // 역할에 따른 권한 설정
    let roles = ["webpubsub.joinLeaveGroup"]; // 기본 권한: 그룹 조인/탈퇴
    
    if (requestRole === "moderator") {
      // 진행자 권한: 메시지 전송 가능 (토론 상태 제어)
      roles.push("webpubsub.sendToGroup");
      console.log('👑 진행자 권한 부여');
    } else {
      // 관찰자 권한: 메시지 전송 불가 (읽기 전용)
      console.log('👁️ 관찰자 권한 부여');
    }
    
    // Get an access token for the client
    const tokenOptions = {
      userId: userId,
      groups: [`${hub}.${room}`], // Clients in the same room join the same group
      roles: roles,
    };
    console.log('📝 토큰 옵션:', tokenOptions);
    
    const token = await serviceClient.getClientAccessToken(tokenOptions);
    console.log('✅ 액세스 토큰 생성 완료');
    console.log('🔗 WebSocket URL:', token.url);

    // Return the client URL to the frontend
    const response = {
      url: token.url,
      userId: userId,
      hub: hub,
      room: room,
      role: requestRole || "observer",
      groups: [`${hub}.${room}`],
      permissions: roles
    };
    
    console.log('📤 응답 데이터:', response);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('💥 negotiate API 오류:', error);
    console.error('🔍 오류 상세:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    return NextResponse.json({ 
      message: "Failed to generate WebSocket token",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}