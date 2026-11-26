# Tổng kết triển khai Agent Studio

Cập nhật: 26/11/2026. Tài liệu này thay thế bản hướng dẫn cũ (`hướng dẫn studio agent.docx`) ở những chỗ hai bản khác nhau. Mọi mục ghi "chưa xác minh" là chưa kiểm tra được trên máy thật.

## 1. Mục tiêu và phạm vi

Đồ án môn Quản lý dự án phần mềm: hệ thống quản lý một team agent AI sản xuất video ngắn (30 giây đến 5 phút), điều phối bằng Paperclip. Trọng tâm chấm điểm là quản lý agent, task, tiến độ, token và luồng bàn giao. Video chỉ là sản phẩm minh họa. Đề tài demo: video giải thích lý thuyết trò chơi (bài toán người tù, bài toán 100 tù nhân).

Ràng buộc: Claude Pro, Copilot Student, không có GPU, chạy trên Windows. Agent được chạy nhiều task cùng lúc (giới hạn bằng `maxConcurrentRuns`), tắt heartbeat định kỳ. Quản lý token bằng số token, không bằng tiền; số token hiển thị ở trang `/tokens` của Studio web. Key và token để trong `.env` hoặc Secrets của Paperclip, không commit.

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
| Thư mục dự án | `D:\agent-studio` (git, có commit đầu tiên; phần sau commit riêng) |
| Dữ liệu Paperclip | `D:\paperclip-data` |
| Giao diện và API Paperclip | http://127.0.0.1:3100 (chế độ local_trusted, gọi từ localhost không cần token) |

Khởi động: `paperclipai run --data-dir D:\paperclip-data` (thiếu `--data-dir` thì Paperclip mở bản cài mặc định cũ ở `C:\Users\ngocv\.paperclip`, company AGE chỉ có Producer). Bot Discord: `cd D:\agent-studio\studio\server` rồi `node bot.js` (sau khi Paperclip đã chạy). Tắt: Ctrl+C từng cửa sổ, đợi về dấu nhắc lệnh rồi mới đóng. Lần đầu mới cần `paperclipai onboard --yes --data-dir D:\paperclip-data`.

Lý do khóa bản 2026.831.1: các bản từ 2026.916.0 trở đi (kể cả 2026.1117.0 và nightly) bắt agent phải qua bước "Connect a model" do Paperclip quản lý, và bước đó bị lỗi trên Windows. Agent bị giữ ở trạng thái "setup" và không chạy được. Bản 831.1 không có cơ chế này, dùng thẳng đăng nhập Claude có sẵn trên máy.

## 3. Thay đổi so với tài liệu cũ

| Nội dung | Tài liệu cũ | Hiện tại | Lý do |
|---|---|---|---|
| Phiên bản Paperclip | khóa một bản | 2026.831.1 | lỗi Connect trên Windows |
| Nguồn hình | Pexels (video stock) | kho 1.308 emoji 3D Noto + công cụ dựng cảnh cố định `tools/render_scenes.py` (Pillow, ffmpeg) | Pexels ngừng cấp key; bản vẽ tự do chỉ ra khối vuông, tốn token, chất lượng không đều |
| TTS | VieNeu-TTS-v2 | VieNeu v2 Turbo (CPU) | bản v2 đầy đủ cần GPU |
| Chuyển chặng | router trong backend theo `pipeline.json` | Producer tạo sẵn chuỗi task có quan hệ chặn (phương án tạm) | chưa có router; chuỗi task chạy được ngay |
| Quy tắc giao việc | agent con không tự giao việc | giữ nguyên cho 6 agent con; Producer được giao việc (có `canAssignTasks`) | cần chạy một mạch |
| Thời lượng cảnh | theo script | theo độ dài file giọng đọc | lời đọc ngắn hơn số giây trong script |
| Ngôn ngữ hướng dẫn agent | tiếng Việt | tiếng Anh; chỉ nội dung hiển thị là tiếng Việt có dấu | tiết kiệm token |
| Kênh chat với Producer | plugin paperclip-plugin-discord | bot Discord tự viết (discord.js), lệnh `/video` tạo task trực tiếp qua API Paperclip | plugin không có lệnh tạo task, cần secret UUID, chưa xác minh tương thích với 831.1 |
| Cổng duyệt | trang Studio web | vẫn là task cổng trong Paperclip; duyệt ở mục "Chờ bạn duyệt" trên trang chủ Studio web (hiện kịch bản hoặc video, nút Duyệt, ô yêu cầu sửa) | đọc và duyệt ở một chỗ |
| Chạy agent | tuần tự | mỗi agent chạy được nhiều task cùng lúc; đề xuất `maxConcurrentRuns` 2 đến 3 (chưa thử) | người dùng muốn giao nhiều video cùng lúc; rủi ro hết quota Pro nhanh hơn, tranh CPU khi TTS và FFmpeg chạy song song |
| Nơi duyệt và xử lý task | Paperclip và trang Duyệt | tab Tiến độ của Studio web: duyệt 2 cổng, đọc kịch bản trước khi duyệt, duyệt task đang chờ xét, chạy lại task bị chặn, đóng video; Paperclip chỉ để cấu hình và thêm agent | làm việc ở một chỗ |
| Model | Sonnet cho mọi agent, không dùng Opus | Scriptwriter và Director dùng Opus (`claude-opus-5-5`), 5 agent còn lại Sonnet | chất lượng kịch bản và storyboard quyết định chất lượng video; rủi ro hết quota Pro nhanh hơn |
| Thêm agent | form "Thêm agent" trên Studio web, `pipeline.json` | thêm và quản lý agent trực tiếp trong Paperclip; bỏ form | giảm việc, Paperclip đã đủ |
| Hạn mức token, ước lượng | hạn mức mỗi task, ước lượng so với thực tế (F6) | bỏ; chỉ theo dõi số token trên trang Token | không cần cho demo |
| Ghi chú cho cả nhóm | `brief.md` do Producer viết | Producer viết `clips/<mã>/brief.md` (chủ đề, thời lượng, giọng điệu, ghi chú chung, ghi chú theo từng vai); mọi agent đọc trước khi làm; người dùng comment vào task cha thì Producer cập nhật | trước đó chỉ Scriptwriter nhận được yêu cầu của người dùng |
| Làm lại sau Reviewer | router trả về đúng chặng, tối đa 2 lần | Reviewer ghi lỗi theo chặng vào `review.json` và comment `REVIEW FAILED` vào task cha; Producer tạo vòng sửa "Fix round N: <chặng>" từ chặng sớm nhất có lỗi đến Editor, rồi "Review round N"; tối đa 2 vòng; đạt thì Producer đặt task Review gốc sang done để mở cổng duyệt video | chưa có router; Producer thể hiện vai trò quản lý |
| Cách làm hình | stock video | mỗi cảnh chọn `mode`: `asset` (kho emoji Noto) hoặc `draw` (hình mô phỏng do code vẽ: sóng, giao thoa, đồ thị...); Director quyết từng cảnh; Asset làm cả hai (không thêm agent mới); hình tự vẽ lưu ở `tools/drawings/` để dùng lại | kho hình không thể hiện được hiện tượng vật lý |
| Thông báo | không có | bot Discord báo vào kênh `DISCORD_NOTIFY_CHANNEL_ID` (`studio/server/notify.js`) | người dùng không phải mở Paperclip để theo dõi |

