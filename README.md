# Pasha Frontend

Bu proje [Next.js](https://nextjs.org) ile oluşturulmuş bir frontend uygulamasıdır.

## Başlangıç

Geliştirme sunucusunu çalıştırmak için:

```bash
npm run dev
# veya
yarn dev
# veya
pnpm dev
# veya
bun dev
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açarak sonucu görebilirsiniz.

## Vercel'e Deploy Etme

### 1. Vercel CLI ile Deploy

```bash
# Vercel CLI'yi yükleyin
npm i -g vercel

# Proje dizininde deploy komutunu çalıştırın
vercel

# Production deploy için
vercel --prod
```

### 2. GitHub ile Otomatik Deploy

1. Projenizi GitHub'a push edin
2. [Vercel Dashboard](https://vercel.com/dashboard)'a gidin
3. "New Project" butonuna tıklayın
4. GitHub repository'nizi seçin
5. Deploy ayarları otomatik olarak algılanacaktır
6. "Deploy" butonuna tıklayın

### 3. Environment Variables

Eğer projenizde environment variables kullanıyorsanız:

1. Vercel Dashboard'da projenizi seçin
2. "Settings" > "Environment Variables" bölümüne gidin
3. Gerekli environment variables'ları ekleyin

### Deploy Ayarları

Proje aşağıdaki ayarlarla optimize edilmiştir:

- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

### Özellikler

- ✅ Next.js 13+ App Router
- ✅ TypeScript desteği
- ✅ Tailwind CSS
- ✅ Chart.js entegrasyonu
- ✅ Heroicons
- ✅ Vercel için optimize edilmiş

## Daha Fazla Bilgi

Next.js hakkında daha fazla bilgi için:

- [Next.js Dokümantasyonu](https://nextjs.org/docs)
- [Next.js Öğrenme Rehberi](https://nextjs.org/learn)
- [Vercel Deploy Dokümantasyonu](https://nextjs.org/docs/app/building-your-application/deploying)
