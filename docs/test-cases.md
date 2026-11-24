# Test cases

Danh sách case để test web, dùng cho test tay trước mỗi lần merge và làm đầu vào cho test tự động.
Viết bằng tiếng Việt vì đây là checklist cho người test; tên API, mã lỗi giữ nguyên tiếng Anh.

- **Mức**: `P0` = hỏng là mất tiền, lộ dữ liệu hoặc không dùng được (chặn release) ·
  `P1` = tính năng chính sai · `P2` = khó chịu nhưng có đường vòng.
- **Tự động**: `unit` / `e2e` = đã có test trong code, `—` = mới test tay.
- **Lần chạy 2026-11-24**: `Pass`, `Fail → BUG-x` (xem mục Bug ở cuối), trống = chưa chạy.
- Tài khoản seed: `student@`, `instructor@`, `admin@elearning.local`, mật khẩu `Password123!`; owner lấy từ
  `OWNER_EMAIL` trong `.env`.
- Thêm case mới khi thêm tính năng (skill `qa-test-cases`), và **mỗi bug tìm được phải có một case** để nó không quay lại.

## 1. Đăng ký, đăng nhập, phiên

| ID | Mức | Bước | Kết quả mong đợi | Tự động | Lần chạy 2026-11-24 |
|---|---|---|---|---|---|
| AUTH-01 | P0 | Đăng ký email mới, mật khẩu 8+ ký tự, họ tên | 201, vào trang chủ đã đăng nhập, role USER | — | Pass |
| AUTH-02 | P1 | Đăng ký trùng email nhưng khác hoa thường (`STUDENT@...`) | 409 `EMAIL_TAKEN` | — | Pass |
| AUTH-03 | P0 | Đăng ký gửi kèm `"role":"ADMIN"` trong body | Bị bỏ qua, tài khoản vẫn là USER | — | Pass |
| AUTH-04 | P1 | Đăng ký mật khẩu 7 ký tự / 73 ký tự | 400 `VALIDATION_ERROR`, thông báo tiếng Việt | — | Fail → BUG-4 (73 ký tự báo tiếng Anh) |
| AUTH-05 | P1 | Đăng nhập sai mật khẩu, và đăng nhập email không tồn tại | Cùng 401 `INVALID_CREDENTIALS`, cùng thông báo, **thời gian phản hồi xấp xỉ nhau** | — | Fail → BUG-1 |
| AUTH-06 | P0 | Đăng nhập sai quá 10 lần trong 1 phút từ cùng IP | Lần 11 trả 429 `TOO_MANY_REQUESTS`, thông báo tiếng Việt | — | Fail → BUG-4 (thông báo tiếng Anh) |
| AUTH-07 | P0 | Tài khoản bị khóa đăng nhập đúng mật khẩu | 403 `ACCOUNT_LOCKED` | e2e | Pass |
| AUTH-08 | P1 | Tài khoản bị khóa đăng nhập **sai** mật khẩu | 401 `INVALID_CREDENTIALS` (không tiết lộ là bị khóa) | — | Pass |
| AUTH-09 | P0 | Gọi `/api/me` với access token bị sửa 1 ký tự, hoặc header `alg: none` | 401 `INVALID_TOKEN` | — | Pass |
| AUTH-10 | P0 | Refresh với refresh token hợp lệ | Trả cặp token mới, token cũ hết dùng được | — | Pass |
| AUTH-11 | P0 | Dùng lại refresh token **đã xoay** | 401, và **mọi phiên của user đó bị thu hồi** (dấu hiệu token bị đánh cắp) | — | Fail → BUG-2 |
| AUTH-12 | P0 | Gửi 5 request refresh cùng lúc với cùng một token | Đúng 1 request thành công | — | Pass (nhưng xem BUG-3) |
| AUTH-13 | P1 | Đăng xuất rồi refresh bằng token vừa đăng xuất | 401 `INVALID_REFRESH_TOKEN` | — | Pass |
| AUTH-14 | P2 | Đăng xuất rồi dùng access token cũ | Vẫn chạy tới khi hết hạn (15 phút). Chấp nhận được, ghi lại để biết | — | Pass |
| AUTH-15 | P0 | Admin khóa user đang đăng nhập; user gọi API tiếp | 403 `ACCOUNT_LOCKED` ngay (quyền đọc từ DB, cache tối đa 30 giây), refresh bị từ chối | — | Pass |
| AUTH-16 | P1 | Web: access token hết hạn khi đang ở trang admin | Tự refresh một lần, không đá ra trang đăng nhập | — | |
| AUTH-17 | P1 | Web: refresh token hết hạn | Chuyển về `/login`, đăng nhập lại quay về trang đang xem | — | |
| AUTH-18 | P0 | Web: access token hết hạn trên trang gọi nhiều API cần đăng nhập cùng lúc, hoặc mở 2 tab | Chỉ một request refresh, không bị đăng xuất | — | Pass sau khi sửa BUG-5 |
| AUTH-19 | P0 | Dùng lại refresh token đã xoay sau hơn 10 giây | 401, mọi phiên của user bị thu hồi, audit `auth.refresh_reuse` | unit | Pass sau khi sửa BUG-2 |

