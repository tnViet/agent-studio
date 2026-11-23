# Tổng kết triển khai Agent Studio

Cập nhật: 24/11/2026. Tài liệu này thay thế bản hướng dẫn cũ (`hướng dẫn studio agent.docx`) ở những chỗ hai bản khác nhau. Mọi mục ghi "chưa xác minh" là chưa kiểm tra được trên máy thật.

## 1. Mục tiêu và phạm vi

Đồ án môn Quản lý dự án phần mềm: hệ thống quản lý một team agent AI sản xuất video ngắn (15 đến 60 giây), điều phối bằng Paperclip. Trọng tâm chấm điểm là quản lý agent, task, tiến độ, token và luồng bàn giao. Video chỉ là sản phẩm minh họa. Đề tài demo: video giải thích lý thuyết trò chơi (bài toán người tù).

Ràng buộc: Claude Pro, Copilot Student, không có GPU, chạy trên Windows. Agent chạy tuần tự, tắt heartbeat định kỳ. Quản lý token bằng số token, không bằng tiền. Key và token để trong `.env` hoặc Secrets của Paperclip, không commit.

## 2. Môi trường và phiên bản khóa

| Thành phần | Giá trị |
|---|---|
| Hệ điều hành | Windows (PowerShell và cmd) |
| Paperclip | 2026.831.1 (khóa, không chạy `paperclipai update`) |
| Claude Code | 2.1.330 |
| Node.js | 24.15.0 |
| Python | 3.12, thư viện Pillow 13.0.0 |
| FFmpeg | bản N-126374 (build 2026-08-31) |
| TTS | gói `vieneu`, chế độ Turbo chạy CPU |
| Thư mục dự án | `D:\agent-studio` (đã `git init`, có commit đầu tiên) |
| Dữ liệu Paperclip | `D:\paperclip-data` |
| Giao diện Paperclip | http://127.0.0.1:3100 |

Lệnh khởi động: `paperclipai run` (lần đầu `paperclipai onboard --yes --data-dir D:\paperclip-data`). Tắt server bằng Ctrl+C và đợi dừng hẳn trước khi đóng cửa sổ.

Lý do khóa bản 2026.831.1: các bản từ 2026.916.0 trở đi (kể cả 2026.1117.0 và nightly) bắt agent phải qua bước "Connect a model" do Paperclip quản lý, và bước đó bị lỗi trên Windows. Agent bị giữ ở trạng thái "setup" và không chạy được. Bản 831.1 không có cơ chế này, dùng thẳng đăng nhập Claude có sẵn trên máy.

## 3. Thay đổi so với tài liệu cũ

| Nội dung | Tài liệu cũ | Hiện tại | Lý do |
|---|---|---|---|
| Phiên bản Paperclip | khóa một bản | 2026.831.1 | lỗi Connect trên Windows |
| Nguồn hình | Pexels (video stock) | hình vẽ bằng code (Python và Pillow) | Pexels tạm ngừng cấp key, và hướng đi là hoạt hình |
| TTS | VieNeu-TTS-v2 | VieNeu v2 Turbo (CPU) | bản v2 đầy đủ cần GPU |
| Chuyển chặng | router trong backend theo `pipeline.json` | Producer tạo sẵn chuỗi task có quan hệ chặn (phương án tạm) | chưa có router; chuỗi task chạy được ngay |
| Quy tắc giao việc | agent con không tự giao việc | giữ nguyên cho 6 agent con; Producer được giao việc (có `canAssignTasks`) | cần chạy một mạch |
| Thời lượng cảnh | theo script | theo độ dài file giọng đọc | lời đọc ngắn hơn số giây trong script |
| Ngôn ngữ hướng dẫn agent | tiếng Việt | tiếng Anh; chỉ nội dung hiển thị là tiếng Việt có dấu | tiết kiệm token |
| Kênh chat với Producer | Discord | chưa chốt (Discord hoặc Telegram) | có plugin Telegram tương tự; chưa cài |
| Cổng duyệt | trang Studio web | task cổng trong Paperclip (tạm) | Studio web chưa làm |

## 4. Cấu trúc thư mục

