# Learning Hub Kids — GitHub Pages

Bản **static** của Learning Hub, được chuẩn bị để đưa thẳng lên GitHub và chạy bằng **GitHub Pages**.

## Có gì trong bản này?

- Vocabulary Games: chọn từ đúng, hoàn thiện từ, nghe phát âm bằng Web Speech API.
- Vocabulary List: 10 từ mới hôm nay, flashcard, Đã thuộc, Cần học.
- Toán tư duy: mở trực tiếp file PDF `assets/toan-lop1-quyen1.pdf`.
- Tiếng Việt: 100 truyện ngắn theo lớp, đọc to và câu hỏi đọc hiểu.
- Tiến độ học được lưu bằng `localStorage` trên thiết bị của học sinh.
- Không cần Node.js, không cần server, không cần database để chạy bản GitHub Pages.

## Đưa lên GitHub Pages

1. Tạo một repository trên GitHub.
2. Upload **toàn bộ nội dung của thư mục này** vào repository, sao cho `index.html` nằm ngay ở thư mục gốc.
3. Vào **Settings → Pages**.
4. Ở **Build and deployment**, chọn **Deploy from a branch**.
5. Chọn branch `main` và folder `/ (root)` rồi Save.
6. Chờ GitHub Pages deploy, sau đó mở URL Pages của repository.

> Quan trọng: `index.html` phải nằm ở root của repository, không nằm trong thư mục `public`.

## Vì sao bản này phù hợp GitHub Pages?

GitHub Pages chỉ phục vụ file tĩnh. Vì vậy bản này đã loại bỏ Node.js server và API `/api/progress` của bản local.

Các đường dẫn đều dùng đường dẫn tương đối:

```text
styles.css
content.js
app.js
assets/toan-lop1-quyen1.pdf
```

Do đó app cũng hoạt động khi repository được publish dưới dạng project site, ví dụ `/ten-repository/`.

## Cấu trúc

```text
learning-hub-kids/
├── index.html
├── app.js
├── content.js
├── styles.css
├── .nojekyll
├── README.md
└── assets/
    └── toan-lop1-quyen1.pdf
```

## Lưu ý về dữ liệu tiến độ

Bản GitHub Pages lưu tiến độ bằng `localStorage`, nghĩa là tiến độ nằm trên trình duyệt/thiết bị của học sinh. Nếu muốn phụ huynh đăng nhập và xem tiến độ từ nhiều thiết bị, bước tiếp theo nên thêm backend/database hoặc Firebase/Supabase.

## Audio Oxford

Hiện nút nghe dùng giọng English (UK) của trình duyệt. Không nên gọi đây là audio Oxford. Có thể tích hợp audio/API có quyền sử dụng của Oxford ở bước sau mà không cần thay đổi giao diện học.
