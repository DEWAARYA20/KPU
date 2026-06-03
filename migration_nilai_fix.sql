-- ============================================================
-- WAJIB DIJALANKAN di Supabase Dashboard > SQL Editor
-- Perbaikan: tambah kolom nilai + pastikan RLS policy benar
-- ============================================================

-- 1. Pastikan kolom nilai ada di buku_kendali
ALTER TABLE buku_kendali ADD COLUMN IF NOT EXISTS nilai INTEGER;

-- 2. Pastikan kolom approved_by ada (dibutuhkan saat approve)
ALTER TABLE buku_kendali ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- 3. Pastikan kolom user_signature ada
ALTER TABLE buku_kendali ADD COLUMN IF NOT EXISTS user_signature TEXT;

-- 4. Drop semua RLS policy lama pada buku_kendali dan buat ulang
DROP POLICY IF EXISTS "Allow select for owner, supervisor and admin" ON buku_kendali;
DROP POLICY IF EXISTS "Allow update for owner, supervisor and admin" ON buku_kendali;
DROP POLICY IF EXISTS "Allow select for owner and supervisor and admin" ON buku_kendali;
DROP POLICY IF EXISTS "Allow update for owner and supervisor and admin" ON buku_kendali;
DROP POLICY IF EXISTS "Allow select for owner and supervisor" ON buku_kendali;
DROP POLICY IF EXISTS "Allow update for owner and supervisor" ON buku_kendali;
DROP POLICY IF EXISTS "Users can view their own buku_kendali" ON buku_kendali;
DROP POLICY IF EXISTS "Users can update their own buku_kendali" ON buku_kendali;

-- SELECT: pemilik ATAU atasan langsung (via nip_atasan) ATAU admin
CREATE POLICY "buku_kendali_select_policy" ON buku_kendali
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles AS sub
    WHERE sub.id = buku_kendali.user_id
      AND sub.nip_atasan = (
        SELECT nip FROM profiles WHERE id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'secretary', 'head')
  )
);

-- UPDATE: pemilik ATAU atasan langsung ATAU admin/secretary/head
CREATE POLICY "buku_kendali_update_policy" ON buku_kendali
FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles AS sub
    WHERE sub.id = buku_kendali.user_id
      AND sub.nip_atasan = (
        SELECT nip FROM profiles WHERE id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'secretary', 'head')
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles AS sub
    WHERE sub.id = buku_kendali.user_id
      AND sub.nip_atasan = (
        SELECT nip FROM profiles WHERE id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'secretary', 'head')
  )
);

-- INSERT: hanya pemilik sendiri
DROP POLICY IF EXISTS "Users can insert buku_kendali" ON buku_kendali;
CREATE POLICY "buku_kendali_insert_policy" ON buku_kendali
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. Perbaiki juga RLS untuk activity_records
DROP POLICY IF EXISTS "Allow select for owner, supervisor and admin" ON activity_records;
DROP POLICY IF EXISTS "Allow update for owner, supervisor and admin" ON activity_records;
DROP POLICY IF EXISTS "Allow select for owner and supervisor and admin" ON activity_records;
DROP POLICY IF EXISTS "Allow update for owner and supervisor and admin" ON activity_records;

CREATE POLICY "activity_records_select_policy" ON activity_records
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles AS sub
    WHERE sub.id = activity_records.user_id
      AND sub.nip_atasan = (
        SELECT nip FROM profiles WHERE id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'secretary', 'head')
  )
);

CREATE POLICY "activity_records_update_policy" ON activity_records
FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles AS sub
    WHERE sub.id = activity_records.user_id
      AND sub.nip_atasan = (
        SELECT nip FROM profiles WHERE id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'secretary', 'head')
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles AS sub
    WHERE sub.id = activity_records.user_id
      AND sub.nip_atasan = (
        SELECT nip FROM profiles WHERE id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'secretary', 'head')
  )
);

-- Selesai! ✅
