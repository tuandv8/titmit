# Learning Hub — Fix v2

## Thay 2 file

Copy đè vào repository GitHub Pages hiện tại:

- `app.js`
- `styles.css`

Không cần thay `index.html`, `content.js`, `math-data.js` hay thư mục `assets/math` nếu bạn đang dùng bản GitHub Pages Fix trước đó.

## Những gì được sửa

1. Menu là overlay. Khi menu đóng, `.main` luôn có `margin-left: 0` và `width: 100%`, vì vậy nội dung tràn đầy toàn bộ màn hình.
2. Audio tiếng Anh dùng Web Speech API với ưu tiên voice `en-US` chất lượng cao có sẵn trên thiết bị/browser (Microsoft/Google/Apple tùy thiết bị), thay vì phụ thuộc đường dẫn MP3 Oxford dễ lỗi khi chạy GitHub Pages. Audio tiếng Việt dùng `vi-VN`. MDN xác nhận `speechSynthesis.getVoices()` lấy các voice mà thiết bị/browser hỗ trợ và `speak()` phát utterance.
3. Khi trả lời đúng/sai ở game, Toán và đọc hiểu: xuất hiện animation lớn giữa màn hình + âm thanh phản hồi đúng/sai bằng Web Audio API.

## Lưu ý audio

GitHub Pages là static hosting nên không nên nhúng Oxford API key. Oxford cung cấp dữ liệu audio chính thức qua Oxford Dictionaries API, nhưng API key phải được bảo vệ ở backend. Bản này ưu tiên giải pháp client-side ổn định để nút nghe hoạt động ngay trên GitHub Pages.