## 2. Phân quyền (RBAC)

| ID | Mức | Bước | Kết quả mong đợi | Tự động | Lần chạy 2026-11-24 |
|---|---|---|---|---|---|
| RBAC-01 | P0 | USER gọi bất kỳ `/api/admin/*` | 403 `FORBIDDEN` | e2e | |
| RBAC-02 | P0 | ADMIN đổi role một user thành ADMIN hoặc OWNER | 403 `PRIVILEGED_ROLE` | e2e + unit | |
| RBAC-03 | P0 | ADMIN sửa, khóa, ghi đè quyền của một ADMIN khác | 403 `PRIVILEGED_TARGET` | unit | |
| RBAC-04 | P0 | OWNER hạ role của owner cuối cùng | 409 `LAST_OWNER` | unit | |
| RBAC-05 | P1 | Ai đó tự khóa chính mình | 400 `CANNOT_LOCK_SELF` | unit | |
| RBAC-06 | P0 | Non-owner GRANT một quyền mà chính họ không có | 403 `EXCEEDS_OWN_PERMISSIONS` | unit | |
| RBAC-07 | P0 | Cho user một override DENY `course.learn` rồi gọi API cần quyền đó | 403, dù role có quyền (DENY thắng) | unit | |
| RBAC-08 | P1 | Owner tạo role tùy chỉnh, gán quyền, gán cho user | User có đúng các quyền đó trong `/api/me` sau tối đa 30 giây | — | |
| RBAC-09 | P1 | Xóa role tùy chỉnh đang có người dùng | 409 `ROLE_IN_USE` | — | |
| RBAC-10 | P1 | Web: user không có quyền thì không thấy link "Quản trị"; gõ thẳng `/admin` | Không thấy link; vào trang thì báo không có quyền, API vẫn chặn | — | |
| RBAC-11 | P1 | Mỗi thao tác admin (đổi role, khóa, override) | Có một dòng audit log đúng người làm, đúng đối tượng, có IP và request id | — | |

## 3. Danh mục, môn học, tìm kiếm

| ID | Mức | Bước | Kết quả mong đợi | Tự động | Lần chạy 2026-11-24 |
|---|---|---|---|---|---|
| CAT-01 | P1 | `GET /api/categories` | Cây danh mục → môn, đúng thứ tự `position` | e2e | |
| CAT-02 | P1 | `GET /api/categories/khong-ton-tai` | 404 `CATEGORY_NOT_FOUND` | — | Pass |
| CAT-03 | P1 | Admin tạo danh mục trùng slug | 409 `SLUG_TAKEN` | — | |
| CAT-04 | P1 | Admin xóa danh mục / môn đang có khóa học | 409 `CATEGORY_IN_USE` / `SUBJECT_IN_USE` | — | |
| CAT-05 | P1 | Admin thêm trường riêng kiểu `select` mà không có lựa chọn nào | 400 `VALIDATION_ERROR` | — | |
| SRCH-01 | P1 | Tìm `hoa` | Ra "Hóa học", **không** ra "Khoa học" (khớp đầu từ, bỏ dấu) | unit | |
| SRCH-02 | P1 | Tìm `%` và `_` | Không ra toàn bộ khóa học | unit | Pass (0 kết quả) |
| SRCH-03 | P2 | Tìm chuỗi 101+ ký tự | 400, thông báo tiếng Việt | — | Fail → BUG-4 |
| SRCH-04 | P1 | `pageSize=1000`, `page=-1`, `sort=hack` | 400 `VALIDATION_ERROR`, thông báo tiếng Việt | — | Fail → BUG-4 |
| SRCH-05 | P2 | Gõ nhanh vào ô tìm kiếm trang `/courses` | Không gửi request cho từng phím; kết quả cũ giữ nguyên tới khi có kết quả mới | — | |
| SRCH-06 | P2 | Bấm sang trang 2 rồi đổi từ khóa | Quay về trang 1 | — | |

