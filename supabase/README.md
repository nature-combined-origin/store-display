# Supabase Setup

## 1. Database Schema

Supabase Dashboard → SQL Editor에서 `supabase/schema.sql` 내용을 실행하세요.

또는 Supabase CLI:

```bash
supabase db execute --file supabase/schema.sql
```

## 2. Storage Bucket

버킷 이름: **`campaign-images`**

SQL Editor에서 아래를 실행하세요.

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaign-images',
  'campaign-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "Public read campaign images"
on storage.objects
for select
to public
using (bucket_id = 'campaign-images');
```

이미지 업로드는 서버 API Route가 **service role key**로 수행합니다.

## 3. Realtime

`schema.sql`에 아래 설정이 포함되어 있습니다.

- `campaigns`, `campaign_pages` 테이블 `replica identity full`
- `supabase_realtime` publication에 두 테이블 추가

Dashboard → Database → Replication에서 두 테이블이 Realtime에 포함되어 있는지 확인하세요.

Display 화면(`/display`)은 anon key로 Realtime을 구독합니다. 테이블 SELECT 권한이 필요하면 아래 정책을 추가하세요.

```sql
alter table public.campaigns enable row level security;
alter table public.campaign_pages enable row level security;

create policy "Public read campaigns"
on public.campaigns
for select
to anon, authenticated
using (true);

create policy "Public read campaign pages"
on public.campaign_pages
for select
to anon, authenticated
using (true);
```

쓰기/수정/삭제는 Next.js API Route(service role)에서만 수행합니다.

## 4. API Keys

Supabase Dashboard → Project Settings → API에서 아래 값을 복사해 `.env.local`에 넣으세요.

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- service_role secret key → `SUPABASE_SERVICE_ROLE_KEY`

**service role key는 절대 클라이언트에 노출하지 마세요.**
