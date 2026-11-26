# Thu vien hinh tu ve

Moi file `<ten>.py` la mot hinh tu ve dung lai duoc. `render_scenes.py` goi ham `draw(frame, t, sec, duration, params)` cho tung khung hinh.

- Xem danh sach: `python tools/render_scenes.py --drawings` (hoac `--drawings wave` de loc).
- Viet hinh moi: chep `_template.py`, doc quy tac o dau file.
- Hinh chi dung cho mot video: dat trong `clips/<ma>/drawings/<ten>.py`. Neu dung tot va dung lai duoc, Asset chep vao thu muc nay, viet DESCRIPTION va DEFAULT_PARAMS ro rang.

| Ten | Noi dung | Nguoi viet |
|---|---|---|
| interference | giao thoa song tu cac nguon diem (van sang, van toi) | viet san 25/11/2026 |
| wave | hai song chay nguoc chieu gap nhau, duong tong (chong chap) | viet san 25/11/2026 |
| path_difference | giao thoa hai nguon: to dam duong cuc dai/cuc tieu, diem P noi S1, S2 bang hai doan d1, d2 khac mau | Asset, VIEA-59, 26/11/2026 |
