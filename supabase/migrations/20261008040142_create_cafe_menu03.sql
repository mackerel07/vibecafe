-- 바이브 카페 주문 테이블을 만듭니다.
create table if not exists public.cafe_menu03 (
  id            bigint generated always as identity primary key,
  customer_name text    not null,
  phone         text,
  drink         text    not null,
  drink_price   integer not null,
  size          text    not null default 'M'
                check (size in ('S', 'M', 'L')),
  options       text[]  default '{}',
  quantity      integer not null default 1
                check (quantity between 1 and 10),
  request       text,
  total_price   integer not null,
  created_at    timestamptz not null default now()
);

-- 공개 API에서 테이블을 쓸 수 있도록 먼저 RLS로 보호합니다.
alter table public.cafe_menu03 enable row level security;

-- 로그인하지 않은 손님은 주문 추가만 할 수 있습니다.
drop policy if exists "손님은 주문을 넣을 수 있다" on public.cafe_menu03;
create policy "손님은 주문을 넣을 수 있다"
  on public.cafe_menu03
  for insert
  to anon
  with check (true);

-- 새 프로젝트의 Data API는 명시적 권한이 필요합니다.
grant usage on schema public to anon;
grant insert on table public.cafe_menu03 to anon;
grant usage, select on sequence public.cafe_menu03_id_seq to anon;