## 4. Cấu trúc thư mục

```
D:\agent-studio
  CLAUDE.md             ngữ cảnh dự án cho Claude Code
  .gitignore            bỏ .env, clips/*, node_modules, __pycache__, *.log, .claude/
  .env                  khóa (không commit, không dán vào chat)
  agents/<tên>/AGENTS.md  hướng dẫn từng agent (producer, scriptwriter, director, asset, editor, reviewer, publisher)
  agents/_skills/       9 skill tự viết (26/11), mỗi skill một thư mục có SKILL.md
  tools/                render_scenes.py (dựng cảnh), make_voice.py (giọng đọc), STORYBOARD.md (định dạng storyboard v2),
                        assets/ (icons 1308 WebP, icons_index.json, fonts Be Vietnam Pro, giấy phép), drawings/ (hình tự vẽ)
  clips/<mã task>/      đầu ra từng video (không commit); clips/_chat/ là file tạm agent dùng để gửi comment chat
  studio/server/        bot Discord (bot.js, deploy-commands.js, notify.js), Studio web (web.js, cổng 4000),
                        public/ (office.js, world.js, characters.js, gallery.html cho văn phòng 3D)
  docs/                 tong-ket-trien-khai.md (bản chính), tiep-tuc-ngay-mai.md
```

Dọn ngày 26/11/2026: đã xóa bản zip kho hình cũ, các thư mục `docs/backup-*`, `agents/_old/`, `web_old.js`, `web_v2.js`, `test_scene.py`, `test_tts.py`, `make_assets.py`, ảnh `Claude outputs/`, thư mục rỗng `demo/`, `studio/web/`, `studio/office3d/`, file `.md` trùng ở thư mục gốc. Không còn bản lưu cũ để quay lại; muốn quay lại thì phải commit git trước mỗi lần sửa.

Thư mục `clips/<mã task>/` chứa: `script.json`, `storyboard.json`, `audio/`, `scenes/`, `assets.json`, `final/` (4 video và `subs.ass`), `review.json`, `publish/` (4 video và `package.json`).

Các khóa trong `.env` (chỉ ghi tên): DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID, DISCORD_ALLOWED_USER_IDS, PAPERCLIP_API_BASE, PAPERCLIP_COMPANY_ID, PAPERCLIP_PROJECT_ID, PAPERCLIP_PRODUCER_ID, PAPERCLIP_DATA_DIR, PAPERCLIP_BOARD_TOKEN, PIXABAY_API_KEY (không còn dùng).

## 5. Cấu hình Paperclip

- Company đã tạo; project `science-clips` với thư mục local `D:\agent-studio`. Paperclip yêu cầu thư mục workspace là một git repo, nên phải `git init` và commit trước khi chạy task.
- Mọi task phải gán vào project `science-clips` để agent chạy trong đúng thư mục.
- 7 agent, cùng cấu hình: adapter Claude Code, model `claude-sonnet-5-5` (Scriptwriter và Director: `claude-opus-5-5` từ 25/11), thinking effort Medium, engine Auto (ACP), Skip permissions bật, Max turns 50, heartbeat theo chu kỳ tắt. Hướng dẫn nạp từ file `agents/<tên>/AGENTS.md` (chế độ External). Scriptwriter hiển thị timeoutSec 0 và maxConcurrentRuns 20 (ý nghĩa chưa xác minh; dự định đặt timeout).
- Producer: có quyền gán task, không có quyền tuyển agent, nên tắt quyền tạo/nhập skill. Các agent còn lại báo cáo cho Producer.
- Chạy không có người duyệt lệnh, nên agent có quyền chạy mọi lệnh. Giảm rủi ro bằng các điều cấm trong AGENTS.md (không tuyển agent, không đọc `.env`, chỉ làm việc trong `D:/agent-studio`). Các điều cấm này chưa được cưỡng chế bằng sandbox.

