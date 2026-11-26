# Tiếp tục (cập nhật 2026-11-25)

## 1. Lưu ý quan trọng

- Paperclip phải dùng bản cũ 2026.831.1. Không chạy `paperclipai update`, kể cả khi màn hình báo "Update available: 2026.1117.0" (đó chỉ là thông báo, bản mới bị lỗi Connect a model trên Windows).
- Kiểm tra phiên bản: `paperclipai --version` phải ra `2026.831.1`.
- Luôn chạy kèm thư mục dữ liệu: `paperclipai run --data-dir D:\paperclip-data`. Thiếu `--data-dir` thì Paperclip mở bản cài cũ ở `C:\Users\ngocv\.paperclip` (company AGE, chỉ có Producer).
- Không chạy `paperclipai onboard` lại. Không xóa `D:\paperclip-data`.
- `.env` không commit, không dán vào chat.

## 2. Bật hệ thống (3 cửa sổ PowerShell, theo thứ tự)

Cửa sổ 1, Paperclip:
```
cd D:\agent-studio
paperclipai run --data-dir D:\paperclip-data
```
Đợi mở được http://127.0.0.1:3100. Đầu log, dòng Database phải nằm trong `D:\paperclip-data`.

Cửa sổ 2, bot Discord:
```
cd D:\agent-studio\studio\server
node bot.js
```
Thấy "Bot san sang" và "Thong bao: gui vao kenh ..." (nếu đã thêm DISCORD_NOTIFY_CHANNEL_ID).

Cửa sổ 3, Studio web:
```
cd D:\agent-studio\studio\server
node web.js
```
Mở http://127.0.0.1:4000 (danh sách video), /progress (duyệt và xử lý task), /office (văn phòng 3D), /tokens.

Sửa file .js thì phải Ctrl+C rồi chạy lại `node web.js` hoặc `node bot.js` mới có hiệu lực.

Tắt: Ctrl+C lần lượt cửa sổ 3, 2, 1, đợi về dấu nhắc lệnh rồi mới đóng.

## 3. Việc cần làm tiếp (cập nhật 25/11 tối)

1. Chạy thử trên Paperclip thật: `brief.md`, vòng sửa tự động, chế độ tự vẽ (giao video về giao thoa sóng). Trước đó kiểm tra numpy: `python -c "import numpy"`.
2. Gắn 9 skill trong `agents/_skills` vào agent trên Paperclip (xem mục 10b tài liệu tổng kết), rồi chạy thử cùng video giao thoa sóng. AGENTS.md đã viết lại ngày 26/11, bản cũ ở `docs/backup-2026-11-26-agents/`.
3. Discord: chạy lại `node deploy-commands.js` (lệnh `/video` giờ mở form có ô yêu cầu dài), rồi khởi động lại `node bot.js` và `node web.js`. Thử bấm nút Duyệt và Yêu cầu sửa trên tin nhắn chờ duyệt (mục 7g tài liệu tổng kết).
4. Commit git khi hệ thống ổn.
5. Để sau: tự đăng TikTok, kịch bản demo và tổng duyệt, cải thiện hình ảnh video.

Đã bỏ: đổi kho hình (giữ Noto), đặt `maxConcurrentRuns`, hạn mức token, ước lượng so với thực tế, form "Thêm agent", router riêng, `pipeline.json`, báo cáo và chỉ số, timeout agent.

Ghi chú: AGENTS.md đang ở chế độ External, Paperclip đọc thẳng file nên sửa file là có hiệu lực, không cần import. Scriptwriter và Director đã chuyển sang Opus.

## 4. Đã làm (24 đến 25/11)

- Studio web: xem kịch bản, giọng, cảnh, video; mục "Chờ bạn duyệt" có nút duyệt; token theo video, agent, hãng; giao diện kiểu Claude.
- Văn phòng 3D thiên đình (tab Văn phòng): 8 nhân vật, mây, cầu, đồ cổ trang, vườn đào có tiệc; panel chọn agent, xem task bất kỳ, giao việc mới, tin nhắn theo task.
- Bot Discord: `/video` và thông báo tiến độ; video hoàn thành có khung riêng kèm file.
- Kho 1.308 emoji 3D Noto, font Be Vietnam Pro, công cụ `render_scenes.py`, `make_voice.py`, tài liệu `tools/STORYBOARD.md`.
- AGENTS.md: Scriptwriter (độ dài lời đọc, in kịch bản vào comment), Reviewer (lệch thời lượng, kiểm tra hình), Director và Asset viết lại, Editor (kiểu phụ đề), cả 7 có mục gửi comment qua file UTF-8.
- Chi tiết: `docs/tong-ket-trien-khai.md`, mục 7b và 7c.

Thêm 25/11 chiều: tab Tiến độ (`/progress`) để duyệt và xử lý task, chat mới ở văn phòng 3D, nút phát cảnh, trang Token có biểu đồ. Chi tiết: `docs/tong-ket-trien-khai.md` mục 7d.

Thêm 25/11 tối: `brief.md`, vòng sửa tự động sau Reviewer, chế độ tự vẽ cho Asset (`tools/drawings/`). Chi tiết: mục 7e, 7f.

## 5. Còn lại sau đó

Xem mục 3.

## 6. Khi mở chat mới

Chat mới trong Project QLDAPM, nói: "Tiếp tục theo tiep-tuc-ngay-mai.md", kèm kết quả bước 3 và 5.
