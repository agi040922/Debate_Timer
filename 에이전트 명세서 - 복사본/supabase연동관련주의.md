✅ 전제: 유저 정보를 기반으로 데이터 불러오기
예를 들어, 어떤 사용자가 로그인하면 그 사람의 todo, profile, post, settings 등 관련 데이터를 Supabase에서 불러온다고 하자.

📌 1. 인증 정보 가져오기 (getUser vs getSession 차이)
ts
복사
편집
const {
  data: { user },
} = await supabase.auth.getUser()
getUser()는 JWT에서 파싱된 사용자 정보를 반환함.

getSession()은 access_token과 refresh_token까지 포함된 세션 전체 정보를 줌.

✅ 대부분의 경우 getUser()만으로도 user.id 확인에는 충분함. 하지만, 만료된 세션 여부 체크나 로그인 상태 판단에는 getSession()도 필요함.

📌 2. user.id를 이용한 데이터 조회 시 주의할 점
ts
복사
편집
// 안전한 방식 (서버 컴포넌트에서 실행)
const { data: todos } = await supabase
  .from('todos')
  .select('*')
  .eq('user_id', user.id)
⚠️ 실수하기 쉬운 포인트
실수	설명
🔴 user가 null인데 .id에 접근	앱 크래시 유발
🔴 user.id를 클라이언트에서 쿼리 문자열로 노출	URL 공유 시 보안 위험
🔴 user 정보 없이 쿼리 실행	다른 사람의 데이터가 노출될 수 있음
🔴 정책(RLS) 없이 모든 데이터 SELECT 가능	인증 우회 가능
📌 3. Row Level Security (RLS) 설정 필수!
Supabase에서 유저별 데이터 조회를 한다면, DB 보안의 핵심은 RLS 설정이야.
프론트엔드에서 아무리 조건을 줘도, RLS 없으면 우회 가능함.

✅ 예시: todos 테이블 RLS 정책
sql
복사
편집
-- user_id 컬럼이 현재 로그인된 사용자와 일치하는 행만 읽기 허용
CREATE POLICY "User can read own todos"
ON "todos"
FOR SELECT
USING (auth.uid() = user_id);
💡 auth.uid()는 현재 로그인된 사용자의 Supabase user.id를 의미함

📌 4. 서버 vs 클라이언트: 인증된 요청 위치 결정하기
구분	추천 위치	이유
user.id로 데이터 SELECT	서버 컴포넌트	쿠키 기반 인증 안정성, 노출 위험 없음
client 컴포넌트에서 호출	인증 토큰 직접 붙여야 하며, 위험도 ↑	
로그인 체크	middleware.ts, 서버 컴포넌트	HttpOnly 쿠키 기반으로 정확한 체크 가능
✅ Supabase 클라이언트를 서버에서 생성하는 것이 보안적으로 가장 안전함.

📌 5. 실전 예제: 로그인된 유저의 프로필 정보 조회
tsx
복사
편집
// app/profile/page.tsx (server component)
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export default async function ProfilePage() {
  const supabase = createServerComponentClient({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div>로그인이 필요합니다.</div>
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, bio')
    .eq('id', user.id)
    .single()

  return (
    <div>
      <h1>{profile?.username}</h1>
      <p>{profile?.bio}</p>
    </div>
  )
}
✅ 서버 컴포넌트에서 쿠키 기반 인증 + user.id 기반 쿼리 + RLS 정책이 있다면 완벽한 구조

📌 6. 보안 & 유지보수 팁
체크리스트	설명
✅ user가 null인지 항상 검사	SSR 환경에서는 인증 쿠키가 없을 수 있음
✅ Supabase 쿼리에 user.id 조건을 반드시 넣기	타 유저 데이터 노출 방지
✅ RLS 적용	데이터 수준의 보안
✅ .single() 또는 .maybeSingle() 사용	데이터 1개만 정확히 받기
✅ supabase-js 버전 확인	버전에 따라 auth.getUser() 등이 변경될 수 있음
✅ 데이터 없는 경우 에러 처리	"정보 없음", "권한 없음" 등 메시지 처리
📌 7. 실전에서 흔한 실수 요약
실수	결과
user 없이 바로 쿼리	전체 공개된 데이터처럼 동작
RLS 미적용	누구나 API 호출로 남 데이터 조회 가능
클라이언트에서 user.id를 localStorage에 저장	탈취 위험
user.email로만 식별	탈취된 이메일로 데이터 노출될 수 있음
로그인 체크 없이 데이터 fetch	앱 크래시 or 데이터 누수
🧠 정리: 유저 데이터 조회 시 반드시 기억할 것
user 인증 확인 먼저 하고 쿼리 실행

쿼리문에 반드시 user.id 조건 추가

Supabase RLS를 꼭 설정

클라이언트가 아닌 서버에서 인증 & 쿼리 실행

쿼리 결과가 없거나 오류일 때 graceful하게 처리