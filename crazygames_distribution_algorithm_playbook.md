# Cẩm Nang Toàn Diện: Giải Mã Thuật Toán Phân Phối CrazyGames

CrazyGames không phải là một kho lưu trữ game tĩnh như các trang web thời kỳ Flash, mà là một **nền tảng phân phối dựa trên dữ liệu (Data-Driven Discovery Platform)** với hơn 30 triệu người chơi mỗi tháng. Thuật toán của CrazyGames hoạt động tương tự như YouTube hay Steam: đánh giá hành vi người chơi theo thời gian thực để quyết định phân bổ bao nhiêu lượt hiển thị (impressions) cho từng tựa game.

Tài liệu này phân tích chi tiết từng tầng của phễu phân phối và các tiêu chuẩn định lượng bắt buộc để đưa game lên top thịnh hành.

---

## 1. Phễu Phân Phối 3 Giai Đoạn

Quy trình phân phối của CrazyGames gồm 3 bước sàng lọc nghiêm ngặt:

```
[ Game Mới ] 
      │
      ▼
┌─────────────────────────┐
│ 1. Initial QA Review    │ ── (Loại bỏ bản build lỗi, clone rác, vi phạm)
└─────────────────────────┘
      │ (Pass)
      ▼
┌─────────────────────────┐
│ 2. Basic Launch (Test)  │ ── (Thử nghiệm với ~500 người chơi, tắt Ads)
└─────────────────────────┘
      │ (Đạt chuẩn 3 KPIs)
      ▼
┌─────────────────────────┐
│ 3. Full Launch (Global) │ ── (Mở Monetization, đẩy Trang chủ, Viral loop)
└─────────────────────────┘
```

---

## 2. Giai Đoạn 1: Sàng Lọc Kỹ Thuật (Initial QA Review)

Trước khi chạm tới bất kỳ người chơi nào, game phải vượt qua đội ngũ QA kiểm duyệt thủ công và các script tự động.

### Tiêu chuẩn kỹ thuật bắt buộc:
* **Tệp khởi chạy:** Bắt buộc có file `index.html` tại thư mục gốc của file ZIP.
* **Đường dẫn tương đối (Relative paths):** Toàn bộ asset, script, audio phải gọi bằng relative path (ví dụ: `./assets/player.png`, không dùng `/assets/player.png` hoặc `C:/...`).
* **Hỗ trợ HTTPS:** Không gọi bất kỳ API bên ngoài nào dùng `http://`.
* **Giới hạn dung lượng:**
  * Kích thước tải ban đầu (Initial Download Size) tối đa: **50 MB** (khuyến nghị dưới **20 MB** để đủ điều kiện vào mobile homepage).
  * Tổng dung lượng ZIP sau giải nén: tối đa **250 MB** và không quá **1,500 files**.
* **Ngôn ngữ:** Tối thiểu phải có tiếng Anh (UI, hướng dẫn điều khiển).

### Các lý do phổ biến bị từ chối ngay lập tức:
1. **Clone thô thiển / Asset flip:** Game sao chép hoàn toàn đồ họa hoặc gameplay có sẵn mà không có cải tiến mới.
2. **Crash hoặc vỡ layout:** Game không tự căn chỉnh tỉ lệ (responsive) khi thay đổi kích thước cửa sổ hoặc trên màn hình cảm ứng (nếu tick chọn hỗ trợ Mobile).
3. **Quảng cáo của bên thứ ba:** Tự ý nhúng Google AdSense hoặc banner riêng ngoài SDK CrazyGames.
4. **Vi phạm chuẩn mực nội dung:** Không tuân thủ tiêu chuẩn PEGI-12.

---

## 3. Giai Đoạn 2: Basic Launch (Vòng Đo Lường Dữ Liệu)

Sau khi vượt qua QA, game được đưa vào giai đoạn **Basic Launch** (kéo dài từ 7 đến 21 ngày).

### Quy tắc của Basic Launch:
* **Điều kiện kết thúc:** Phải thỏa mãn đồng thời hai điều kiện:
  $$\text{Thời gian live} \ge 7 \text{ ngày} \quad \text{VÀ} \quad \text{Lượt chơi} \ge 500 \text{ plays}$$
  *(Nếu sau 21 ngày vẫn chưa đạt mốc 500 lượt chơi, giai đoạn này sẽ tự động đóng lại).*
* **Quảng cáo bị tắt hoàn toàn:** CrazyGames vô hiệu hóa ads ở giai đoạn này để tránh ma sát (friction), nhằm đo lường chính xác mức độ hứng thú tự nhiên của người chơi.
* **SDK là tùy chọn:** Không bắt buộc phải gắn CrazyGames SDK trong Basic Launch; hệ thống tự động ghi nhận số liệu qua container web.

### Bộ 3 Chỉ Số Sống Còn (The Core KPIs Benchmark)

Thuật toán CrazyGames đối chiếu trực tiếp dữ liệu game của bạn với điểm chuẩn (benchmark) của toàn sàn:

