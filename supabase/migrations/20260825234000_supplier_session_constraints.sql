alter table public.pin_attempts drop constraint if exists pin_attempts_scope_check;
alter table public.pin_attempts add constraint pin_attempts_scope_check check (scope in ('company', 'super_admin', 'supplier'));

alter table public.app_sessions drop constraint if exists app_sessions_check;
alter table public.app_sessions add constraint app_sessions_identity_check check (
  (role = 'company' and company_id is not null and super_admin_id is null and supplier_id is null) or
  (role = 'super_admin' and super_admin_id is not null and company_id is null and supplier_id is null) or
  (role = 'supplier' and supplier_id is not null and company_id is null and super_admin_id is null)
);