## 6. Vai trò 7 agent

| Agent | Đầu vào | Đầu ra | Bàn giao | Khi nào blocked |
|---|---|---|---|---|
| Producer | yêu cầu của người dùng | 8 task con có quan hệ chặn, comment tổng hợp | giữ task cha ở blocked | thiếu chủ đề; không tạo được task hoặc quan hệ chặn |
| Scriptwriter | chủ đề, thời lượng, giọng điệu | `script.json` (cảnh 5 đến 10 giây, tối đa 30 cảnh) | task done | thiếu chủ đề; không ghi được vào `clips/` |
| Director | `script.json`, `tools/STORYBOARD.md` | `storyboard.json` v2: hình từ kho, chuyển động, máy quay; đã qua `--check` và `--preview` | task done | thiếu hoặc sai `script.json`; công cụ lỗi |
| Asset | `script.json`, `storyboard.json`, `brief.md` | giọng, video câm từng cảnh, `assets.json` (ghi mode từng cảnh), `preview.png`; cảnh `draw` chưa có hình thì viết `clips/<mã>/drawings/<tên>.py` từ `_template.py`, thử tối đa 3 lần, hình dùng chung được thì chép vào `tools/drawings/` | task done | `--check` báo lỗi; lỗi giọng hoặc ffmpeg; công cụ lỗi hai lần; hình tự vẽ hỏng sau 3 lần ("Drawing failed") |
| Editor | `assets.json`, `audio/`, `scenes/` | 4 video trong `final/` và `subs.ass` | task done | thiếu file; ffmpeg lỗi hai lần |
| Reviewer | `final/`, `script.json`, `assets.json` | `review.json` | đạt thì done, không đạt thì blocked | thiếu file; không có ffprobe |
| Publisher | `review.json`, `final/` | thư mục `publish/` và `package.json` | task done; người dùng tự đăng | `review.json` thiếu hoặc không đạt |

Tất cả dùng adapter `claude_local`; Scriptwriter và Director dùng Opus, các agent khác dùng Sonnet. Mỗi agent nhận thư mục video qua dòng đầu mô tả task: `Video folder: clips/<mã>`. Publisher không bao giờ đăng bài (chế độ tự đăng tắt). Quy tắc mới của Scriptwriter: nếu chủ đề có nhiều nghĩa phổ biến thì chọn nghĩa khả dĩ nhất và nói rõ lựa chọn ở dòng đầu comment (bằng tiếng Việt).

## 7. Luồng chạy

Người dùng gõ `/video` trên Discord (chỉ tài khoản trong danh sách cho phép). Bot kiểm tra, tạo task "Video: <chủ đề>" giao cho Producer trong project `science-clips` và trả mã task. Producer tạo 8 task con theo thứ tự: Scriptwriter, cổng "Approve script", Director, Asset, Editor, Reviewer, cổng "Approve video", Publisher. Mỗi task bị chặn bởi task trước (quan hệ chặn thật), nên khi task trước done thì agent kế tiếp tự chạy. Hai cổng không giao cho agent: người dùng đặt task cổng sang done để duyệt. Muốn yêu cầu sửa thì comment vào task cha của Producer. Task cha phải để ở blocked, không đặt done, vì đóng task cha sẽ đóng luôn các task con còn mở.

Lệnh `/video`: tham số topic (bắt buộc, tối đa 200 ký tự), duration (30 đến 300 giây), tone (tối đa 100 ký tự). Lệnh được đăng ký theo server nên có hiệu lực ngay. Bot trả lời trong 3 giây bằng deferReply rồi editReply. Slash command không cần Message Content Intent.

Pipeline video: giọng đọc tiếng Việt (`make_voice.py`), dựng cảnh bằng `render_scenes.py` từ storyboard v2 và kho emoji 3D, độ dài cảnh bằng giọng cộng 0,3 giây, 22% dưới cùng để trống cho phụ đề, mã hóa từng cảnh, ghép bằng concat với `-c copy`, thêm âm thanh bằng `-c:v copy`, đốt phụ đề ở bước cuối (font Be Vietnam Pro qua `fontsdir=tools/assets/fonts`, kiểu phụ đề ghi trong AGENTS.md của Editor), xuất 4 tỉ lệ (9:16 là bản gốc, các bản khác co và thêm viền), kiểm tra bằng ffprobe.

## 7b. Studio web (24/11/2026)

Chạy: `cd D:\agent-studio\studio\server` rồi `node web.js`, mở http://127.0.0.1:4000. Chỉ nghe trên 127.0.0.1. Đọc trực tiếp thư mục `clips/` và gọi API Paperclip (không cần token ở chế độ local_trusted). Tên thư mục trong `clips/` phải trùng mã task cha (VIEA-xx).

