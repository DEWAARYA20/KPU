-- ============================================================
-- SQL Migration: Tambah kolom ke profiles & buku_kendali
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Tambah kolom ke tabel profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nip TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pangkat TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS jabatan TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unit_kerja TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nama_atasan TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nip_atasan TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS jabatan_atasan TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature TEXT;

-- 2. Tambah kolom ke tabel buku_kendali untuk tanda tangan
ALTER TABLE buku_kendali ADD COLUMN IF NOT EXISTS secretary_name TEXT;
ALTER TABLE buku_kendali ADD COLUMN IF NOT EXISTS secretary_nip TEXT;
ALTER TABLE buku_kendali ADD COLUMN IF NOT EXISTS secretary_signature TEXT;
ALTER TABLE buku_kendali ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE;

-- 3. Pastikan RLS policy mengizinkan user update profil mereka sendiri
-- (Jalankan hanya jika belum ada)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id)';
  END IF;
END $$;

-- 4. Tambah kolom skp_items ke tabel profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skp_items TEXT[];

-- 5. Kebijakan RLS untuk Administrator (CRUD Profil)
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop policy if exists to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

CREATE POLICY "Admins can manage all profiles" 
ON profiles 
FOR ALL 
USING (is_admin());

-- 6. Kebijakan RLS untuk buku_kendali agar Atasan/Supervisor dan Admin bisa membaca & menyetujui
DROP POLICY IF EXISTS "Allow select for owner and supervisor and admin" ON buku_kendali;
DROP POLICY IF EXISTS "Allow update for owner and supervisor and admin" ON buku_kendali;
DROP POLICY IF EXISTS "Allow select for owner and supervisor" ON buku_kendali;
DROP POLICY IF EXISTS "Allow update for owner and supervisor" ON buku_kendali;
DROP POLICY IF EXISTS "Users can view their own buku_kendali" ON buku_kendali;
DROP POLICY IF EXISTS "Users can update their own buku_kendali" ON buku_kendali;

CREATE POLICY "Allow select for owner, supervisor and admin" ON buku_kendali
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles AS subordinate
    WHERE subordinate.id = buku_kendali.user_id
      AND subordinate.nip_atasan = (
        SELECT nip FROM profiles WHERE id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Allow update for owner, supervisor and admin" ON buku_kendali
FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles AS subordinate
    WHERE subordinate.id = buku_kendali.user_id
      AND subordinate.nip_atasan = (
        SELECT nip FROM profiles WHERE id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles AS subordinate
    WHERE subordinate.id = buku_kendali.user_id
      AND subordinate.nip_atasan = (
        SELECT nip FROM profiles WHERE id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 7. Kebijakan RLS untuk activity_records agar Atasan/Supervisor dan Admin bisa membaca & menyetujui
DROP POLICY IF EXISTS "Allow select for owner and supervisor and admin" ON activity_records;
DROP POLICY IF EXISTS "Allow update for owner and supervisor and admin" ON activity_records;
DROP POLICY IF EXISTS "Allow select for owner and supervisor" ON activity_records;
DROP POLICY IF EXISTS "Allow update for owner and supervisor" ON activity_records;
DROP POLICY IF EXISTS "Users can view their own activity_records" ON activity_records;
DROP POLICY IF EXISTS "Users can update their own activity_records" ON activity_records;

CREATE POLICY "Allow select for owner, supervisor and admin" ON activity_records
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles AS subordinate
    WHERE subordinate.id = activity_records.user_id
      AND subordinate.nip_atasan = (
        SELECT nip FROM profiles WHERE id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Allow update for owner, supervisor and admin" ON activity_records
FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles AS subordinate
    WHERE subordinate.id = activity_records.user_id
      AND subordinate.nip_atasan = (
        SELECT nip FROM profiles WHERE id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles AS subordinate
    WHERE subordinate.id = activity_records.user_id
      AND subordinate.nip_atasan = (
        SELECT nip FROM profiles WHERE id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 8. Opsional: Tambah foreign key constraint jika belum ada (agar schema cache terupdate)
ALTER TABLE buku_kendali 
  DROP CONSTRAINT IF EXISTS fk_buku_kendali_profiles;

ALTER TABLE buku_kendali 
  ADD CONSTRAINT fk_buku_kendali_profiles 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- 9. Tambah kolom user_signature untuk menyimpan tanda tangan pembuat laporan
ALTER TABLE buku_kendali ADD COLUMN IF NOT EXISTS user_signature TEXT;

-- 10. Trigger untuk menghapus user dari auth.users secara otomatis saat profil dihapus dari public.profiles
CREATE OR REPLACE FUNCTION delete_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;

CREATE TRIGGER on_profile_deleted
AFTER DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION delete_auth_user();

-- Selesai! ✅



