-- Accent-insensitive, substring search for users and courses.
-- `searchText` holds lowercased, accent-free text with a leading space (e.g. "Hóa học" -> " hoa hoc"),
-- maintained by triggers. The app searches for ' ' || word, so words match by prefix ("hoa" finds
-- "Hóa học" but not "khóa học"), and a trigram GIN index keeps `LIKE '% hoa%'` fast on large tables.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() is only STABLE; this wrapper pins the dictionary so it can be used in triggers and indexes.
CREATE OR REPLACE FUNCTION immutable_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
    AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION users_search_text() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW."searchText" := ' ' || lower(immutable_unaccent(NEW."email" || ' ' || NEW."fullName"));
    RETURN NEW;
END $$;

CREATE TRIGGER users_search_text BEFORE INSERT OR UPDATE OF "email", "fullName", "searchText" ON "users"
    FOR EACH ROW EXECUTE FUNCTION users_search_text();

CREATE OR REPLACE FUNCTION courses_search_text() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW."searchText" := ' ' || lower(immutable_unaccent(NEW."title" || ' ' || coalesce(NEW."subtitle", '')));
    RETURN NEW;
END $$;

CREATE TRIGGER courses_search_text BEFORE INSERT OR UPDATE OF "title", "subtitle", "searchText" ON "courses"
    FOR EACH ROW EXECUTE FUNCTION courses_search_text();

-- Backfill existing rows (the triggers compute the value).
UPDATE "users" SET "searchText" = '';
UPDATE "courses" SET "searchText" = '';

-- CreateIndex
CREATE INDEX "courses_searchText_idx" ON "courses" USING GIN ("searchText" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "users_searchText_idx" ON "users" USING GIN ("searchText" gin_trgm_ops);
