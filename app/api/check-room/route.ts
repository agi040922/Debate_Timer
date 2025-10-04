import { NextResponse, NextRequest } from "next/server";

// 간단한 메모리 저장소 (실제 운영에서는 데이터베이스 사용)
const activeRooms = new Set<string>();

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
  console.log('🔍 방 존재 여부:', exists ? '✅ 존재함' : '❌ 존재하지 않음');
  
  return NextResponse.json({ exists });
}

export async function POST(request: NextRequest) {
  console.log('📝 방 생성 API 호출됨');
  
  const { roomId } = await request.json();
  
  console.log('📋 요청 정보:');
  console.log('  - Room ID:', roomId);
  
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
  console.log('✅ 방 생성 완료:', roomId);
  console.log('📊 현재 활성 방 목록:', Array.from(activeRooms));
  
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  console.log('🗑️ 방 삭제 API 호출됨');
  
  const roomId = request.nextUrl.searchParams.get("room");
  
  if (roomId && !roomId.startsWith('local-')) {
    activeRooms.delete(roomId);
    console.log('✅ 방 삭제 완료:', roomId);
    console.log('📊 현재 활성 방 목록:', Array.from(activeRooms));
  }
  
  return NextResponse.json({ success: true });
}