| Trang | Nội dung |
|---|---|
| `/` | danh sách video trong `clips/` |
| `/clip/<mã>` | kịch bản dạng bảng, nghe giọng từng cảnh, xem từng cảnh, video cuối, bảng tiến độ 8 task con, nút Duyệt ở 2 cổng, ô yêu cầu sửa, nút đóng task cha, token của cả cây task, kết quả Reviewer |
| `/tokens` | token theo agent và theo hãng/model (input, input từ cache, output, số lần chạy) |
| `/office` | văn phòng 3D thiên đình (three.js 0.170 tải từ jsDelivr): agent đang làm ngồi niệm chú ở văn phòng, rảnh thì ra vườn đào; trên đầu hiện task và tiến độ video; bấm vào agent mở panel thông tin và chat; Tôn Ngộ Không xuất hiện ở Nam Thiên Môn khi có task bị chặn hoặc agent báo lỗi; cuộn thư bay giữa hai văn phòng khi bàn giao |
| `/public/gallery.html` | trang xem 8 nhân vật để chỉnh `public/characters.js` |

Văn phòng 3D: nhân vật dựng bằng code trong `studio/server/public/characters.js` (gán agent qua bảng `CHARACTERS`, agent mới tự thành Thiên binh), cảnh trong `world.js` (vị trí các khu ở `LAYOUT`), điều khiển trong `office.js`. Chat với agent là comment trên task agent đang làm (hoặc task gần nhất đã xong hoặc bị chặn, không chat vào task đang chờ để tránh đánh thức agent chạy sớm); comment đánh thức agent nên tốn token. API thêm: `GET /api/companies/<id>/agents`, `GET /api/companies/<id>/live-runs`, `GET /api/issues/<mã>/comments` (đã đối chiếu mã nguồn). Đã chạy thử với Paperclip giả lập.

API Paperclip 2026.831.1 đã đối chiếu trong mã nguồn gói `@paperclipai/server` (chưa gọi thử trên máy thật):
- `GET /api/issues/<mã>`: lấy task theo mã VIEA-xx hoặc UUID.
- `GET /api/companies/<companyId>/issues?parentId=<uuid>`: task con, trả về mảng.
- `PATCH /api/issues/<mã>` với `{"status":"done"}`: duyệt cổng, đóng task cha.
- `POST /api/issues/<mã>/comments` với `{"body":"..."}`: yêu cầu sửa, gửi vào task cha.
- `GET /api/issues/<mã>/cost-summary`: token của cả cây task (inputTokens, cachedInputTokens, outputTokens, runCount, runtimeMs).
- `GET /api/companies/<companyId>/costs/by-agent` và `/costs/by-provider`: token theo agent và theo hãng/model.

Quy tắc trong web.js: chỉ duyệt được task có tiêu đề chứa "Approve script" hoặc "Approve video", thuộc đúng video đó, và khi task ngay trước đã done; chỉ đóng task cha khi mọi task con đã done; chặn nút bấm gửi từ trang web khác (kiểm tra Origin); chặn đường dẫn ra ngoài `clips/`. Đã chạy thử với Paperclip giả lập, chưa chạy với Paperclip thật.

Sửa AGENTS.md (24/11/2026): Scriptwriter phải viết khoảng duration_sec x 4,5 âm tiết mỗi cảnh, số cảnh theo 4 đến 8 giây một cảnh; Reviewer thêm kiểm tra số 7 (lệch quá 20% so với target_sec thì blocked). Lý do: VIEA-16 chỉ dài 20,66 giây so với mục tiêu 30 giây vì lời đọc ngắn.

## 7c. Bổ sung ngày 25/11/2026

- Trang chủ Studio web có mục "Chờ bạn duyệt": tự tìm cổng đang chờ (task ngay trước đã xong), hiện toàn bộ kịch bản hoặc video cuối, nút "Duyệt, cho chạy tiếp", ô gửi yêu cầu sửa cho Producer. Khi Paperclip từ chối, trang hiện nguyên văn lỗi.
- Scriptwriter in toàn bộ kịch bản vào comment (mỗi cảnh một dòng).
- 7 AGENTS.md có mục "Posting comments": ghi nội dung comment ra file UTF-8 rồi gửi bằng `curl --data-binary @file`, vì Windows làm hỏng dấu tiếng Việt trong dòng lệnh (chưa kiểm chứng đã hết lỗi).
- Văn phòng 3D: mây nhiều lớp, cầu cong nối vườn đào với từng văn phòng, điện Lăng Tiêu, Nam Thiên Môn; đồ cổ trang (bút lông, sách, thẻ tre, giấy thư pháp, câu đối tiếng Việt, thảm đỏ, đèn lồng); vườn đào có bàn tiệc, hoa quả, trà. Agent đi qua cầu. Panel: mặc định chọn Producer, hàng nút chuyển agent, danh sách 30 task bấm để xem tin nhắn, form giao video mới (Producer) hoặc giao việc riêng (agent khác) qua `POST /api/task`. Đã bỏ phần token trong panel.
- Bot Discord gửi thông báo vào kênh: việc mới, Producer chia việc, từng bước xong, bị chặn, chờ duyệt (nhắc tên), video hoàn thành (khung nổi bật kèm file 9:16, token). Trạng thái đã báo lưu ở `studio/server/notify-state.json` (đã thêm vào .gitignore). Cần thêm `DISCORD_NOTIFY_CHANNEL_ID` vào `.env`; bot cần quyền Attach Files để gửi video.
- `maxConcurrentRuns` (đã đối chiếu mã nguồn): số lượt một agent chạy cùng lúc, lượt dư xếp hàng. Quyết định 25/11: vẫn cho chạy song song; đề xuất 2 đến 3 thay vì 20 để không quá tải (chưa thử). Producer chưa luân chuyển việc được vì mỗi vai chỉ có một agent.
- Hướng hình ảnh mới: kho emoji 3D Noto (README ghi hình theo Apache 2.0; ghi nguồn "Emoji: Noto Emoji (Google)" khi đăng), công cụ `render_scenes.py` (`--find`, `--check`, `--preview`), `make_voice.py` (chưa chạy thử vì môi trường thử không có `vieneu`). Viết lại AGENTS.md của Director và Asset; Editor thêm kiểu phụ đề; Reviewer thêm kiểm tra 8 (có hình, không cắt mép). Đã dựng thử video mẫu 3 cảnh trong môi trường thử, chưa chạy trên Windows.

