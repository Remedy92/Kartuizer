-- Allow users to delete their own votes while the question is open
-- Needed for poll vote changes (delete old poll selections before insert)

drop policy if exists "Votes delete own" on public.votes;
create policy "Votes delete own" on public.votes
  for delete to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.questions q
      where q.id = question_id
        and q.status = 'open'
    )
  );
