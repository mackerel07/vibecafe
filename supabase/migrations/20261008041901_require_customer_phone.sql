-- 기존 주문은 보존하고, 새 주문부터 전화번호 누락을 차단합니다.
-- NOT VALID 제약도 추가 이후의 INSERT/UPDATE에는 즉시 적용됩니다.
alter table public.cafe_menu03
  add constraint cafe_menu03_phone_required
  check (phone is not null and btrim(phone) <> '')
  not valid;