## 7d. Studio web, bản 25/11/2026 chiều

Bản cũ lưu ở `docs/backup-2026-11-25/` (web.js, office.js, 7 AGENTS.md).

- Tab mới `/progress` (Tiến độ): mục Chờ bạn duyệt (cổng kịch bản hiện toàn bộ kịch bản từng cảnh, cổng video hiện video và kết quả Reviewer; task đang chờ xét có nút Duyệt), mục Task bị chặn (hiện comment cuối của agent làm lý do, ô ghi chú, nút "Gửi và chạy lại" = gửi comment rồi chuyển task về todo), mục Video đang làm (dải 8 bước kèm tên agent, nút Duyệt trên cổng, nút Đóng video khi xong hết), Việc khác đang chạy, Video đã xong. Trang chủ chỉ còn dòng báo số việc chờ duyệt. Thông báo "chờ duyệt" trên Discord trỏ tới `/progress`.
- Văn phòng 3D: panel rộng 540px; hàng agent một hàng, chip to hơn, cuộn ngang (lăn chuột được); lịch sử task chữ nhỏ, hiện 5 task, nút "Xem tất cả"; khung chat mặc định là đoạn chat mới: tin đầu tiên tạo task "Chat: ..." giao cho agent đang chọn (tin nằm trong mô tả, sau dòng `---`), các tin sau là comment trên task đó; nút "+ Đoạn chat mới"; bấm task trong lịch sử để mở lại đoạn chat cũ.
- 7 AGENTS.md thêm mục "Chat tasks": task có tiêu đề bắt đầu bằng "Chat:" thì chỉ trả lời một comment tiếng Việt rồi đặt done; Producer được tạo task "Video: ..." mới nếu người dùng nhờ làm video. AGENTS.md ở chế độ External nên Paperclip đọc thẳng file, không cần import lại.
- Trang video: bấm vào hình từng cảnh để phát video cảnh và giọng đọc cùng lúc, bấm lần nữa để dừng.
- Trang Token: số tổng (gồm token trung bình mỗi video, token ngoài video), biểu đồ thanh xếp chồng input / cache / output theo video, theo từng bước trong video (phần của Producer = tổng cây task trừ các task con), theo agent; bảng số đi kèm; bảng theo hãng và model.
- Thời lượng video đổi từ 15–60 giây thành 30–300 giây: form Văn phòng, `web.js`, lệnh `/video` (`deploy-commands.js`, phải chạy lại `node deploy-commands.js`), Scriptwriter (cảnh 5 đến 10 giây, tối đa 30 cảnh), Reviewer (kiểm tra 3), Asset (tổng tối đa 300 giây). Rủi ro: video dài tốn nhiều token hơn ở Scriptwriter và Director, TTS chạy CPU lâu, Director có thể vượt Max turns 50.
- Đã chạy thử với Paperclip giả lập, chưa chạy với Paperclip thật. Chưa xác minh: comment trên task đã done có đánh thức agent không; chuyển task blocked về todo có đánh thức agent không.

## 7e. brief.md và vòng sửa tự động (25/11/2026 tối)

Bản cũ của 7 AGENTS.md: `docs/backup-2026-11-25e/`.

- Producer: viết `brief.md` trước khi tạo task con; mọi task con có 2 dòng đầu `Video folder: ...` và `Read .../brief.md first.`. Khi có comment trên task cha: `REVIEW FAILED` thì tạo vòng sửa; `REVIEW PASSED` thì đặt task Review gốc sang done; comment của người dùng thì trả lời, ghi vào `brief.md`, và nếu chặng đó đã xong mà người dùng yêu cầu sửa thì tạo vòng sửa. Kịch bản chỉ sửa được trước khi duyệt cổng kịch bản.
- Vòng sửa bắt đầu ở chặng S (Director, Asset hoặc Editor) gồm task sửa cho S và mọi chặng sau đến Editor, nối bằng quan hệ chặn, rồi "Review round N". Ví dụ lỗi ở cảnh (Asset): Fix Asset → Fix Editor → Review round 2, nên Editor luôn được đánh thức để dựng lại video.
- Lỗi thuộc Scriptwriter (nội dung) không sửa tự động: Producer báo người dùng.
- Director, Asset, Editor, Scriptwriter có mục "Rework tasks"; Reviewer ghi `round` và lỗi dạng `{stage, scenes, problem}`.
- Studio web không phải sửa: dải bước hiện thêm các task sửa; cổng "Approve video" vẫn chặn bởi task Review gốc nên mở khi Producer đặt task đó sang done.
- Chưa xác minh: comment của agent trên task cha có đánh thức Producer không; Producer đặt task Review gốc từ blocked sang done có được Paperclip cho phép không.

## 7f. Chế độ tự vẽ (25/11/2026 tối)

Bản cũ: `docs/backup-2026-11-25f/` (render_scenes.py, STORYBOARD.md, web.js, AGENTS.md của Director, Asset, Reviewer, Scriptwriter).