| Chỉ số (KPI) | Định nghĩa | Ngưỡng đạt chuẩn (Target) | Ý nghĩa với Thuật toán |
| :--- | :--- | :--- | :--- |
| **Conversion to Gameplay** | Tỷ lệ người chơi ở lại game $\ge 1$ phút sau khi mở trang | **$\ge 80\%$** | Đo lường tốc độ load game và trải nghiệm onboarding 60s đầu |
| **Average Play Time** | Thời lượng trung bình mỗi phiên chơi | **$\ge 10$ phút** | Chứng minh Core Loop đủ cuốn hút để giữ chân người chơi |
| **Day 1 Retention ($D_1$)** | Tỷ lệ người chơi quay lại vào ngày hôm sau | **$10\% - 15\%$** | Đo lường giá trị chơi lại (replay value) và độ sâu nội dung |

#### Phân tích chi tiết từng chỉ số:

#### A. Tối ưu Conversion to Gameplay ($> 80\%$)
* **Cơ chế:** Nếu người chơi bấm vào game rồi thoát ra trong vòng chưa đầy 60 giây, thuật toán hiểu rằng game load quá lâu, có bug crash, hoặc gameplay gây thất vọng ngay lập tức.
* **Cách khắc phục:**
  * Giảm file bundle ban đầu xuống dưới $15\text{MB}$ (nén WebP cho ảnh, OGG chất lượng $96\text{kbps}$ cho âm thanh).
  * Vào thẳng gameplay ngay trong 1 click: Bỏ logo studio dài dòng, không hiển thị thanh tiến trình loading phức tạp.
  * Tải tài nguyên ngầm (Lazy loading): Chỉ load màn 1 trước, các màn tiếp theo tải ngầm khi người chơi đang vượt qua màn đầu.

#### B. Tối ưu Average Play Time ($> 10\text{ phút}$)
* **Cơ chế:** Thời gian người chơi nán lại càng lâu, CrazyGames càng có nhiều vị trí hiển thị quảng cáo sau này.
* **Cách khắc phục:**
  * Đường cong độ khó mượt mà: 2 phút đầu cực dễ để tạo dopamine, sau đó nâng độ thử thách lên từ từ.
  * Hệ thống mở khóa liên tục: Cứ mỗi 90–120 giây chơi, trao cho người dùng một phần thưởng nhỏ (skin mới, item mới, kỹ năng nâng cấp).

#### C. Tối ưu Day 1 Retention ($10\% - 15\%$)
* **Cơ chế:** Game web thường bị người chơi quên lãng sau khi tắt tab. Giữ chân được $10\%$ quay lại là một tín hiệu cực kỳ mạnh.
* **Cách khắc phục:**
  * **Lưu tiến trình (Save State):** Bắt buộc phải lưu vào `LocalStorage` hoặc dùng Cloud Save của CrazyGames SDK. Nếu người chơi F5 mà mất sạch level/tiền vàng, $D_1$ sẽ chạm đáy.
  * Cơ chế tiến trình chưa hoàn tất: Cho người chơi thấy họ chỉ còn thiếu 1 mảnh ghép nhỏ nữa để đạt mốc danh hiệu lớn.

---

## 4. Giai Đoạn 3: Full Launch & Thuật Toán Đề Xuất Trang Chủ

Khi các chỉ số Basic Launch đạt chuẩn, bạn được mời tích hợp CrazyGames SDK hoàn chỉnh và bước vào **Full Launch**. Tại đây, thuật toán đề xuất (Recommendation Engine) bắt đầu hoạt động toàn lực.

### Công thức tính "Điểm Xếp Hạng" (Algorithmic Score)

Thuật toán của CrazyGames ưu tiên hiển thị dựa trên hàm mục tiêu tối ưu hóa doanh thu và trải nghiệm:

$$\text{Rank Score} = w_1 \cdot \text{CTR} + w_2 \cdot \text{Engagement} + w_3 \cdot \text{Retention} + w_4 \cdot \text{RPM} + w_5 \cdot \text{Freshness}$$

Trong đó:

### 1. CTR (Click-Through Rate - Tỷ lệ click vào game)
* **Vị trí ảnh hưởng:** Trang chủ, thanh sidebar "Games you may like", danh mục thể loại.
* **Đòn bẩy Thumbnail:**
  * Thumbnail tĩnh kích thước tiêu chuẩn: $512 \times 384\text{px}$ hoặc $512 \times 512\text{px}$. Màu sắc có độ tương phản cao, nổi bật trên nền giao diện tối (Dark Mode) của CrazyGames.
  * Không dùng hình ảnh tĩnh tẻ nhạt, hãy chụp lại khoảnh khắc hành động kịch tính hoặc nhân vật có biểu cảm mạnh.
* **Animated Video Preview (Yếu tố quyết định CTR):**
  * CrazyGames tự động phát một video ngắn khi người dùng rê chuột qua thumbnail.
  * Đoạn video 5–10 giây này phải phô diễn điểm hay nhất của gameplay, combo mãn nhãn hoặc tình huống hài hước/ức chế. Đây là thứ kéo CTR tăng $30\% - 50\%$.

