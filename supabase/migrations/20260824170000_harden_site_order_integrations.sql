create policy site_integrations_no_direct_access
  on private.site_integrations
  as restrictive
  for all
  to public
  using (false)
  with check (false);

revoke execute on function public.integrar_pedido_site(text, jsonb)
  from authenticated;
