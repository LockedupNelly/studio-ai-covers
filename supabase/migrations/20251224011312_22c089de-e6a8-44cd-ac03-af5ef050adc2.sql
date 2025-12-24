-- Create storage bucket for generated covers
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do update set public = excluded.public;

-- Allow anyone to read from the public covers bucket
create policy "Public can view covers"
on storage.objects
for select
using (bucket_id = 'covers');
