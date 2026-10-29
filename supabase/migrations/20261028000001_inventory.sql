-- Valley Pawn catalog: inventory, owners, revisions, atomic publish and rollback.
-- All inventory writes from the app go through publish_import / rollback_inventory (security
-- definer, owner-checked, single transaction) or narrowly granted owner-only columns.

-- ------------------------------------------------------------------ owners (allowlist)
create table public.owners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  added_at timestamptz not null default now()
);
alter table public.owners enable row level security;
create policy owners_read_self on public.owners for select to authenticated using (user_id = auth.uid());

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.owners where user_id = auth.uid());
$$;

-- ------------------------------------------------------------------ inventory state (single row)
create table public.inventory_state (
  id boolean primary key default true check (id),
  revision bigint not null default 0,
  last_changed_at timestamptz,
  last_published_at timestamptz
);
insert into public.inventory_state default values;
alter table public.inventory_state enable row level security;
create policy inventory_state_read on public.inventory_state for select to anon, authenticated using (true);

-- ------------------------------------------------------------------ items
create table public.items (
  item_id text primary key check (item_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
  title text not null check (length(btrim(title)) between 1 and 200),
  category text not null check (length(btrim(category)) between 1 and 60),
  price numeric(12, 2) not null check (price >= 0 and price <= 9999999.99),
  condition text not null default '' check (condition in ('', 'Brand New', 'Like New', 'Excellent', 'Good', 'Fair', 'For Parts')),
  description text not null default '' check (length(description) <= 5000),
  brand text not null default '' check (length(brand) <= 100),
  model text not null default '' check (length(model) <= 100),
  accessories text not null default '' check (length(accessories) <= 1000),
  status text not null check (status in ('available', 'sold', 'draft', 'archived')),
  featured boolean not null default false,
  date_added date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index items_item_id_ci on public.items (lower(item_id));
create index items_public_newest on public.items (status, date_added desc, item_id);
create index items_public_category on public.items (status, category);
create index items_public_price on public.items (status, price);

alter table public.items enable row level security;
-- Public: available and sold only (sold stays reachable by direct link). Owners: everything.
create policy items_public_read on public.items for select to anon, authenticated
  using (status in ('available', 'sold') or public.is_owner());
create policy items_owner_update on public.items for update to authenticated
  using (public.is_owner()) with check (public.is_owner());
-- No insert or delete policies: new items only arrive through publish_import, and items are never deleted.

-- ------------------------------------------------------------------ photos
create table public.item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references public.items (item_id) on update cascade on delete restrict,
  source text not null check (source in ('upload', 'url')),
  storage_path text,
  thumb_path text,
  external_url text,
  width int check (width is null or width between 1 and 10000),
  height int check (height is null or height between 1 and 10000),
  position int not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  constraint photo_source_shape check (
    (source = 'upload' and external_url is null and storage_path like 'items/' || item_id || '/%'
      and (thumb_path is null or thumb_path like 'items/' || item_id || '/%'))
    or (source = 'url' and storage_path is null and thumb_path is null and external_url ~ '^https://[^[:space:]]+$')
  )
);
create index item_photos_item on public.item_photos (item_id, position);

alter table public.item_photos enable row level security;
create policy item_photos_read on public.item_photos for select to anon, authenticated using (
  exists (select 1 from public.items i where i.item_id = item_photos.item_id and (i.status in ('available', 'sold') or public.is_owner()))
);
create policy item_photos_owner_insert on public.item_photos for insert to authenticated
  with check (public.is_owner() and source = 'upload');
create policy item_photos_owner_update on public.item_photos for update to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy item_photos_owner_delete on public.item_photos for delete to authenticated using (public.is_owner());

create or replace function public.enforce_photo_limit() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.item_photos where item_id = new.item_id) >= 12 then
    raise exception 'photo_limit: an item can have at most 12 photos' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger item_photos_limit before insert on public.item_photos for each row execute function public.enforce_photo_limit();

