# Learning Hub — Kids

Web app MVP lấy cảm hứng từ giao diện trong ảnh tham chiếu, gồm:

- **Vocabulary Games**: chọn từ đúng, hoàn thiện từ, nút nghe.
- **Vocabulary List**: 10 từ mới hôm nay, flashcard, Đã thuộc, Cần học; trạng thái lưu bằng localStorage và đồng bộ endpoint `/api/progress`.
- **Toán tư duy**: nhúng nguyên file `assets/toan-lop1-quyen1.pdf` (50 trang) để giữ nguyên nội dung bài tập gốc.
- **Tiếng Việt**: 100 câu chuyện (10 truyện/lớp × lớp 1–10), 8 câu/truyện, đọc to bằng Web Speech API và 3 câu hỏi trắc nghiệm.
- Responsive cho điện thoại/tablet/desktop.

## Chạy local

Yêu cầu Node.js 18+.

```bash
node server.js
```

Sau đó mở `http://localhost:3000`.

Không cần npm install vì server dùng Node.js built-in `http`.

## Mở rộng phát âm Oxford

UI đã tách logic âm thanh vào `speak()` và `AUDIO_CONFIG` trong `public/app.js`. Có thể thay provider trình duyệt bằng Oxford audio/API hoặc một backend proxy có license/key mà không phải sửa phần giao diện.

## Cấu trúc

- `server.js` — static server + API lưu tiến độ
- `public/index.html` — shell
- `public/styles.css` — giao diện responsive
- `public/app.js` — điều hướng và logic học
- `public/content.js` — 100 truyện + 100 từ mẫu
- `assets/toan-lop1-quyen1.pdf` — PDF Toán gốc
- `data/progress.json` — dữ liệu đồng bộ server