- `render_scenes.py`: cảnh `"mode": "draw"` với `drawing` (tên hình), `params`, và `draw_brief` khi hình chưa có. Công cụ tìm `clips/<mã>/drawings/<tên>.py` trước, rồi `tools/drawings/<tên>.py`; gọi `draw(frame, t, sec, duration, params)` cho từng khung, rồi vẽ `elements` lên trên. Độ dài cảnh, kích thước, 30 fps, mã hóa vẫn do công cụ quản lý. Lệnh mới `--drawings [từ]` liệt kê thư viện. `--check` ghi NOTE cho hình chưa viết; `--preview` hiện chữ tạm; dựng cảnh thì báo lỗi nếu hình chưa viết. `assets.json` ghi `mode` và `drawing`.
- Thư viện `tools/drawings/`: `_template.py` (khung mẫu và quy tắc), `interference.py` (giao thoa từ các nguồn điểm, mỗi nguồn bắt đầu ở thời điểm riêng), `wave.py` (hai sóng chạy ngược chiều gặp nhau, đường tổng), `README.md` (danh sách).
- Director chọn `asset` hay `draw` cho từng cảnh, dùng lại hình có sẵn bằng `params`, hình mới thì viết `draw_brief`, tối đa 3 hình mới mỗi video; làm theo `brief.md`. Scriptwriter mô tả hiện tượng chính xác trong `visual`. Reviewer kiểm tra cảnh tự vẽ không trống, không đứng hình; lỗi hình tự vẽ tính cho Asset.
- Studio web: trang video có nhãn "Kho hình" hoặc "Tự vẽ: <tên>" từng cảnh; danh sách video có "x/y cảnh tự vẽ".
- Đã thử trong máy ảo: `clips/TEST-DRAW` (1 cảnh kho hình, 1 cảnh `wave`, 1 cảnh `interference`), có `test_full.mp4`. Chưa thử Asset tự viết hình mới trên Paperclip thật. Cần numpy trên Windows (`python -c "import numpy"`).

## 7g. Yêu cầu dài và duyệt trên Discord (26/11/2026)

Bản cũ: `docs/backup-2026-11-26-discord/` (bot.js, notify.js, deploy-commands.js, web.js, office.js, AGENTS.md của Producer).

- Lệnh `/video` không còn tham số; gõ lệnh thì bot mở form gồm Chủ đề (200 ký tự), Thời lượng (30 đến 300, bắt buộc), Giọng điệu (100), hai ô Yêu cầu chi tiết nhiều dòng (mỗi ô 4.000 ký tự, giới hạn của Discord, tổng 8.000). Phải chạy lại `node deploy-commands.js`.
- Tin nhắn thường bắt đầu bằng `/video` hoặc `!video` (gõ prompt ngay sau, hoặc kèm file .txt/.md): bot lấy chủ đề từ dòng "Chủ đề: ..." (cắt ở dấu phẩy hoặc chấm đầu tiên), thời lượng từ "Thời lượng: N" hoặc "N giây" (mặc định 30), chép toàn bộ prompt làm yêu cầu chi tiết (tối đa 20.000 ký tự). Cần bật Message Content Intent trong Discord Developer Portal, nếu không bot báo lỗi "Used disallowed intents" khi khởi động.
- Studio web: form giao video ở văn phòng 3D có ô Yêu cầu chi tiết (tối đa 20.000 ký tự); tin nhắn chat tối đa 20.000 ký tự (trước là 4.000); giới hạn dữ liệu form gửi lên nâng từ 20.000 lên 400.000 ký tự đã mã hóa (chữ tiếng Việt mã hóa URL dài gấp nhiều lần).
- Yêu cầu chi tiết ghi vào mô tả task sau dòng `Notes (user request, verbatim):`. Producer chép nguyên văn vào cuối `brief.md` dưới mục `## User request (verbatim)` và chỉ cho từng vai phần liên quan. Thời lượng lấy theo dòng Duration.
- Khi cổng chờ duyệt, bot gửi vào kênh thông báo: cổng kịch bản thì gửi toàn bộ lời đọc từng cảnh (chia nhiều khung nếu dài hơn 3.900 ký tự); cổng video thì gửi tóm tắt Reviewer và file 9:16 nếu nhỏ hơn 8 MB. Tin cuối có nút "Duyệt" (đặt cổng sang done nếu bước trước đã xong, rồi bỏ nút) và "Yêu cầu sửa" (mở form, gửi comment vào task cha cho Producer). Chỉ người trong `DISCORD_ALLOWED_USER_IDS` bấm được.
- Văn phòng 3D: Tôn Ngộ Không xuất hiện cả khi có lỗi lẫn khi có cổng chờ duyệt; panel chia hai mục.
- Đã thử: tạo task video có yêu cầu dài qua Studio web với Paperclip giả lập; tạo tin nhắn chờ duyệt từ `clips/VIEA-3`. Chưa thử: form và nút trên Discord thật; giới hạn độ dài mô tả task của Paperclip.

## 8. Kết quả thử nghiệm