-- ------------------------------------------------------------------ revisions & runs (owner-only)
create table public.inventory_revisions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('import', 'rollback')),
  label text not null,
  actor uuid,
  revision_before bigint not null,
  item_count int not null,
  snapshot jsonb not null -- recovery point: inventory as it was immediately BEFORE this change
);
alter table public.inventory_revisions enable row level security;
create policy inventory_revisions_owner_read on public.inventory_revisions for select to authenticated using (public.is_owner());

create table public.import_runs (
  id bigint generated always as identity primary key,
  idempotency_key uuid not null unique,
  kind text not null check (kind in ('import', 'rollback')),
  mode text,
  file_name text,
  file_sha256 text,
  summary jsonb,
  actor uuid not null,
  revision_before bigint not null,
  revision_after bigint not null,
  recovery_revision_id bigint references public.inventory_revisions (id),
  created_at timestamptz not null default now()
);
alter table public.import_runs enable row level security;
create policy import_runs_owner_read on public.import_runs for select to authenticated using (public.is_owner());

-- ------------------------------------------------------------------ revision counter
-- Any change to items or photos bumps the revision, which invalidates open import previews.
create or replace function public.bump_inventory_revision() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.inventory_state set revision = revision + 1, last_changed_at = now();
  return null;
end $$;
create trigger items_bump after insert or update or delete on public.items for each statement execute function public.bump_inventory_revision();
create trigger item_photos_bump after insert or update or delete on public.item_photos for each statement execute function public.bump_inventory_revision();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger items_touch before update on public.items for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ privileges
-- Supabase grants broad table privileges to anon/authenticated by default; narrow them.
revoke all on public.owners, public.inventory_state, public.items, public.item_photos, public.inventory_revisions, public.import_runs from anon, authenticated;
grant select on public.inventory_state, public.items, public.item_photos to anon, authenticated;
grant select on public.owners, public.inventory_revisions, public.import_runs to authenticated;
grant update (status, featured) on public.items to authenticated;
grant insert (item_id, source, storage_path, thumb_path, width, height, position) on public.item_photos to authenticated;
grant update (position) on public.item_photos to authenticated;
grant delete on public.item_photos to authenticated;

-- ------------------------------------------------------------------ JSON helpers
create or replace function public.item_to_json(i public.items) returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'item_id', i.item_id, 'title', i.title, 'category', i.category, 'price', i.price,
    'condition', i.condition, 'description', i.description, 'brand', i.brand, 'model', i.model,
    'accessories', i.accessories, 'status', i.status, 'featured', i.featured, 'date_added', i.date_added,
    'updated_at', i.updated_at,
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'source', p.source, 'storage_path', p.storage_path,
        'thumb_path', p.thumb_path, 'external_url', p.external_url, 'position', p.position,
        'width', p.width, 'height', p.height) order by p.position, p.created_at)
      from public.item_photos p where p.item_id = i.item_id), '[]'::jsonb)
  );
$$;

create or replace function public.inventory_snapshot() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'item_id', i.item_id, 'title', i.title, 'category', i.category, 'price', i.price, 'condition', i.condition,
    'description', i.description, 'brand', i.brand, 'model', i.model, 'accessories', i.accessories,
    'status', i.status, 'featured', i.featured, 'date_added', i.date_added,
    'url_photos', coalesce((select jsonb_agg(p.external_url order by p.position) from public.item_photos p
      where p.item_id = i.item_id and p.source = 'url'), '[]'::jsonb)
  ) order by i.item_id), '[]'::jsonb) from public.items i;
$$;

