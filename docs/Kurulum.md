# SiparişAsistanı Kurulum Rehberi

## Gereksinimler
- Node.js v18+
- PostgreSQL (Supabase)
- NPM veya PNPM

## Adımlar

### 1. Depoyu klonla
```bash
git clone https://github.com/cemalettinozcalisan-cell/siparisasistani.git
cd siparisasistani
```

### 2. Bağımlılıkları yükle
```bash
cd apps/api
npm install
cd ../web
npm install
```

### 3. Environment değişkenlerini ayarla
```bash
cp apps/api/.env.example apps/api/.env
# .env dosyasını düzenle: SUPABASE_URL, SUPABASE_SERVICE_KEY
```

### 4. Veritabanını kur
Supabase SQL Editor'da `database/001_schema.sql`'den başlayarak tüm migration'ları sırayla çalıştır.

### 5. Backend'i başlat
```bash
cd apps/api
npm run dev
```

### 6. Frontend'i başlat
```bash
cd apps/web
npm run dev
```

### 7. Tarayıcıda aç
http://localhost:3000/login

Demo hesap: demo@siparisasistani.com / demo123
