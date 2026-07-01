
-- Tighten EXECUTE privileges on SECURITY DEFINER functions.
-- Only visitor counter and username→email lookup need to be callable before sign-in.

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_grant_owner() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_rating_stars() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.relaxa_join() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relaxa_join() TO authenticated;

REVOKE ALL ON FUNCTION public.relaxa_leave(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relaxa_leave(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_listing_with_refund(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_listing_with_refund(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.owner_find_user_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_find_user_by_email(text) TO authenticated;

REVOKE ALL ON FUNCTION public.owner_transfer_tokens(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_transfer_tokens(text, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.owner_grant_owner_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_grant_owner_by_email(text) TO authenticated;

REVOKE ALL ON FUNCTION public.owner_revoke_owner_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_revoke_owner_by_email(text) TO authenticated;

REVOKE ALL ON FUNCTION public.owner_list_owners() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_list_owners() TO authenticated;

REVOKE ALL ON FUNCTION public.is_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Keep these publicly callable:
GRANT EXECUTE ON FUNCTION public.increment_visitor() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;
