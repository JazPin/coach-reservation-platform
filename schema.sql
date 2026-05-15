-- ================================================
-- Coach Platform — Supabase Schema
-- 在 Supabase SQL Editor 執行此檔案
-- ================================================

-- 1. 教練表
create table coaches (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  available_hours jsonb default '{"0":[9,10,11,12,14,15,16,17,18],"1":[9,10,11,12,14,15,16,17,18],"2":[9,10,11,12,14,15,16,17,18],"3":[9,10,11,12,14,15,16,17,18],"4":[9,10,11,12,14,15,16,17,18],"5":[9,10,11,12,14,15,16,17,18],"6":[9,10,11,12,14,15,16,17,18]}'::jsonb,
  notify_48h boolean default true,
  notify_24h boolean default true,
  notify_low_sessions boolean default true,
  notify_low_threshold int default 3,
  ecpay_merchant_id text,
  ecpay_hash_key text,
  ecpay_hash_iv text,
  created_at timestamptz default now()
);

-- migration v2 (run in Supabase SQL Editor):
-- alter table coaches drop column available_hours;
-- alter table coaches add column available_hours jsonb default '{"0":[],"1":[9,10,11,12,14,15,16,17,18],"2":[9,10,11,12,14,15,16,17,18],"3":[9,10,11,12,14,15,16,17,18],"4":[9,10,11,12,14,15,16,17,18],"5":[9,10,11,12,14,15,16,17,18],"6":[]}'::jsonb;

-- migration v3 (run in Supabase SQL Editor):
-- alter table coaches add column if not exists notify_48h boolean default true;
-- alter table coaches add column if not exists notify_24h boolean default true;
-- alter table coaches add column if not exists notify_low_sessions boolean default true;
-- alter table coaches add column if not exists notify_low_threshold int default 3;

-- 2. 學員表
create table students (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references coaches(id) on delete cascade not null,
  name text not null,
  phone text,
  email text,
  goal text,
  notes text,
  injury_notes text,
  session_frequency text,
  created_at timestamptz default now()
);

-- 3. 課堂包（學員購買的堂數）
create table session_packages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade not null,
  coach_id uuid references coaches(id) not null,
  total_sessions int not null,
  remaining_sessions int not null,
  price_per_session int not null,  -- 台幣，單位：元
  total_paid int not null,
  paid_at timestamptz default now(),
  expires_at timestamptz,
  ecpay_trade_no text,  -- 綠界交易編號
  created_at timestamptz default now()
);

-- 4. 預約記錄
create table appointments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references coaches(id) not null,
  student_id uuid references students(id) on delete cascade not null,
  package_id uuid references session_packages(id),
  scheduled_at timestamptz not null,
  duration_minutes int default 60,
  status text check (status in ('scheduled', 'completed', 'no_show')) default 'scheduled',
  notes text,
  reminded_48h boolean default false,
  reminded_24h boolean default false,
  created_at timestamptz default now()
);

-- 5. 課後訓練日誌
create table session_logs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id) on delete cascade,
  student_id uuid references students(id) on delete cascade not null,
  coach_id uuid references coaches(id) not null,
  weight_kg numeric(5,1),
  body_fat_pct numeric(4,1),
  training_notes text,
  exercises jsonb,  -- [{name, sets, reps, weight_kg, notes}]
  logged_at timestamptz default now()
);

-- ================================================
-- RLS 政策（Row Level Security）
-- ================================================

alter table coaches enable row level security;
alter table students enable row level security;
alter table session_packages enable row level security;
alter table appointments enable row level security;
alter table session_logs enable row level security;

-- 教練只能看自己的資料
create policy "coaches_own" on coaches for all using (auth.uid() = id);
create policy "students_own" on students for all using (auth.uid() = coach_id);
create policy "packages_own" on session_packages for all using (auth.uid() = coach_id);
create policy "appointments_own" on appointments for all using (auth.uid() = coach_id);
create policy "logs_own" on session_logs for all using (auth.uid() = coach_id);

-- ================================================
-- Functions（Stored Procedures）
-- ================================================

