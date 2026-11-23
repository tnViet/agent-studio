# Agent Studio - ngu canh du an

Do an mon Quan ly du an phan mem. He thong quan ly mot team agent AI san xuat video ngan (15-60 giay), dieu phoi bang Paperclip.
Trong tam cham diem: quan ly agent, task, tien do, token, luong ban giao. Video chi la san pham minh hoa.
Tai lieu day du: docs/ va file "huong dan studio agent.docx" trong Project Claude.

## Phien ban khoa (khong tu y nang cap)
- Paperclip 2026.831.1 (ban moi hon bi loi Connect tren Windows, khong dung paperclipai update)
- Claude Code 2.1.330
- Du lieu Paperclip: D:\paperclip-data

## Thiet ke da chot
- 7 agent: Producer (quan ly), Scriptwriter, Director, Asset, Editor, Reviewer, Publisher. Moi agent mot vai tro, bo skill rieng.
- Luong khai bao trong pipeline.json. Khong viet cung ten hay so luong agent.
- Router trong backend chuyen chang theo pipeline.json. Agent con khong tu gan viec cho agent khac.
- Nguoi dung chi giao tiep voi Producer qua chat (Discord hoac Telegram, chua chot).
- Cong 1: duyet kich ban. Cong 2: duyet video. Lam tren Studio web.
- Pipeline video: TTS tieng Viet -> Pexels -> FFmpeg -> phu de -> xuat 4 dinh dang -> ffprobe kiem tra.
- Publisher: cong tac tu dong dang dang TAT, chi dong goi.

## Rang buoc
- Tai nguyen co han, khong GPU. Agent chay tuan tu, tat heartbeat dinh ky.
- Quan ly token bang so token, khong bang tien.
- Token, key de trong .env hoac Secrets cua Paperclip. Khong commit, khong in ra log, khong doc .env roi dan vao comment.

## Quy tac cho agent
- Chi lam trong thu muc D:/agent-studio.
- Khong tu tao agent moi, khong tu gan viec cho agent khac.
- Khong chay lenh xoa file ngoai thu muc du an.
