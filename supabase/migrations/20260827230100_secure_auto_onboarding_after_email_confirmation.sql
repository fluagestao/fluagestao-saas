alter function public.complete_onboarding(text,text,text,text,text,text,text,text,text,text,text,text,text,text) security definer;
revoke all on function public.complete_onboarding(text,text,text,text,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.complete_onboarding(text,text,text,text,text,text,text,text,text,text,text,text,text,text) to authenticated;
