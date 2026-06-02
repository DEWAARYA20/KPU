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

-- Selesai! ✅