```
D:\agent-studio
  CLAUDE.md             ngữ cảnh dự án cho Claude Code
  .gitignore            bỏ .env, clips/*, node_modules, __pycache__, *.log, .claude/
  .env                  khóa (không commit)
  agents/<tên>/AGENTS.md  hướng dẫn từng agent (producer, scriptwriter, director, asset, editor, reviewer, publisher)
  agents/_skills/       chỗ để skill dùng chung (chưa có skill)
  tools/                test_scene.py (vẽ cảnh thử), test_tts.py (giọng đọc thử)
  clips/<mã task>/      đầu ra từng video (không commit)
  studio/{server,web,office3d}  chưa làm
  demo/, docs/
```

Thư mục `clips/<mã task>/` chứa: `script.json`, `storyboard.json`, `audio/`, `scenes/`, `assets.json`, `final/` (4 video và `subs.ass`), `review.json`, `publish/` (4 video và `package.json`).

## 5. Cấu hình Paperclip

- Company đã tạo; project `science-clips` với thư mục local `D:\agent-studio`. Paperclip yêu cầu thư mục workspace là một git repo, nên phải `git init` và commit trước khi chạy task.
- Mọi task phải gán vào project `science-clips` để agent chạy trong đúng thư mục.
- 7 agent, cùng cấu hình: adapter Claude Code, model `claude-sonnet-5-5`, thinking effort Medium, engine Auto (ACP), Skip permissions bật, Max turns 50, heartbeat theo chu kỳ tắt, không biến môi trường. Hướng dẫn nạp từ file `agents/<tên>/AGENTS.md` (chế độ External).
- Producer: có quyền gán task, không có quyền tuyển agent, nên tắt quyền tạo/nhập skill. Các agent còn lại báo cáo cho Producer.
- Chạy không có người duyệt lệnh, nên agent có quyền chạy mọi lệnh. Giảm rủi ro bằng các điều cấm trong AGENTS.md (không tuyển agent, không đọc `.env`, chỉ làm việc trong `D:/agent-studio`). Các điều cấm này chưa được cưỡng chế bằng sandbox.

## 6. Vai trò 7 agent

| Agent | Đầu vào | Đầu ra | Bàn giao | Khi nào blocked |
|---|---|---|---|---|
| Producer | yêu cầu của người dùng | 8 task con có quan hệ chặn, comment tổng hợp | giữ task cha ở blocked | thiếu chủ đề; không tạo được task hoặc quan hệ chặn |
| Scriptwriter | chủ đề, thời lượng, giọng điệu | `script.json` (6 cảnh trong lần thử) | task done | thiếu chủ đề; không ghi được vào `clips/` |
| Director | `script.json` | `storyboard.json` (bảng màu, phần tử, hoạt ảnh) | task done | thiếu hoặc sai `script.json` |
| Asset | `script.json`, `storyboard.json` | giọng từng cảnh, video câm từng cảnh, `assets.json` | task done | thiếu đầu vào; lỗi thư viện giọng hoặc ffmpeg; một cảnh lỗi hai lần |
| Editor | `assets.json`, `audio/`, `scenes/` | 4 video trong `final/` và `subs.ass` | task done | thiếu file; ffmpeg lỗi hai lần |
| Reviewer | `final/`, `script.json`, `assets.json` | `review.json` | đạt thì done, không đạt thì blocked | thiếu file; không có ffprobe |
| Publisher | `review.json`, `final/` | thư mục `publish/` và `package.json` | task done; người dùng tự đăng | `review.json` thiếu hoặc không đạt |

Tất cả dùng adapter `claude_local`, model Sonnet. Mỗi agent nhận thư mục video qua dòng đầu mô tả task: `Video folder: clips/<mã>`. Publisher không bao giờ đăng bài (chế độ tự đăng tắt).

## 7. Luồng chạy

Producer nhận yêu cầu và tạo 8 task con theo thứ tự: Scriptwriter, cổng "Approve script", Director, Asset, Editor, Reviewer, cổng "Approve video", Publisher. Mỗi task bị chặn bởi task trước (quan hệ chặn thật), nên khi task trước done thì agent kế tiếp tự chạy. Hai cổng không giao cho agent: người dùng đặt task cổng sang done để duyệt. Muốn yêu cầu sửa thì comment vào task cha của Producer. Task cha phải để ở blocked, không đặt done, vì đóng task cha sẽ đóng luôn các task con còn mở.

Pipeline video: giọng đọc tiếng Việt, hình vẽ bằng Pillow theo độ dài giọng cộng 0,3 giây, mã hóa từng cảnh, ghép bằng concat với `-c copy`, thêm âm thanh bằng `-c:v copy`, đốt phụ đề ở bước cuối, xuất 4 tỉ lệ (9:16 là bản gốc, các bản khác co và thêm viền), kiểm tra bằng ffprobe.