## 4. Khóa học công khai

| ID | Mức | Bước | Kết quả mong đợi | Tự động | Lần chạy 2026-11-24 |
|---|---|---|---|---|---|
| CRS-01 | P0 | Xem chi tiết khóa học khi chưa mua | Không có URL video nào trong response (kể cả trong JSON ẩn của trang) | — | Pass |
| CRS-02 | P1 | Xem slug của khóa chưa duyệt (DRAFT, PENDING) | 404 `COURSE_NOT_FOUND` | — | |
| CRS-03 | P2 | Breadcrumb danh mục → môn → khóa | Link đúng, bấm được | — | |
| CRS-04 | P2 | Giá hiển thị | Định dạng `599.000 ₫` qua `formatVnd()` | — | |

## 5. Đơn đăng ký giảng viên

| ID | Mức | Bước | Kết quả mong đợi | Tự động | Lần chạy 2026-11-24 |
|---|---|---|---|---|---|
| INS-01 | P1 | USER nộp đơn chọn 2 môn | Đơn PENDING, trang `/become-instructor` hiện trạng thái | — | |
| INS-02 | P1 | Nộp đơn thứ hai khi đơn trước còn PENDING | 409 `APPLICATION_PENDING` | unit | |
| INS-03 | P1 | Instructor nộp đơn cho môn đã dạy | 400 `ALREADY_TEACHING` | unit | |
| INS-04 | P0 | Admin tự duyệt đơn của chính mình | 403 `CANNOT_REVIEW_OWN` | unit | |
| INS-05 | P0 | Duyệt đơn chỉ 1 trong 2 môn | User thành INSTRUCTOR, chỉ được dạy môn được duyệt, có audit log | — | |
| INS-06 | P0 | Hai admin bấm duyệt cùng một đơn cùng lúc | Một người thành công, người kia 409 `APPLICATION_DECIDED` | unit | |
| INS-07 | P1 | Từ chối đơn có ghi chú | Người nộp thấy ghi chú, được nộp đơn mới | — | |
| INS-08 | P1 | Admin gán môn dạy trực tiếp ở trang user | Danh sách môn đổi ngay, có audit log | — | |

## 6. Soạn khóa học, kiểm duyệt (milestone 2, chưa làm)

| ID | Mức | Bước | Kết quả mong đợi |
|---|---|---|---|
| BLD-01 | P0 | Instructor A sửa khóa học của instructor B qua API | 403 hoặc 404, không lộ là khóa có tồn tại |
| BLD-02 | P0 | Instructor tạo khóa ở môn chưa được cấp | 403 |
| BLD-03 | P1 | Thiếu trường bắt buộc của danh mục (`courseFields`) | 400, chỉ rõ trường nào |
| BLD-04 | P1 | Sửa khóa đang PUBLISHED | Bản sửa phải duyệt lại, bản cũ vẫn hiển thị trong lúc chờ |
| BLD-05 | P1 | Upload file không phải video, hoặc vượt dung lượng | Bị từ chối trước khi tải hết lên |

## 7. Giỏ hàng, thanh toán VNPay (milestone 3, chưa làm)

