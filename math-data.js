// Bản đồ 46 trang bài tập được cắt từ PDF Toán lớp 1 Quyển 1.
// answerKey để trống vì PDF nguồn là bản quét, không chứa đáp án máy đọc được.
// Giáo viên có thể nhập đáp án ngay trong Chế độ biên tập; dữ liệu sẽ lưu trong trình duyệt.
window.MATH_DATA = Array.from({length:46}, (_,i) => ({
  id:i+1,
  pdfPage:i+2,
  image:`assets/math/page-${String(i+2).padStart(2,'0')}.webp`,
  answerCount:6,
  answerKey:[]
}));
