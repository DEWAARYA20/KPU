-- ============================================================
-- WAJIB DIJALANKAN di Supabase Dashboard > SQL Editor
-- Perbaikan: tambah kolom jumlah_hari_kerja ke tabel buku_kendali
-- ============================================================

-- Tambah kolom jumlah_hari_kerja ke tabel buku_kendali jika belum ada
ALTER TABLE buku_kendali ADD COLUMN IF NOT EXISTS jumlah_hari_kerja INTEGER;

-- ============================================================
-- KEBIJAKAN DELETE untuk buku_kendali
-- Agar atasan/admin bisa menghapus dokumen bawahan
-- ============================================================

-- Hapus kebijakan lama jika sudah ada
DROP POLICY IF EXISTS "buku_kendali_delete_policy" ON buku_kendali;

-- Buat kebijakan HAPUS (DELETE): pemilik ATAU atasan langsung ATAU admin/secretary/head
CREATE POLICY "buku_kendali_delete_policy" ON buku_kendali
FOR DELETE
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