-- 扣點（原子操作）
create or replace function deduct_session(p_package_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update session_packages
  set remaining_sessions = remaining_sessions - 1
  where id = p_package_id
    and remaining_sessions > 0
    and coach_id = auth.uid();

  if not found then
    raise exception 'Package not found or no sessions remaining';
  end if;
end;
$$;

-- FIFO 扣點（優先扣最快到期的包，其次最舊付款的包）
create or replace function deduct_session_fifo(p_student_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_package_id uuid;
begin
  select id into v_package_id
  from session_packages
  where student_id = p_student_id
    and coach_id = auth.uid()
    and remaining_sessions > 0
  order by expires_at asc nulls last, paid_at asc
  limit 1;

  if v_package_id is null then
    raise exception 'No package with remaining sessions found';
  end if;

  update session_packages
  set remaining_sessions = remaining_sessions - 1
  where id = v_package_id;

  return v_package_id;
end;
$$;

-- 儀表板統計
create or replace function get_dashboard_stats(p_coach_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  today_start        timestamptz := date_trunc('day', now());
  today_end          timestamptz := today_start + interval '1 day';
  month_start        timestamptz := date_trunc('month', now());
  last_month_start   timestamptz := date_trunc('month', now() - interval '1 month');
  last_month_end     timestamptz := month_start;
  v_revenue          numeric;
  v_last_revenue     numeric;
  v_change_pct       numeric;
  result             json;
begin
  v_revenue      := coalesce((select sum(total_paid) from session_packages where coach_id = p_coach_id and paid_at >= month_start), 0);
  v_last_revenue := coalesce((select sum(total_paid) from session_packages where coach_id = p_coach_id and paid_at >= last_month_start and paid_at < last_month_end), 0);

  if v_last_revenue > 0 then
    v_change_pct := round((v_revenue - v_last_revenue) / v_last_revenue * 100, 1);
  elsif v_revenue > 0 then
    v_change_pct := 100;
  else
    v_change_pct := 0;
  end if;

  select json_build_object(
    'today_total',              (select count(*) from appointments where coach_id = p_coach_id and scheduled_at >= today_start and scheduled_at < today_end),
    'today_completed',         (select count(*) from appointments where coach_id = p_coach_id and scheduled_at >= today_start and scheduled_at < today_end and status = 'completed'),
    'today_no_show',           (select count(*) from appointments where coach_id = p_coach_id and scheduled_at >= today_start and scheduled_at < today_end and status = 'no_show'),
    'today_pending',           (select count(*) from appointments where coach_id = p_coach_id and scheduled_at >= today_start and scheduled_at < today_end and status = 'scheduled'),
    'monthly_revenue',         v_revenue,
    'monthly_revenue_last',    v_last_revenue,
    'monthly_revenue_change_pct', v_change_pct,
    'active_students',         (select count(distinct student_id) from appointments where coach_id = p_coach_id and scheduled_at >= month_start),
    'new_students_this_month', (select count(*) from students where coach_id = p_coach_id and created_at >= month_start),
    'monthly_sessions',        (select count(*) from appointments where coach_id = p_coach_id and scheduled_at >= month_start),
    'monthly_no_shows',        (select count(*) from appointments where coach_id = p_coach_id and scheduled_at >= month_start and status = 'no_show'),
    'no_show_rate',            round(
                                 coalesce(
                                   (select count(*) filter (where status = 'no_show')::numeric /
                                    nullif(count(*) filter (where status in ('completed','no_show')), 0) * 100
                                    from appointments where coach_id = p_coach_id and scheduled_at >= month_start)
                                 , 0), 1)
  ) into result;
  return result;
end;
$$;

-- ================================================
-- Indexes（效能優化）
-- ================================================
create index idx_appointments_coach_date on appointments(coach_id, scheduled_at);
create index idx_appointments_student on appointments(student_id);
create index idx_packages_student on session_packages(student_id);
create index idx_packages_remaining on session_packages(coach_id, remaining_sessions);
create index idx_logs_student on session_logs(student_id, logged_at desc);
