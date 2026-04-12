drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_groups_updated_at on public.groups;
create trigger set_groups_updated_at
before update on public.groups
for each row execute procedure public.set_updated_at();

drop trigger if exists set_questions_updated_at on public.questions;
create trigger set_questions_updated_at
before update on public.questions
for each row execute procedure public.set_updated_at();

drop trigger if exists set_votes_updated_at on public.votes;
create trigger set_votes_updated_at
before update on public.votes
for each row execute procedure public.set_updated_at();

drop trigger if exists set_vote_comments_updated_at on public.vote_comments;
create trigger set_vote_comments_updated_at
before update on public.vote_comments
for each row execute procedure public.set_updated_at();

drop trigger if exists sync_member_count_on_change on public.group_members;
create trigger sync_member_count_on_change
after insert or update or delete on public.group_members
for each row execute procedure public.sync_group_member_count();

drop trigger if exists update_decided_result_on_vote on public.votes;
create trigger update_decided_result_on_vote
after insert or update or delete on public.votes
for each row execute procedure public.update_question_decided_result();

drop trigger if exists update_poll_winner_on_vote on public.votes;
create trigger update_poll_winner_on_vote
after insert or update or delete on public.votes
for each row execute procedure public.update_poll_winner();

drop trigger if exists close_question_on_vote on public.votes;
create trigger close_question_on_vote
after insert on public.votes
for each row execute procedure public.close_question_if_threshold_reached();

drop trigger if exists prevent_question_edits_after_votes on public.questions;
create trigger prevent_question_edits_after_votes
before update on public.questions
for each row execute procedure public.prevent_question_edits_after_votes();

drop trigger if exists prevent_last_admin_on_update on public.user_profiles;
create trigger prevent_last_admin_on_update
before update on public.user_profiles
for each row execute procedure public.prevent_last_admin();

drop trigger if exists prevent_last_admin_on_delete on public.user_profiles;
create trigger prevent_last_admin_on_delete
before delete on public.user_profiles
for each row execute procedure public.prevent_last_admin();
