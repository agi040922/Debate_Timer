🍪 Next.js App Router 환경에서의 쿠키 접근 및 URL 파라미터 처리 (with Supabase)

이 문서는 Next.js 13+ (App Router 기준) 환경에서 Supabase와 함께 쿠키와 URL 파라미터를 안정적으로 사용하는 방법을 정리한 실전 가이드입니다.

✅ 1. 쿠키 접근: App Router 환경 기준

📌 핵심 요약

구분

설명

접근 방법

서버 컴포넌트

HttpOnly 쿠키 접근 가능

cookies() 사용

클라이언트 컴포넌트

HttpOnly 쿠키 접근 불가

❌ 직접 접근 불가능

Middleware

요청 단계에서 쿠키 사용 가능

createMiddlewareClient 사용

API Route

쿠키 조작 및 검증 가능

req.cookies, res.setHeader 등 사용

✅ 서버 컴포넌트에서 Supabase 인증을 위해 쿠키 사용 예시

// app/profile/page.tsx (server component)
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export default async function ProfilePage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  return <div>Welcome, {user?.email}</div>
}

이 방식은 App Router + 서버 컴포넌트 + Supabase 인증 조합에서 가장 안정적인 패턴입니다.

✅ Middleware에서 세션 체크

// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

이 코드는 특정 페이지에 접근할 때 세션 유무를 체크해서 로그인 페이지로 리다이렉트하는 방식입니다.

⚠️ 클라이언트 컴포넌트에서 이렇게 하면 안 됨

'use client'

import { cookies } from 'next/headers' // ❌ 클라이언트에서 사용 불가!

export default function ClientComp() {
  const cookieStore = cookies() // ❌ Error 발생
  return <div>안됨</div>
}

✅ 2. URL Params 처리: App Router 기준

📌 핵심 요약

구버전 방식 (pages/)

App Router 방식 (app/)

useRouter().query.id

params.id로 받음

클라이언트에서도 접근

주로 서버 컴포넌트에서 처리

타입 불안정

타입 명시적 사용 권장 (params: { id: string })

✅ 서버 컴포넌트에서 URL 파라미터 처리

// app/blog/[id]/page.tsx
export default function BlogPost({ params }: { params: { id: string } }) {
  return <div>Post ID: {params.id}</div>
}

✅ 클라이언트 컴포넌트에서 URL 파라미터 가져오기

'use client'

import { useParams } from 'next/navigation'

export default function BlogClient() {
  const params = useParams() // { id: 'abc123' }
  return <div>Post ID: {params.id}</div>
}

useParams()는 App Router에서 useRouter().query를 대체합니다.

⚠️ AI가 자주 실수하는 예

import { useRouter } from 'next/router' // ❌ App Router에서는 비권장

export default function WrongComponent() {
  const router = useRouter()
  const id = router.query.id
  return <div>ID: {id}</div>
}

App Router에서는 next/router 대신 next/navigation을 사용해야 합니다.

✅ 쿠키 + Params 함께 쓰는 예시: 게시물 상세 페이지 + 인증

// app/posts/[id]/page.tsx
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export default async function PostDetail({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>로그인이 필요합니다.</div>
  }

  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', params.id)
    .single()

  return (
    <div>
      <h1>{post?.title}</h1>
      <p>{post?.content}</p>
    </div>
  )
}

이 코드는 params.id로 게시글을 가져오고, cookies()로 유저 인증을 처리합니다.

💡 정리

📌 쿠키 관련 핵심 포인트

cookies()는 서버 컴포넌트에서만 사용 가능

클라이언트에서는 절대 HttpOnly 쿠키 접근 불가

인증 체크는 middleware.ts나 서버 컴포넌트에서 처리

Supabase 인증을 할 땐 createServerComponentClient 사용

📌 파라미터 관련 핵심 포인트

params는 서버 컴포넌트의 props로 직접 전달됨

클라이언트 컴포넌트는 useParams() 사용

useRouter().query는 App Router에서 ❌ 사용 금지

