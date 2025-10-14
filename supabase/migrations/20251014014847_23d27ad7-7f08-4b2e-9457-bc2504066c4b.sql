-- Just create the trigger since table and policies already exist
drop trigger if exists t_user_reviews_sync on user_reviews;

create or replace function trg_sync_review_into_ratings_and_post()
returns trigger language plpgsql as $$
declare
  v_score int;
  v_post_id uuid;
begin
  v_score := new.rating_percent;

  if v_score is not null then
    -- upsert rating row
    insert into user_ratings(user_id,item_type,item_id,score,source)
    values (new.user_id, new.item_type, new.item_id, v_score, 'manual')
    on conflict (user_id,item_type,item_id) do update
      set score=excluded.score, source='manual', updated_at=now();

    -- update the most recent review post for this item by this user
    select id into v_post_id
    from posts
    where author_id = new.user_id
      and kind = 'review'
      and item_type = new.item_type
      and item_id = new.item_id
    order by created_at desc
    limit 1;

    if v_post_id is not null then
      update posts set rating_percent = v_score where id = v_post_id;
    end if;
  end if;

  return new;
end
$$;

create trigger t_user_reviews_sync
after insert or update of rating_percent on user_reviews
for each row execute function trg_sync_review_into_ratings_and_post();