| ID | Mức | Bước | Kết quả mong đợi |
|---|---|---|---|
| PAY-01 | P0 | IPN sai chữ ký | Từ chối, đơn không đổi, payload được log |
| PAY-02 | P0 | IPN đúng chữ ký nhưng số tiền khác `Order.total` | Từ chối, đơn không được đánh dấu đã trả |
| PAY-03 | P0 | Gửi lại cùng một IPN thành công 2 lần | Lần 2 trả OK nhưng không tạo thêm ghi danh, không tạo thêm bút toán |
| PAY-04 | P0 | Mở URL return của VNPay với tham số "thành công" tự chế | Không ghi danh; trang chỉ hiển thị trạng thái thật lấy từ server |
| PAY-05 | P0 | Thanh toán thành công | Trong **một** transaction: đơn PAID, ghi danh, bút toán EARNING PENDING |
| PAY-06 | P1 | Mua khóa đã sở hữu / thêm khóa của chính mình vào giỏ | Bị chặn |
| PAY-07 | P1 | Giá khóa đổi trong lúc đang ở trang checkout | Đơn dùng giá lúc tạo đơn, hiển thị rõ |
| PAY-08 | P0 | Hoàn tiền sau khi giảng viên đã được chi | Số dư giảng viên âm, trừ kỳ sau |

## 8. Học video, tiến độ (milestone 4, chưa làm)

| ID | Mức | Bước | Kết quả mong đợi |
|---|---|---|---|
| LRN-01 | P0 | User chưa ghi danh mở `/learn/<slug>/<lessonId>` hoặc lấy URL video qua API | Bị chặn, trừ bài `isPreview` |
| LRN-02 | P0 | Copy URL video đã ký sang trình duyệt khác sau khi hết hạn | Không phát được |
| LRN-03 | P1 | Xem 50% bài, tải lại trang | Phát tiếp từ chỗ cũ |
| LRN-04 | P1 | User bị hoàn tiền | Mất quyền vào bài học |

## 9. Multi-tenant (khi bán white-label)

| ID | Mức | Bước | Kết quả mong đợi |
|---|---|---|---|
| TEN-01 | P0 | User tenant A gọi API trên tên miền tenant B bằng token của A | 401 |
| TEN-02 | P0 | Admin tenant A đoán id khóa học / user của tenant B | 404 |
| TEN-03 | P0 | Tenant bị SUSPENDED | Học viên thấy trang tạm ngưng, không mua được, dữ liệu còn nguyên |
| TEN-04 | P0 | Khai tên miền riêng chưa có bản ghi TXT | Không được cấp HTTPS, không trỏ vào tenant |
| TEN-05 | P1 | Cùng một email đăng ký ở hai tenant | Hai tài khoản độc lập |

## 10. Chung cho mọi trang

| ID | Mức | Bước | Kết quả mong đợi |
|---|---|---|---|
| GEN-01 | P1 | Mọi lỗi API | Body `{ statusCode, message, code }`, `message` tiếng Việt, không lộ stack trace |
| GEN-02 | P2 | Mở từng trang ở màn hình 375 px | Không cuộn ngang, chữ không tràn |
| GEN-03 | P2 | Console trình duyệt khi đi hết các trang | Không có lỗi đỏ |
| GEN-04 | P2 | Tab qua form đăng nhập, đăng ký bằng bàn phím | Thứ tự hợp lý, có viền focus, Enter để gửi |
| GEN-05 | P1 | Tắt API rồi mở trang chủ | Hiện thông báo lỗi thân thiện, không trắng trang |

## Bug tìm được

Mỗi bug ghi: bị sao, vì sao nguy hiểm, giải pháp, trạng thái.

### BUG-1 · Đăng nhập để lộ email nào đã có tài khoản (qua thời gian phản hồi)

- **Bị sao:** email không tồn tại thì API trả lỗi sau khoảng 1–2 ms; email có thật thì mất khoảng 100 ms vì phải
  chạy bcrypt. Đo được 96 ms so với 1,6 ms. Thông báo lỗi giống nhau nhưng thời gian thì khác.
- **Vì sao nguy hiểm:** kẻ xấu dò được danh sách email học viên, rồi dùng để spam hoặc thử mật khẩu bị lộ ở trang khác.
- **Giải pháp:** khi không tìm thấy user, vẫn chạy `bcrypt.compare` với một hash giả cố định, để hai trường hợp tốn
  cùng thời gian.
- **Trạng thái:** đã sửa trên nhánh `fix/auth-hardening`, chạy lại: Pass.

### BUG-2 · Dùng lại refresh token cũ không làm gì cả

