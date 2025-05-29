# Ayana AI Chatbot

Aplikasi chatbot AI dengan dukungan multi-model (Gemini, DeepSeek, Groq) dan sistem fallback otomatis.

## Fitur

- Dukungan multi-model AI (Gemini, DeepSeek, Groq)
- Sistem fallback otomatis jika model utama gagal
- Dark mode persisten
- Upload dan analisis gambar
- Pengaturan bahasa dan gaya respons
- Penyimpanan chat lokal
- Responsif untuk desktop dan mobile

## Struktur Proyek

```
.
├── public/                   # File statis
│   ├── js/                   # JavaScript klien
│   │   └── script.js         # Script utama klien
│   ├── css/                  # Stylesheet
│   └── script/               # Script server
│       ├── aiService.js      # Layanan AI
│       ├── api.js            # Konfigurasi API
│       ├── logger.js         # Utilitas logging
│       └── routes.js         # Rute API
├── views/                    # Template HTML
│   └── components/           # Komponen UI
├── oi1/                      # Komponen input message
├── settings0/                # Konfigurasi sistem
├── uploads/                  # File yang diupload
├── logs/                     # Log aplikasi
├── kunci_jawi.json           # Kunci API (jangan commit ke repo)
├── server.js                 # Entry point aplikasi
└── package.json              # Dependensi npm
```

## Instalasi

1. Clone repositori
2. Install dependensi: `npm install`
3. Salin `kunci_jawi.example.json` ke `kunci_jawi.json` dan isi dengan API key Anda
4. Jalankan server: `npm start`

## Konfigurasi API

File `kunci_jawi.json` digunakan untuk menyimpan kunci API. Format:

```json
{
  "gemini": {
    "konci_rahasia": "YOUR_GEMINI_API_KEY",
    "kuncine_url": "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent"
  },
  "deepseek": {
    "konci_rahasia": "YOUR_DEEPSEEK_API_KEY",
    "kuncine_url": "https://api.deepseek.com/v1/chat/completions"
  },
  "groq": {
    "konci_rahasia": "YOUR_GROQ_API_KEY",
    "kuncine_url": "https://api.groq.com/openai/v1/chat/completions"
  }
}
```

## Pengembangan

- Server: Node.js + Express
- Frontend: HTML, CSS, JavaScript (Vanilla)
- Penyimpanan: LocalStorage untuk chat dan pengaturan

## Lisensi

MIT 