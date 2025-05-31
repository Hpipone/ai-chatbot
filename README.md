# Ayana AI Chatbot

Aplikasi chatbot AI dengan dukungan multi-model dan sistem fallback otomatis.

## Fitur

- Dukungan multi-model AI (Gemini, DeepSeek, Groq)
- Sistem fallback otomatis jika model utama gagal
- Dark mode persisten
- Upload dan analisis gambar
- Pengaturan bahasa dan gaya respons
- Penyimpanan chat lokal
- Responsif untuk desktop dan mobile

## Instalasi

1. Clone repositori
2. Install dependensi: `npm install`
3. Salin `konci_jawi.example.json` ke `kuonci_jawi.json` dan isi dengan API key Anda
4. Jalankan server: `npm start`

## Konfigurasi API

File `konci_jawi.json` digunakan untuk menyimpan kunci API. Format:

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

## Lisensi

MIT 