- Producer chạy được trên bản 831.1; nạp AGENTS.md qua chế độ External; tạo chuỗi 8 task có quan hệ chặn, agent kế tiếp tự thức dậy khi task trước xong (đã kiểm chứng).
- Scriptwriter: tạo `script.json` hợp lệ, lời đọc tiếng Việt đủ dấu, nội dung lý thuyết đúng.
- Thử riêng cảnh vẽ (5 giây, 720x1280, 30 fps) và giọng đọc (khoảng 4,6 âm tiết mỗi giây), rồi ghép bằng ffmpeg: đạt.
- Chạy cả chuỗi (task VIEA-7): đủ mọi file đầu ra. `review.json` ghi `passed: true`; các bản 720x1280, 1080x1080, 1080x1350, 1920x1080 đều có âm thanh, không đoạn đen, phụ đề khớp lời. Video dài 18,97 giây so với mục tiêu 30 giây; Reviewer chỉ chặn ngoài khoảng 15 đến 60 giây.
- Bot Discord: `/video` tạo được task VIEA-16 (bài toán 100 tù nhân) kèm VIEA-17 đến VIEA-24. Chạy hết chuỗi: Reviewer đạt, Publisher đã đóng gói. Thời lượng thật 20,66 giây (ffprobe) so với mục tiêu 30 giây.
- Nhận xét của người dùng: hình còn đơn giản và chán, cần cải thiện bằng skill hoặc hiệu ứng.

## 9. Sự cố đã gặp

| Sự cố | Nguyên nhân | Cách xử lý |
|---|---|---|
| "Could not verify the local subscription" ở bước Connect | bước kết nối do Paperclip quản lý bị chặn trên Windows | lùi về Paperclip 2026.831.1 |
| Agent kẹt "setup", task chuyển đỏ "Recovery needed" | agent bị giữ ở trạng thái setup (lifecycle hold) trên bản mới | cùng cách trên |
| `paperclipai run` báo vùng nhớ chia sẻ đang dùng | tiến trình PostgreSQL nhúng cũ còn sót | tìm theo dòng lệnh và kết thúc đúng tiến trình đó |
| "workspace_validation_failed ... has no .git" | workspace phải là git repo | `git init`, `git add .`, `git commit` |
| Producer tự đề xuất và tuyển agent trong task onboarding | hành vi mặc định khi chưa có AGENTS.md | duyệt rồi tạm dừng agent thừa; viết AGENTS.md có điều cấm; để quyền tuyển tắt |
| `cd /d` lỗi trong PowerShell | `/d` chỉ dùng trong cmd | dùng `cd D:\agent-studio` |
| Pexels không cấp key mới | dịch vụ tạm ngừng | bỏ stock, vẽ hình bằng code |
| VieNeu v2 đầy đủ cần GPU | mô hình PyTorch chạy GPU | dùng bản Turbo (GGUF, CPU) |
| Discord OAuth: "Please enter a redirect URI" | tick thừa scope | bỏ scope thừa, hoặc tự ghép URL với scope `bot applications.commands`, permissions 19456 |
| Đăng ký lệnh Discord báo 401 | `.env` điền nhầm Public Key (64 ký tự hex) thay vì Bot Token (3 phần, 2 dấu chấm) | đặt lại token ở trang Bot và sửa `.env` |
| Mở Paperclip chỉ thấy Producer, Studio web báo VIEA-16 404 | chạy `paperclipai run` thiếu `--data-dir`, mở bản cài mặc định ở `C:\Users\ngocv\.paperclip` | Ctrl+C, chạy `paperclipai run --data-dir D:\paperclip-data` |
| Comment của agent mất dấu ("nền" thành "n?n") | Windows đổi chữ trong dòng lệnh curl sang bảng mã ANSI | gửi nội dung qua file UTF-8 (`--data-binary @file`), đã ghi vào AGENTS.md |
| Video chỉ toàn khối vuông, phụ đề đè hình, chữ bị cắt mép, dài 63,5 giây | Asset tự vẽ bằng Pillow, không có kho hình | kho emoji 3D + `render_scenes.py`, chừa vùng phụ đề, tự giữ phần tử trong khung |
| PowerShell in bảng rỗng khi `ConvertFrom-Json \| Select-Object` | thiếu ngoặc | bọc ngoặc: `(... \| ConvertFrom-Json) \| Select-Object ...` |

## 10. Tìm skill để cải thiện video (24/11/2026)

| Lựa chọn | Hợp với | Ghi chú |
|---|---|---|
| manim-video (NousResearch/hermes-agent) | Director, Asset | Python, không cần GPU, kiểu 3Blue1Brown. Cần Manim v0.20+ và LaTeX; hướng dẫn cài LaTeX chỉ có Linux và macOS (chưa xác minh tránh được LaTeX trên Windows). 14 file tham khảo nên tốn token. |
| manim (davila7/claude-code-templates) | Asset | Ngắn, ghi license MIT, chỉ là kiến thức API, không có quy trình. |
| Remotion (remotion-dev/skills) | Director, Asset | Chuyển động đẹp hơn; React và Chromium, nặng hơn, agent tốn token hơn. Miễn phí cho cá nhân và nhóm đến 3 người. Chưa xác minh chạy trên Windows không GPU. |
| Skill ffmpeg (kajisho5, notque, affaan-m) | Editor | Pipeline hiện tại đã làm được; chỉ lấy ý. |

Chưa cài skill nào. Bước thử tiếp theo: `pip install manim` rồi `manim checkhealth` để biết có cần LaTeX không. Cài skill ngoài chỉ sau khi đọc SKILL.md, vì agent đang bật Skip permissions. Nếu đổi hướng Asset sang Manim hoặc Remotion thì phải cập nhật `agents/asset/AGENTS.md`, `agents/director/AGENTS.md` và mục 3, 6, 7 của tài liệu này.

## 10b. Skill tự viết và AGENTS.md mới (26/11/2026)

