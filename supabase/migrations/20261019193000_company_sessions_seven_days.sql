create or replace function public.create_app_session(p_role text, p_company_id text, p_super_admin_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.app_sessions(token_hash, role, company_id, super_admin_id, expires_at)
  values (
    public.hash_session_token(v_token),
    p_role,
    p_company_id,
    p_super_admin_id,
    now() + case
      when p_role = 'company' then interval '7 days'
      else interval '12 hours'
    end
  );

  return v_token;
end;
$$;

update public.app_sessions
set expires_at = greatest(expires_at, now() + interval '7 days')
where role = 'company'
  and revoked_at is null
  and expires_at > now();
