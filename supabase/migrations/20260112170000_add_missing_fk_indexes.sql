-- Add missing foreign key indexes for better join performance and faster RLS
-- subqueries. This migration is intentionally limited to indexes (no RLS changes).

create index if not exists idx_app_settings_updated_by
  on public.app_settings (updated_by);

create index if not exists idx_groups_created_by
  on public.groups (created_by);

create index if not exists idx_notifications_question
  on public.notifications (question_id);

-- Note: idx_notifications_user_unread is partial; add a full index for FK checks and
-- joins that don't filter on read=false.
create index if not exists idx_notifications_user
  on public.notifications (user_id);

create index if not exists idx_questions_created_by
  on public.questions (created_by);

create index if not exists idx_questions_winning_option
  on public.questions (winning_option_id);

create index if not exists idx_vote_comments_user
  on public.vote_comments (user_id);
