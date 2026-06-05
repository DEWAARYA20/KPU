-- ============================================================
-- WAJIB DIJALANKAN di Supabase Dashboard > SQL Editor
-- Perbaikan: tambah kolom jumlah_hari_kerja ke tabel buku_kendali
-- ============================================================

-- Tambah kolom jumlah_hari_kerja ke tabel buku_kendali jika belum ada
ALTER TABLE buku_kendali ADD COLUMN IF NOT EXISTS jumlah_hari_kerja INTEGER;