### 2. Rating & Sentiment (Đánh giá người dùng)
* Hệ thống hiển thị điểm vote sao (1 đến 5 sao) công khai.
* Những game có số điểm $\ge 4.2$ sao sẽ được thuật toán giữ chân lâu hơn ở các dải banner nổi bật. Nếu điểm tụt dưới $3.5$ sao, thuật toán sẽ tự động hạ bậc đề xuất.

### 3. Tối ưu hóa Ad Pacing với SDK
Thuật toán phân phối sẽ theo dõi phản ứng của người chơi khi xuất hiện quảng cáo:
* **Gọi SDK đúng thời điểm:**
  * Dùng `CrazyGames.SDK.gameplayStart()` khi người chơi vào trận thực sự.
  * Dùng `CrazyGames.SDK.gameplayStop()` khi người chơi mở menu hoặc Game Over.
* **Khoảng nghỉ quảng cáo (Ad Cooldown):**
  * Tuyệt đối không gọi Interstitial Ad (quảng cáo giữa game) dày đặc hơn **3 phút/lần**.
  * Nếu người chơi vừa vào game 30 giây đã bị ép xem ad, họ sẽ bấm tắt tab $\rightarrow$ Tụt session time $\rightarrow$ Thuật toán cắt giảm traffic.
* **Rewarded Ads (Quảng cáo nhận thưởng):**
  * Tỷ lệ người chơi tự nguyện bấm xem quảng cáo càng cao thì game càng được đánh giá là tạo ra giá trị kinh tế bền vững cho nền tảng.

---

## 5. Chiến Thuật Đẩy Thứ Hạng Bổ Trợ (Growth Hacks)

### 1. Khai thác nhãn "Updated" (Update Loop)
* Mỗi khi bạn phát hành một bản cập nhật tính năng, màn chơi mới hoặc sự kiện theo mùa, CrazyGames sẽ gắn nhãn **"Updated"** cho game của bạn.
* Nhãn này đưa game quay lại khu vực ưu tiên hiển thị tạm thời trên các danh mục tương ứng trong khoảng 48–72 giờ để đo lường lại các chỉ số.
* **Chiến thuật:** Cập nhật bản vá/nội dung nhỏ mỗi 2–3 tuần/lần thay vì gom vào một bản cập nhật lớn vài tháng một lần.

### 2. Tận dụng External Traffic để "Mồi" Thuật Toán (Traffic Seeding)
* Thuật toán CrazyGames phản hồi rất tích cực khi nhận thấy một lượng truy cập lớn đổ vào từ bên ngoài (YouTube, TikTok, Reddit, Discord).
* Khi thấy traffic ngoài tăng đột biến, hệ thống sẽ đánh giá đây là một "Tựa game có tiềm năng viral" và tự động mở van traffic nội bộ trên trang chủ để đón đầu xu hướng.

### 3. SEO Nội Sàn (Tagging & Taxonomy)
* Người dùng trên CrazyGames tìm kiếm rất nhiều qua thanh Search Bar và hệ thống Thẻ (Tags).
* Không chỉ chọn các danh mục lớn cạnh tranh gay gắt (`Action`, `Shooting`), hãy chọn đúng các tag ngách có lượt tìm kiếm ổn định nhưng ít game chất lượng:
  * Ví dụ: `Ragdoll`, `Physics`, `Stickman`, `Multiplayer Arena`, `Clicker`, `Tower Defense`.
  * Đảm bảo tên game và đoạn mô tả 100 từ đầu tiên chứa tự nhiên các từ khóa này.

---

## 6. Bảng Checklist Tự Kiểm Định Trước Khi Nộp Game

| Hạng mục | Tiêu chí kiểm tra | Đạt |
| :--- | :--- | :---: |
| **Kỹ thuật** | Dung lượng tải ban đầu $< 20\text{MB}$ (hoặc $< 50\text{MB}$) | [ ] |
| **Kỹ thuật** | Khởi động trong $< 5$ giây trên kết nối mạng trung bình | [ ] |
| **Kỹ thuật** | Tự động thích ứng kích thước toàn màn hình (Full Responsive) | [ ] |
| **Trải nghiệm** | Vào thẳng gameplay trong vòng 1 cú click chuột | [ ] |
| **Trải nghiệm** | Hệ thống lưu tiến trình (Local Save) hoạt động chính xác khi F5 | [ ] |
| **Nội dung** | Đầy đủ UI/Text tiếng Anh, cơ chế điều khiển trực quan | [ ] |
| **Visual** | Thumbnail chuẩn kích thước, tương phản cao, không vỡ nét | [ ] |
| **Visual** | Video preview 5–10s bắt mắt, thể hiện rõ vòng lặp chơi | [ ] |
| **Pháp lý** | Toàn bộ âm thanh, font chữ, hình ảnh có bản quyền hợp lệ | [ ] |