## 8. Kết quả thử nghiệm

- Producer chạy được trên bản 831.1 sau khi bỏ qua màn Connect; nạp AGENTS.md qua chế độ External.
- Scriptwriter: tạo `script.json` hợp lệ, 6 cảnh, tổng 30 giây, lời đọc tiếng Việt đủ dấu, nội dung lý thuyết đúng.
- Thử riêng cảnh vẽ (5 giây, 720x1280, 30 fps) và giọng đọc (đoạn khoảng 23 âm tiết dài 5,04 giây, khoảng 4,6 âm tiết mỗi giây), rồi ghép bằng ffmpeg: đạt.
- Chạy cả chuỗi (task VIEA-7): đủ mọi file đầu ra. `review.json` ghi `passed: true`; các bản 720x1280, 1080x1080, 1080x1350, 1920x1080 đều có âm thanh, không đoạn đen, phụ đề khớp lời và đúng dấu.
- Độ lệch: video dài 18,97 giây, mục tiêu 30 giây. Reviewer chỉ ghi chú không chặn vì quy tắc kiểm tra chỉ là 15 đến 60 giây.
- Nhận xét của người dùng: hình còn đơn giản, cần thêm skill vẽ (sẽ tìm bên ngoài).

## 9. Sự cố đã gặp

| Sự cố | Nguyên nhân | Cách xử lý |
|---|---|---|
| "Could not verify the local subscription" ở bước Connect | bước kết nối do Paperclip quản lý bị chặn trên Windows (hàm mở file workspace của runner chỉ hỗ trợ Linux và macOS) | lùi về Paperclip 2026.831.1 |
| Agent kẹt "setup", task chuyển đỏ "Recovery needed" | agent bị giữ ở trạng thái setup (lifecycle hold) trên bản mới | cùng cách trên |
| `paperclipai run` báo vùng nhớ chia sẻ đang dùng | tiến trình PostgreSQL nhúng cũ còn sót | tìm theo dòng lệnh và kết thúc đúng tiến trình đó |
| "workspace_validation_failed ... has no .git" | workspace phải là git repo | `git init`, `git add .`, `git commit` |
| Producer tự đề xuất và tuyển agent trong task onboarding | hành vi mặc định khi chưa có AGENTS.md | duyệt rồi tạm dừng agent thừa; viết AGENTS.md có điều cấm; để quyền tuyển tắt |
| `cd /d` lỗi trong PowerShell | `/d` chỉ dùng trong cmd | trong PowerShell dùng `cd D:\agent-studio` |
| Pexels không cấp key mới | dịch vụ tạm ngừng | bỏ stock, vẽ hình bằng code |
| VieNeu v2 đầy đủ cần GPU | mô hình PyTorch chạy GPU | dùng bản Turbo (GGUF, CPU) |

## 10. Chưa xác minh và việc còn lại

Chưa xác minh:
- Số token từng agent và từng lần chạy (cần xem trang Costs của Paperclip); chưa chỉnh Max turns theo số liệu.
- Âm thanh VieNeu có gắn watermark mặc định hay không, và điều khoản giấy phép nếu đăng công khai.
- Cách Paperclip 2026.831.1 xử lý khi từ chối lệnh trong lúc chạy không giám sát.
- Cách ghim phiên bản Claude Code (tắt tự cập nhật) trên Windows.
- Plugin Telegram hoặc Discord có tương thích với 2026.831.1 không.

Việc còn lại, theo ưu tiên gợi ý:
1. Ghi lại số token của lần chạy VIEA-7 theo từng agent.
2. Sửa độ lệch thời lượng (video 19 giây so với mục tiêu 30 giây): hoặc yêu cầu Scriptwriter viết lời dày hơn, hoặc cho Reviewer kiểm tra độ lệch so với mục tiêu.
3. Thêm skill vẽ cho Asset (người dùng tìm bên ngoài) và cải thiện chất lượng hình.
4. Studio web: cổng duyệt kịch bản và video, tiến độ, token tách theo hãng, báo cáo.
5. Router theo `pipeline.json` thay cho chuỗi task do Producer tạo; thêm agent qua form trên Studio.
6. Chọn và nối kênh chat (Discord hoặc Telegram) với Producer.
7. Văn phòng 3D bằng three.js, làm sau cùng.
8. Cập nhật tài liệu dự án chính thức (bảng rủi ro, mô tả pipeline) theo bản này.