Không cài skill ngoài (các skill video có sẵn đều cần Remotion, Playwright hoặc Chromium, xem mục 10). Thay vào đó tự viết 9 skill trong `agents/_skills/`, tham khảo cách viết của anthropics/skills (skill-creator) và skindhu/educational-video-creator (cấu trúc kịch bản, nguyên tắc hình ảnh, checklist chất lượng).

Nguyên tắc tách: AGENTS.md giữ phần bắt buộc (vai trò, đầu vào, đầu ra, tiêu chí xong, bàn giao, khi nào blocked, điều cấm, cách gửi comment UTF-8). Skill chứa cách làm và phần chỉ dùng thỉnh thoảng (chat, vòng sửa). Nếu agent không thấy skill trong danh sách, AGENTS.md bảo đọc thẳng `agents/_skills/<tên>/SKILL.md`, nên vẫn chạy được khi chưa gắn skill trong Paperclip.

| Skill | Gắn cho | Nội dung |
|---|---|---|
| studio-chat-task | cả 7 | trả lời task "Chat:" |
| studio-rework | Scriptwriter, Director, Asset, Editor | làm task "Fix round N" |
| pipeline-rework-control | Producer | xử lý REVIEW FAILED/PASSED, comment người dùng, tạo vòng sửa |
| vn-explainer-script | Scriptwriter | cấu trúc hook - build - payoff, nhịp 4,5 âm tiết/giây, viết lời cho TTS, visual intent |
| storyboard-directing | Director | cỡ cảnh, bố cục, hướng chuyển động, đồng bộ hình với lời, chọn asset/draw, cách viết draw_brief |
| drawing-simulation | Asset | hợp đồng hàm draw(), quy trình thử 3 lần, chia pha chuyển động, lỗi thường gặp |
| video-finishing | Editor | đệm voice theo độ dài cảnh, ghép, ngắt phụ đề, burn-in, xuất 4 định dạng, kiểm tra |
| video-qc | Reviewer | lệnh ffprobe/blackdetect/silencedetect, kiểm tra khung hình, gán stage, viết issue |
| social-packaging | Publisher | tiêu đề, mô tả, hashtag, định dạng theo nền tảng |

Thay đổi hành vi so với bản cũ (chưa chạy thử): phụ đề không tách đôi từ ghép; Reviewer chỉ đánh trượt lỗi người xem nhận ra, lỗi thẩm mỹ ghi vào detail; Director dặn nhãn chữ của cảnh vẽ đặt trong `elements` thay vì vẽ trong code. Tổng dung lượng 7 AGENTS.md giảm từ 36,8 KB xuống 26,7 KB. Bản cũ lưu ở `docs/backup-2026-11-26-agents/`.

Cách gắn: Paperclip, import từ thư mục `agents/_skills` (một thư mục chứa nhiều skill), rồi tick ở trang Agent, tab Skills theo bảng trên. Theo tài liệu Paperclip, đường dẫn local phải nằm trong thư mục được phép (thư mục skill của công ty hoặc project workspace đã đăng ký); chưa xác minh `D:/agent-studio` có thuộc vùng đó.

## 11. Chưa xác minh và việc còn lại

Hạn chế đã biết (quyết định để nguyên, 26/11): khi bấm "Yêu cầu sửa" ở cổng video, cổng vẫn hiện "chờ duyệt" trong lúc các vòng sửa chạy (nút Duyệt vẫn bấm được); vòng sửa ghi đè `final/` nên mất bản cũ; khi vòng sửa xong, bot không gửi lại tin chờ duyệt. Cách dùng: chờ dòng "Xong Review round N" rồi mới duyệt ở tab Tiến độ.

Chưa xác minh:
- web.js chưa chạy với Paperclip thật: các API ở mục 7b mới đối chiếu trong mã nguồn.
- Âm thanh VieNeu có gắn watermark mặc định hay không, và điều khoản giấy phép nếu đăng công khai.
- Cách Paperclip 2026.831.1 xử lý khi từ chối lệnh trong lúc chạy không giám sát.
- Cách ghim phiên bản Claude Code (tắt tự cập nhật) trên Windows.
- Plugin Telegram hoặc Discord có tương thích với 2026.831.1 không.
- Cách xử lý task bị kẹt sau khi tắt Paperclip đột ngột.
- Ý nghĩa timeoutSec 0 và maxConcurrentRuns 20 của agent.

Việc còn lại (cập nhật 25/11 tối):
1. Chạy thử trên Paperclip thật: `brief.md`, vòng sửa tự động, chế độ tự vẽ (giao video về giao thoa sóng).
2. Gắn 9 skill trong `agents/_skills` vào agent trên Paperclip (mục 10b) và chạy thử cùng video giao thoa sóng.
3. Commit git khi hệ thống ổn; xóa `_to_delete_studio_assets.zip`, 2 file `.md` trùng ở thư mục gốc, `clips/TEST-DRAW`.
4. Để sau: tự đăng TikTok (chế độ riêng tư), kịch bản demo và tổng duyệt (GĐ7), cải thiện hình ảnh video.

Đã xong: kiểm tra chat ở tab Văn phòng, nút "Gửi và chạy lại", dấu tiếng Việt trong comment, số liệu tab Token (người dùng xác nhận đạt).

Đã bỏ: đổi kho hình sang Fluent Emoji 3D (giữ Noto); đặt `maxConcurrentRuns` (để mặc định); hạn mức token; ước lượng so với thực tế (F6); form "Thêm agent" và trang Agent trên Studio web; router riêng trong backend; `pipeline.json` cho Producer; báo cáo và chỉ số trên Studio web; timeout agent.