- **Bị sao:** refresh token đã xoay mà bị dùng lại chỉ nhận 401; token mới mà kẻ trộm (hoặc chủ thật) đang giữ vẫn chạy.
- **Vì sao nguy hiểm:** token xoay mà bị dùng lại nghĩa là có hai người đang giữ cùng một phiên. Nếu kẻ trộm refresh
  trước, họ giữ phiên vô thời hạn mà hệ thống không phản ứng.
- **Giải pháp:** khi gặp token đã thu hồi, thu hồi **mọi** refresh token còn hạn của user đó và ghi audit
  `auth.refresh_reuse`. Người dùng thật chỉ phải đăng nhập lại.
- **Trạng thái:** đã sửa trên nhánh `fix/auth-hardening`, chạy lại: Pass.

### BUG-3 · Refresh đồng thời có thể sinh hai phiên (rủi ro, chưa tái hiện được)

- **Bị sao:** code đọc token, kiểm tra chưa thu hồi, rồi mới cập nhật `revokedAt`. Hai request đến cùng lúc có thể
  cùng qua bước kiểm tra. Thử 5 request song song thì chỉ 1 thành công, nên chưa tái hiện được, nhưng khe hở vẫn có.
- **Vì sao nguy hiểm:** một token thành hai phiên hợp lệ, làm vô hiệu cơ chế xoay token.
- **Giải pháp:** thu hồi bằng `updateMany({ where: { id, revokedAt: null } })` và chỉ cấp token mới khi `count === 1`.
- **Trạng thái:** đã sửa trên nhánh `fix/auth-hardening`, chạy lại: Pass.

### BUG-4 · Một số thông báo lỗi hiện tiếng Anh

- **Bị sao:** các rule zod không ghi thông báo riêng (giới hạn `pageSize`, độ dài tối đa, `enum`) trả câu mặc định
  tiếng Anh như "Too big: expected number to be <=50"; lỗi 429 trả "ThrottlerException: Too Many Requests".
  Thêm một lỗi cùng gốc: mật khẩu dài hơn 72 ký tự lại báo "Vui lòng nhập mật khẩu", vì thông báo đặt ở cấp
  `z.string({ error })` áp cho mọi lỗi của trường đó.
- **Vì sao nguy hiểm:** sai quy ước `message` tiếng Việt cho người dùng; form trên web hiện câu tiếng Anh khó hiểu.
- **Giải pháp:** bật locale tiếng Việt có sẵn của zod (`z.config(z.locales.vi())`) một lần trong `@elearning/shared`,
  để cả web và API dùng chung, kèm câu thân thiện cho lỗi độ dài và giá trị không hợp lệ; map lỗi 429 sang
  `"Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút"`; ghi thông báo riêng cho từng `.max()` có `error` cấp trường.
- **Trạng thái:** đã sửa trên nhánh `fix/auth-hardening`, chạy lại: Pass.

### BUG-5 · Web có thể tự đăng xuất người dùng khi nhiều request cùng refresh

- **Bị sao:** khi access token hết hạn, mỗi request bị 401 tự gọi `/auth/refresh` với cùng một refresh token.
  API xoay token nên chỉ request đầu thành công; các request sau thất bại và xóa luôn token mới trong
  localStorage, làm người dùng bị đăng xuất. Hai tab mở cùng lúc cũng gặp. Tìm ra khi đọc code; các trang hiện tại
  chỉ gọi một API cần đăng nhập mỗi lúc nên chưa lộ ra, nhưng trang học viên (milestone 4) sẽ gặp ngay.
- **Vì sao nguy hiểm:** người dùng bị đá ra giữa chừng mỗi 15 phút một cách ngẫu nhiên, nhất là khi đang học
  hoặc đang thanh toán.
- **Giải pháp:** chỉ một refresh chạy tại một thời điểm (dùng chung promise), request đến sau thì dùng token
  vừa làm mới; nếu refresh thất bại nhưng tab khác đã có token mới trong localStorage thì dùng token đó thay vì
  đăng xuất. API cho 10 giây ân hạn để hai tab refresh cùng lúc không bị coi là trộm token.
- **Trạng thái:** đã sửa trên nhánh `fix/auth-hardening`; kiểm bằng Playwright (token hết hạn giữa phiên, vẫn
  đăng nhập, đúng 1 lần refresh).
