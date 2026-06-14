# Store Display

Vercel에 배포 가능한 Next.js 기반 실시간 디스플레이 MVP입니다.  
하나의 Next.js 프로젝트 안에서 Display 화면, Admin 관리 화면, API Route, Supabase DB/Storage/Realtime 연동을 모두 처리합니다.

## 프로젝트 설명

- **Display Mode** (`/display`): PC/태블릿에 켜두는 전체화면 슬라이드. 활성 캠페인의 page를 duration에 맞춰 순환 재생합니다.
- **Admin Mode** (`/admin`): 모바일에서 캠페인 CRUD, page 추가/순서 변경, 이미지 업로드를 수행합니다.
- **실시간 반영**: Supabase Realtime으로 `campaigns`, `campaign_pages` 변경을 구독해 Display 화면에 즉시 반영합니다.

## 로컬 실행 방법

```bash
npm install
cp .env.local.example .env.local
# .env.local 값을 실제 Supabase / Admin 값으로 교체
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## Supabase 설정 방법

1. Supabase 프로젝트 생성
2. `supabase/schema.sql` 실행
3. `supabase/README.md`의 Storage / Realtime / RLS 안내 적용
4. Project Settings → API에서 URL / anon key / service role key 복사

## campaigns / campaign_pages SQL 적용

Supabase Dashboard → SQL Editor에서 `supabase/schema.sql` 실행

또는 CLI:

```bash
supabase db execute --file supabase/schema.sql
```

## Storage bucket 생성

버킷 이름: **`campaign-images`**

`supabase/README.md`의 Storage SQL을 실행하세요.

## Realtime 활성화

`schema.sql`에 Realtime publication 설정이 포함되어 있습니다.  
Dashboard → Database → Replication에서 `campaigns`, `campaign_pages`가 활성화되어 있는지 확인하세요.

## 비밀번호 hash 생성

```bash
npm run hash-password -- 1234
```

출력 예:

```txt
Password: 1234
Bcrypt Hash: $2b$10$...
```

## .env / .env.local 작성

필수 변수:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD_HASH=
ADMIN_SESSION_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

템플릿:

- `.env.example`
- `.env.local.example`

## 기본 테스트 비밀번호 1234 변경 방법

1. 새 비밀번호 hash 생성

```bash
npm run hash-password -- 새비밀번호
```

2. 출력된 hash를 `.env.local`의 `ADMIN_PASSWORD_HASH`에 반영
3. dev server 재시작

## Vercel 배포 방법

1. GitHub에 push
2. Vercel에서 New Project → repository import
3. Framework Preset: Next.js
4. Environment Variables 등록
5. Deploy

## Vercel 환경변수

Vercel Project Settings → Environment Variables에 아래를 등록하세요.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL` (예: `https://your-app.vercel.app`)

Production에서는 `ADMIN_SESSION_SECRET`을 새 랜덤 문자열로 교체하세요.

## 사용 방법

| 경로 | 설명 |
|------|------|
| `/` | Display / Admin 모드 선택 |
| `/display` | 활성 캠페인 슬라이드 재생 |
| `/admin/login` | PIN 로그인 (기본 1234) |
| `/admin` | 캠페인 목록 / 활성화 / 삭제 |

## 캠페인 page duration 동작

- DB에는 `duration_seconds`로 저장
- Display는 현재 page를 해당 초만큼 표시 후 다음 page로 이동
- 마지막 page 이후 첫 page로 반복
- 비정상 값은 60초 fallback

옵션:

- 10초, 30초, 1분, 3분, 5분, 10분, 30분, 60분, 3시간, 6시간, 12시간, 24시간

## display type 설명

| value | UI label | 설명 |
|-------|----------|------|
| `static` | Static | 정적 표시 |
| `marquee` | Marquee | 좌우 흐름 |
| `liquid_glass_shimmer` | Liquid Glass Shimmer | 반투명 glass + shimmer |
| `shining` | Shining Text | 빛 지나감 |
| `fade` | Fade | fade in/out |
| `bounce` | Bounce | bounce |

## 이미지 업로드 제한

- base64 DB 저장 금지
- Supabase Storage `campaign-images` 버킷 사용
- DB에는 `image_url`, `image_path`만 저장
- 1장당 최대 **10MB**
- 캠페인당 최대 **20 page/image**
- 허용 MIME: jpeg, png, webp, gif

## 기술 스택

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL / Storage / Realtime
- bcryptjs (Admin PIN)
- HMAC signed httpOnly cookie session

## 폴더 구조

```txt
app/              # pages + API routes
components/       # UI components
lib/              # supabase, admin session, campaigns helpers
types/            # campaign types
supabase/         # schema.sql, setup README
scripts/          # hash-password
middleware.ts     # /admin protection
```

## 테스트 순서

1. `/` 접속
2. Display → `/display`, 빈 상태 문구 확인
3. Admin → `/admin/login`, PIN `1234` 로그인
4. 캠페인 생성 (page 2개, 이미지/문구/duration 설정)
5. 활성화 후 `/display`에서 슬라이드 재생 확인
6. Admin에서 수정/순서 변경 → Display 즉시 반영 확인
7. 20 page 초과 / 10MB 초과 업로드 에러 확인
8. Vercel 배포 후 동일 시나리오 재검증
