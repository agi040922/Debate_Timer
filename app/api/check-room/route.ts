import { NextResponse, NextRequest } from "next/server";

// 간단한 메모리 저장소 (실제 운영에서는 데이터베이스 사용)
const activeRooms = new Set<string>();
const roomStates = new Map<string, any>(); // 방별 토론 상태 저장

export async function GET(request: NextRequest) {
  console.log('🔍 방 존재 여부 확인 API 호출됨');
  
  const roomId = request.nextUrl.searchParams.get("room");
  
  console.log('📋 요청 정보:');
  console.log('  - Room ID:', roomId);
  
  if (!roomId) {
    console.error('❌ Room parameter가 없습니다');
    return NextResponse.json({ message: "Room parameter is required" }, { status: 400 });
  }
  
  // 로컬 방은 항상 존재하지 않는 것으로 처리
  if (roomId.startsWith('local-')) {
    console.log('🏠 로컬 방은 확인하지 않음');
    return NextResponse.json({ exists: false });
  }
  
  const exists = activeRooms.has(roomId);
  const roomState = roomStates.get(roomId);
  console.log('🔍 방 존재 여부:', exists ? '✅ 존재함' : '❌ 존재하지 않음');
  console.log('📊 방 상태 존재 여부:', roomState ? '✅ 상태 존재함' : '❌ 상태 없음');
  
  return NextResponse.json({ 
    exists, 
    state: roomState || null 
  });
}

export async function POST(request: NextRequest) {
  console.log('📝 방 생성 API 호출됨');
  
  const { roomId, debateState } = await request.json();
  
  console.log('📋 요청 정보:');
  console.log('  - Room ID:', roomId);
  console.log('  - 토론 상태 포함 여부:', debateState ? '✅ 포함됨' : '❌ 없음');
  
  if (!roomId) {
    console.error('❌ Room ID가 없습니다');
    return NextResponse.json({ message: "Room ID is required" }, { status: 400 });
  }
  
  // 로컬 방은 등록하지 않음
  if (roomId.startsWith('local-')) {
    console.log('🏠 로컬 방은 등록하지 않음');
    return NextResponse.json({ success: true });
  }
  
  if (activeRooms.has(roomId)) {
    console.log('⚠️ 이미 존재하는 방');
    return NextResponse.json({ message: "Room already exists" }, { status: 409 });
  }
  
  activeRooms.add(roomId);
  
  // 토론 상태가 제공된 경우 저장
  if (debateState) {
    roomStates.set(roomId, debateState);
    console.log('💾 토론 상태 저장 완료');
  }
  
  console.log('✅ 방 생성 완료:', roomId);
  console.log('📊 현재 활성 방 목록:', Array.from(activeRooms));
  console.log('📊 현재 저장된 상태 방 목록:', Array.from(roomStates.keys()));
  
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  console.log('🗑️ 방 삭제 API 호출됨');
  
  const roomId = request.nextUrl.searchParams.get("room");
  
  if (roomId && !roomId.startsWith('local-')) {
    activeRooms.delete(roomId);
    roomStates.delete(roomId); // 토론 상태도 함께 삭제
    console.log('✅ 방 삭제 완료:', roomId);
    console.log('📊 현재 활성 방 목록:', Array.from(activeRooms));
    console.log('📊 현재 저장된 상태 방 목록:', Array.from(roomStates.keys()));
  }
  
  return NextResponse.json({ success: true });
}

export async function PUT(request: NextRequest) {
  console.log('🔄 토론 상태 업데이트 API 호출됨');
  
  const { roomId, debateState } = await request.json();
  
  console.log('📋 요청 정보:');
  console.log('  - Room ID:', roomId);
  console.log('  - 토론 상태 포함 여부:', debateState ? '✅ 포함됨' : '❌ 없음');
  
  if (!roomId) {
    console.error('❌ Room ID가 없습니다');
    return NextResponse.json({ message: "Room ID is required" }, { status: 400 });
  }
  
  if (!debateState) {
    console.error('❌ 토론 상태가 없습니다');
    return NextResponse.json({ message: "Debate state is required" }, { status: 400 });
  }
  
  // 로컬 방은 업데이트하지 않음
  if (roomId.startsWith('local-')) {
    console.log('🏠 로컬 방은 업데이트하지 않음');
    return NextResponse.json({ success: true });
  }
  
  if (!activeRooms.has(roomId)) {
    console.log('❌ 존재하지 않는 방');
    return NextResponse.json({ message: "Room does not exist" }, { status: 404 });
  }
  
  roomStates.set(roomId, debateState);
  console.log('💾 토론 상태 업데이트 완료');
  console.log('📊 현재 저장된 상태 방 목록:', Array.from(roomStates.keys()));
  
  return NextResponse.json({ success: true });
}