-- ------------------------------------------------------------------ public read API (RLS applies)
create or replace function public.search_public_items(
  p_q text default null, p_category text default null, p_condition text default null,
  p_min_price numeric default null, p_max_price numeric default null, p_sort text default 'newest',
  p_featured boolean default null, p_exclude text default null, p_limit int default 24, p_offset int default 0
) returns jsonb
language sql stable security invoker set search_path = public as $$
  with filtered as (
    select i.* from public.items i
    where i.status = 'available'
      and (coalesce(btrim(p_q), '') = '' or
           (i.title || ' ' || i.brand || ' ' || i.model || ' ' || i.description || ' ' || i.item_id)
             ilike '%' || replace(replace(replace(btrim(p_q), '\', '\\'), '%', '\%'), '_', '\_') || '%')
      and (p_category is null or i.category = p_category)
      and (p_condition is null or i.condition = p_condition)
      and (p_min_price is null or i.price >= p_min_price)
      and (p_max_price is null or i.price <= p_max_price)
      and (p_featured is null or i.featured = p_featured)
      and (p_exclude is null or i.item_id <> p_exclude)
  ), page as (
    select f.item_id, row_number() over (
      order by
        case when p_sort = 'price-asc' then f.price end asc,
        case when p_sort = 'price-desc' then f.price end desc,
        f.date_added desc, f.item_id) as rn
    from filtered f
    order by rn
    limit least(greatest(coalesce(p_limit, 24), 1), 100) offset greatest(coalesce(p_offset, 0), 0)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'items', coalesce((select jsonb_agg(public.item_to_json(i) order by pg.rn)
                       from page pg join public.items i on i.item_id = pg.item_id), '[]'::jsonb)
  );
$$;

create or replace function public.get_public_item(p_item_id text) returns jsonb
language sql stable security invoker set search_path = public as $$
  select public.item_to_json(i) from public.items i
  where i.item_id = p_item_id and i.status in ('available', 'sold');
$$;

create or replace function public.public_category_counts() returns table (category text, item_count bigint)
language sql stable security invoker set search_path = public as $$
  select i.category, count(*) from public.items i where i.status = 'available' group by i.category order by i.category;
$$;

create or replace function public.owner_list_items() returns jsonb
language plpgsql stable security invoker set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'not_authorized' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(public.item_to_json(i) order by i.date_added desc, i.item_id) from public.items i), '[]'::jsonb);
end $$;

-- ------------------------------------------------------------------ validation (mirrors src/lib/inventory/serverValidation.js)
create or replace function public.validate_item_fields(p_id text, p_fields jsonb, p_is_new boolean) returns void
language plpgsql stable set search_path = public as $$
declare
  errs text[] := '{}';
  k text;
  v jsonb;
  lim int;
begin
  if p_id is null or p_id !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$' then errs := errs || 'invalid item number'::text; end if;
  if jsonb_typeof(p_fields) is distinct from 'object' then
    raise exception 'invalid_item %: fields must be an object', p_id using errcode = '22023';
  end if;
  if p_is_new then
    foreach k in array array['title', 'category', 'price', 'status'] loop
      if not p_fields ? k then errs := errs || (k || ' is required for new items'); end if;
    end loop;
  end if;
  for k, v in select * from jsonb_each(p_fields) loop
    case k
      when 'title', 'category', 'brand', 'model', 'description', 'accessories' then
        lim := case k when 'title' then 200 when 'category' then 60 when 'description' then 5000 when 'accessories' then 1000 else 100 end;
        if jsonb_typeof(v) <> 'string' or length(v #>> '{}') > lim
           or (k in ('title', 'category') and length(btrim(v #>> '{}')) = 0) then
          errs := errs || ('invalid ' || k);
        end if;
      when 'price' then
        if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric < 0 or (v #>> '{}')::numeric > 9999999.99
           or (v #>> '{}')::numeric <> round((v #>> '{}')::numeric, 2) then
          errs := errs || 'invalid price'::text;
        end if;
      when 'status' then
        if jsonb_typeof(v) <> 'string' or (v #>> '{}') not in ('available', 'sold', 'draft', 'archived') then errs := errs || 'invalid status'::text; end if;
      when 'condition' then
        if jsonb_typeof(v) <> 'string' or (v #>> '{}') not in ('', 'Brand New', 'Like New', 'Excellent', 'Good', 'Fair', 'For Parts') then
          errs := errs || 'invalid condition'::text;
        end if;
      when 'featured' then
        if jsonb_typeof(v) <> 'boolean' then errs := errs || 'invalid featured'::text; end if;
      when 'date_added' then
        begin
          if jsonb_typeof(v) <> 'string' or (v #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$'
             or to_char((v #>> '{}')::date, 'YYYY-MM-DD') <> (v #>> '{}') then
            errs := errs || 'invalid date_added'::text;
          end if;
        exception when others then
          errs := errs || 'invalid date_added'::text;
        end;
      else
        errs := errs || ('unknown field ' || k);
    end case;
  end loop;
  if cardinality(errs) > 0 then
    raise exception 'invalid_item %: %', p_id, array_to_string(errs, ', ') using errcode = '22023';
  end if;
end $$;

create or replace function public.set_url_photos(p_item_id text, p_urls jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare base int;
begin
  if jsonb_typeof(p_urls) <> 'array' or jsonb_array_length(p_urls) > 12
     or exists (select 1 from jsonb_array_elements(p_urls) u where jsonb_typeof(u) <> 'string' or (u #>> '{}') !~ '^https://[^[:space:]]+$') then
    raise exception 'invalid_item %: invalid photo links', p_item_id using errcode = '22023';
  end if;
  delete from public.item_photos where item_id = p_item_id and source = 'url';
  select coalesce(max(position) + 1, 0) into base from public.item_photos where item_id = p_item_id;
  insert into public.item_photos (item_id, source, external_url, position)
  select p_item_id, 'url', u.value #>> '{}', base + (u.ord - 1)::int
  from jsonb_array_elements(p_urls) with ordinality as u(value, ord);
end $$;

-- ------------------------------------------------------------------ atomic publish
create or replace function public.publish_import(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_state public.inventory_state;
  v_key uuid;
  v_prior public.import_runs;
  v_mode text := p_payload ->> 'mode';
  v_up jsonb;
  v_id text;
  v_new boolean;
  v_f jsonb;
  v_present text[];
  v_archive text[];
  v_expected text[];
  v_recovery bigint;
  v_rev_before bigint;
  v_rev_after bigint;
begin
  if v_uid is null or not public.is_owner() then
    raise exception 'not_authorized: only shop owners can publish inventory' using errcode = '42501';
  end if;
  begin
    v_key := (p_payload ->> 'idempotency_key')::uuid;
  exception when others then
    raise exception 'invalid_payload: idempotency_key must be a uuid' using errcode = '22023';
  end;
  if v_key is null then raise exception 'invalid_payload: idempotency_key is required' using errcode = '22023'; end if;

  -- Serialize publishers. Everything below happens in this one transaction.
  select * into v_state from public.inventory_state where id for update;

  select * into v_prior from public.import_runs where idempotency_key = v_key;
  if found then
    return jsonb_build_object('revision', v_prior.revision_after, 'already_applied', true);
  end if;

  if (p_payload ->> 'base_revision')::bigint is distinct from v_state.revision then
    raise exception 'stale_preview: inventory changed after this preview was prepared (preview revision %, current %)',
      p_payload ->> 'base_revision', v_state.revision using errcode = '40001';
  end if;
  if v_mode is null or v_mode not in ('upsert', 'complete') then
    raise exception 'invalid_payload: unknown mode' using errcode = '22023';
  end if;
  if jsonb_typeof(p_payload -> 'upserts') <> 'array' then
    raise exception 'invalid_payload: upserts must be an array' using errcode = '22023';
  end if;
  if (select count(*) <> count(distinct lower(u ->> 'item_id')) from jsonb_array_elements(p_payload -> 'upserts') u) then
    raise exception 'invalid_payload: an item number appears more than once' using errcode = '22023';
  end if;

  -- Re-validate every row before any write.
  for v_up in select * from jsonb_array_elements(p_payload -> 'upserts') loop
    v_id := v_up ->> 'item_id';
    v_new := coalesce((v_up ->> 'is_new')::boolean, false);
    perform public.validate_item_fields(v_id, v_up -> 'fields', v_new);
    if v_new and exists (select 1 from public.items where lower(item_id) = lower(v_id)) then
      raise exception 'stale_preview: item % already exists', v_id using errcode = '40001';
    end if;
    if not v_new and not exists (select 1 from public.items where item_id = v_id) then
      raise exception 'stale_preview: item % no longer exists', v_id using errcode = '40001';
    end if;
  end loop;

  v_archive := '{}';
  if v_mode = 'complete' then
    select coalesce(array_agg(x), '{}') into v_present from jsonb_array_elements_text(coalesce(p_payload -> 'present_ids', '[]')) x;
    if exists (select 1 from jsonb_array_elements(p_payload -> 'upserts') u where not (u ->> 'item_id') = any (v_present)) then
      raise exception 'invalid_payload: complete import is missing item numbers' using errcode = '22023';
    end if;
    select coalesce(array_agg(item_id order by item_id), '{}') into v_archive
      from public.items where status <> 'archived' and not item_id = any (v_present);
    select coalesce(array_agg(x order by x), '{}') into v_expected from jsonb_array_elements_text(coalesce(p_payload -> 'expected_archive_ids', '[]')) x;
    if v_archive is distinct from v_expected then
      raise exception 'archive_mismatch: items to archive differ from the reviewed preview' using errcode = '40001';
    end if;
  end if;

  v_rev_before := v_state.revision;
  insert into public.inventory_revisions (kind, label, actor, revision_before, item_count, snapshot)
  values ('import', 'Before import of ' || coalesce(p_payload ->> 'file_name', 'spreadsheet'), v_uid, v_rev_before,
          (select count(*) from public.items), public.inventory_snapshot())
  returning id into v_recovery;

  for v_up in select * from jsonb_array_elements(p_payload -> 'upserts') loop
    v_id := v_up ->> 'item_id';
    v_f := v_up -> 'fields';
    if coalesce((v_up ->> 'is_new')::boolean, false) then
      insert into public.items (item_id, title, category, price, condition, description, brand, model, accessories, status, featured, date_added)
      values (v_id, v_f ->> 'title', v_f ->> 'category', (v_f ->> 'price')::numeric,
              coalesce(v_f ->> 'condition', ''), coalesce(v_f ->> 'description', ''), coalesce(v_f ->> 'brand', ''),
              coalesce(v_f ->> 'model', ''), coalesce(v_f ->> 'accessories', ''), v_f ->> 'status',
              coalesce((v_f ->> 'featured')::boolean, false), coalesce((v_f ->> 'date_added')::date, current_date));
    elsif v_f <> '{}'::jsonb then
      update public.items set
        title = case when v_f ? 'title' then v_f ->> 'title' else title end,
        category = case when v_f ? 'category' then v_f ->> 'category' else category end,
        price = case when v_f ? 'price' then (v_f ->> 'price')::numeric else price end,
        condition = case when v_f ? 'condition' then v_f ->> 'condition' else condition end,
        description = case when v_f ? 'description' then v_f ->> 'description' else description end,
        brand = case when v_f ? 'brand' then v_f ->> 'brand' else brand end,
        model = case when v_f ? 'model' then v_f ->> 'model' else model end,
        accessories = case when v_f ? 'accessories' then v_f ->> 'accessories' else accessories end,
        status = case when v_f ? 'status' then v_f ->> 'status' else status end,
        featured = case when v_f ? 'featured' then (v_f ->> 'featured')::boolean else featured end,
        date_added = case when v_f ? 'date_added' then (v_f ->> 'date_added')::date else date_added end
      where item_id = v_id;
    end if;
    if jsonb_typeof(v_up -> 'url_photos') = 'array' then
      perform public.set_url_photos(v_id, v_up -> 'url_photos');
    end if;
  end loop;

  if cardinality(v_archive) > 0 then
    update public.items set status = 'archived' where item_id = any (v_archive);
  end if;

  update public.inventory_state set last_published_at = now() returning revision into v_rev_after;
  insert into public.import_runs (idempotency_key, kind, mode, file_name, file_sha256, summary, actor, revision_before, revision_after, recovery_revision_id)
  values (v_key, 'import', v_mode, p_payload ->> 'file_name', p_payload ->> 'file_sha256',
          coalesce(p_payload -> 'summary', '{}') || jsonb_build_object('archived', cardinality(v_archive)),
          v_uid, v_rev_before, v_rev_after, v_recovery);
  return jsonb_build_object('revision', v_rev_after, 'already_applied', false);
end $$;

-- ------------------------------------------------------------------ atomic rollback
create or replace function public.rollback_inventory(p_revision_id bigint, p_base_revision bigint, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_state public.inventory_state;
  v_prior public.import_runs;
  v_target public.inventory_revisions;
  v_recovery bigint;
  v_rev_after bigint;
  s jsonb;
begin
  if v_uid is null or not public.is_owner() then
    raise exception 'not_authorized: only shop owners can restore inventory' using errcode = '42501';
  end if;
  if p_idempotency_key is null then raise exception 'invalid_payload: idempotency key required' using errcode = '22023'; end if;
  select * into v_state from public.inventory_state where id for update;
  select * into v_prior from public.import_runs where idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('revision', v_prior.revision_after, 'already_applied', true); end if;
  if p_base_revision is distinct from v_state.revision then
    raise exception 'stale_preview: inventory changed since the history page was loaded' using errcode = '40001';
  end if;
  select * into v_target from public.inventory_revisions where id = p_revision_id;
  if not found then raise exception 'invalid_payload: restore point not found' using errcode = '22023'; end if;

  -- Recovery point for the state being replaced.
  insert into public.inventory_revisions (kind, label, actor, revision_before, item_count, snapshot)
  values ('rollback', 'Before restoring: ' || v_target.label, v_uid, v_state.revision,
          (select count(*) from public.items), public.inventory_snapshot())
  returning id into v_recovery;

  for s in select * from jsonb_array_elements(v_target.snapshot) loop
    insert into public.items as i (item_id, title, category, price, condition, description, brand, model, accessories, status, featured, date_added)
    values (s ->> 'item_id', s ->> 'title', s ->> 'category', (s ->> 'price')::numeric, s ->> 'condition', s ->> 'description',
            s ->> 'brand', s ->> 'model', s ->> 'accessories', s ->> 'status', (s ->> 'featured')::boolean, (s ->> 'date_added')::date)
    on conflict (item_id) do update set
      title = excluded.title, category = excluded.category, price = excluded.price, condition = excluded.condition,
      description = excluded.description, brand = excluded.brand, model = excluded.model, accessories = excluded.accessories,
      status = excluded.status, featured = excluded.featured, date_added = excluded.date_added;
    perform public.set_url_photos(s ->> 'item_id', coalesce(s -> 'url_photos', '[]'));
  end loop;

  -- Items created after the restore point are archived, never deleted.
  update public.items set status = 'archived'
  where status <> 'archived'
    and item_id not in (select x ->> 'item_id' from jsonb_array_elements(v_target.snapshot) x);

  update public.inventory_state set last_published_at = now() returning revision into v_rev_after;
  insert into public.import_runs (idempotency_key, kind, mode, summary, actor, revision_before, revision_after, recovery_revision_id)
  values (p_idempotency_key, 'rollback', null, jsonb_build_object('restored_revision_id', p_revision_id, 'label', v_target.label),
          v_uid, v_state.revision, v_rev_after, v_recovery);
  return jsonb_build_object('revision', v_rev_after, 'already_applied', false);
end $$;

-- ------------------------------------------------------------------ photo ordering
create or replace function public.reorder_item_photos(p_item_id text, p_photo_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'not_authorized' using errcode = '42501'; end if;
  if (select coalesce(array_agg(id order by id), '{}') from public.item_photos where item_id = p_item_id)
     is distinct from (select coalesce(array_agg(x order by x), '{}') from unnest(p_photo_ids) x) then
    raise exception 'stale_preview: photos changed; reload and try again' using errcode = '40001';
  end if;
  update public.item_photos p set position = o.ord - 1
  from unnest(p_photo_ids) with ordinality as o(id, ord)
  where p.id = o.id and p.position is distinct from (o.ord - 1)::int;
end $$;

-- ------------------------------------------------------------------ function privileges
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_owner(), public.item_to_json(public.items), public.search_public_items(text, text, text, numeric, numeric, text, boolean, text, int, int),
  public.get_public_item(text), public.public_category_counts() to anon, authenticated;
grant execute on function public.owner_list_items(), public.publish_import(jsonb), public.rollback_inventory(bigint, bigint, uuid),
  public.reorder_item_photos(text, uuid[]) to authenticated;
