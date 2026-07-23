# Deployment Rehberi

## Production Ortamı

### Gereksinimler
- Node.js v22+
- PostgreSQL (Supabase)
- PM2 process manager
- Nginx/Caddy reverse proxy
- SSL sertifikası

### Backend Deployment
```bash
cd apps/api
npm install
npx tsc
node dist/main.js
```

PM2 ile:
```bash
npm install -g pm2
pm2 start dist/main.js --name siparis-api
pm2 save
pm2 startup
```

### Frontend Deployment
```bash
cd apps/web
npm install
npm run build
npm start
```

### Nginx Yapılandırması
```nginx
server {
    listen 443 ssl;
    server_name api.siparisasistani.com;

    ssl_certificate /etc/ssl/certs/siparisasistani.crt;
    ssl_certificate_key /etc/ssl/private/siparisasistani.key;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Environment Variables
Tüm değişkenler `.env.production.example` dosyasında belirtilmiştir.
