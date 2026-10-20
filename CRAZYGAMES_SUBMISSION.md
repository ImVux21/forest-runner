# 🎮 CRAZYGAMES SUBMISSION GUIDE & VERIFICATION DOSSIER
**Game:** Forest Runner — 3D Open-World Adventure & Time Trial  
**Platform:** CrazyGames (SDK v3, HTML5)  
**Status:** ✅ ALL TECHNICAL & ALGORITHM AUDIT CHECKS PASSED — READY TO SUBMIT

---

## 1. TAB 1: UPLOAD FILES (Tải Tệp Lên)

| Mục Form | Giá trị chọn / Nhập | Ghi chú từ Playbook |
|---|---|---|
| **Game Engine** | `HTML5` | |
| **Upload Files** | **Kéo thả toàn bộ nội dung trong thư mục `dist/`** | ⚠️ **Portal từ chối file `.zip`** (gây lỗi *"Archive files are not supported"*). Mở thư mục `dist/`, bôi đen toàn bộ (gồm `index.html` và thư mục `assets/`), kéo thả trực tiếp vào vùng tải lên. |
| **Does your game save progress?** | `Yes, using LocalStorage (refer to Automatic Progress Save)` | Game lưu coins, high scores, wardrobe skins, và daily challenge vào `localStorage`. |
| **The game supports mobile devices** | ☑️ **Checked (Có)** | Full touch controls: Virtual D-Pad, Jump, Sprint, Glide, Camera rotation, Talk. |
| **The game is an online multiplayer game** | ⬜ **Unchecked (Không)** | Single-player open world & time trial. |
| **The game supports CrazyGames muting audio through SDK** | ☑️ **Checked (Có)** | Đã tích hợp `CrazySDK.addSettingsChangeListener` và `visibilitychange`. |

---

## 2. TAB 2: QA REQUIREMENTS CHECKLIST (Danh Sách Kiểm Duyệt)

| Tiêu chí QA | Giá trị chọn | Ghi chú xác thực thực tế |
|---|:---:|---|
| **Initial download size <50MB** | `Yes (automatic)` | Bundle thực tế: **11.69 MB** (Đạt chuẩn < 20MB Mobile Homepage). |
| **First gameplay start** | `Yes (automatic)` | SDK tự động ghi nhận khi khởi chạy. |
| **First gameplay start implemented correctly** | **`Yes`** | `CrazySDK.gameplayStart()` được kích hoạt ngay khi người chơi bấm Start Explore hoặc Time Trial. |
| **Complies to Gameplay requirements** | **`Yes`** | Gameplay 3D hoàn chỉnh, có Finn NPC hướng dẫn, quest tracker, vòng lặp ngày/đêm, không đứt gãy logic. |
| **Runs on all CrazyGames domains** | **`Yes`** | Đường dẫn tương đối 100% (`base: './'`), không khóa domain, tương thích iframe sandbox. |
| **Browser checks** | **`Yes`** | Hoạt động mượt mà trên Chrome, Firefox, Safari, Edge qua chuẩn Three.js WebGL2/WebGL. |
| **Device checks: Mobile** | **`Yes`** | Giao diện tự động co giãn (responsive), nút điều khiển ảo D-Pad, cảm ứng xoay camera. |
| **No external ads** | **`Yes`** | 100% không gắn AdSense hay mạng quảng cáo bên ngoài. Chỉ dùng CrazyGames SDK v3. |
| **Does not offer external login options** | **`Yes`** | Không yêu cầu đăng nhập tài khoản ngoài. |
| **In-game mention of Terms / Privacy Policy** | **`N/A`** | Game độc lập, không thu thập bất kỳ dữ liệu cá nhân nào. |

---

## 3. TAB 3: DETAILS & METADATA (Thông Tin Game & SEO)

### 🏷️ Title & Category
* **Game Title:**
  ```text
  Forest Runner — 3D Open-World Adventure & Time Trial
  ```
* **Category:**
  ```text
  Adventure
  ```
  *(Secondary: Action, Casual)*

* **Tags (Chọn 5 tags chiến lược kéo traffic):**
  ```text
  3D, Physics, Platformer, Open World, Exploration
  ```
  *(Các tag phụ phù hợp: Flight, Survival, Time Trial, 1 Player)*

---

### 📝 Short Description
```text
Soar through mystical floating sky islands, conquer mountain summits with your falcon glider, and break the ancient nightfall curse in an expansive 3D fantasy open world!
```

---

### 📖 Full Description (Bullet Points — NO HTML ALLOWED)
```text
Forest Runner is an immersive 3D open-world adventure featuring fluid glider physics, high-flying thermal updrafts, and thrilling time trial sprints. Explore the ancient valley of Eldoria, discover hidden sky temples, leap off sheer cliffs to glide across misty canyons, and launch into the clouds with spring mushrooms.

Key Features:
- Expansive 3D Open World: Wander through whispering forests, cross wooden suspension bridges, and ascend ancient ruins across 5 unique vertical biomes.
- Falcon Glider Physics: Catch wind currents and thermal updrafts to glide effortlessly between floating mountain peaks.
- Dual Game Modes: Freely explore at your own pace with NPC quests, or test your speed in the competitive Time Trial mode with combo multipliers.
- Dynamic Day & Night Cycle: Witness scenic golden dawns, vibrant daylight, and survive the eerie Nightfall Curse.
- Quests & Lore: Meet Old Explorer Finn, Master Alchemist Bram, and the enigmatic Forest Spirit to uncover forgotten legends.
- Customization & Daily Challenges: Collect gleaming emerald shards to unlock unique explorer outfits in the Wardrobe and complete fresh daily challenges.
- Responsive Cross-Platform Controls: Full keyboard & mouse controls for desktop, plus intuitive virtual touch controls for mobile browsers.
```

---

### 🎮 Controls Documentation
```text
[Desktop / Keyboard & Mouse]
- Move: W, A, S, D or Arrow Keys
- Jump: Spacebar
- Falcon Glider: Hold Spacebar while airborne
- Sprint: Left Shift
- Camera Look / Orbit: Click and drag with mouse
- Interact / Talk: E (when near NPCs)
- Toggle Map & Lore: Click Lore button on HUD

[Mobile / Touch Devices]
- Move: Virtual D-Pad on the lower-left corner
- Jump: Jump button (arrow up)
- Glide: Hold Glider wing button while mid-air
- Sprint: Sprint icon button (toggle run speed)
- Camera Look: Swipe and drag on screen or tap rotation arrows
- Talk: [E] Action button when approaching characters
```

---

## 4. TAB 4: MEDIA ASSETS (Ảnh Bìa & Video)

Tất cả ảnh đã được sinh chuẩn kích thước pixel bắt buộc của CrazyGames và lưu tại thư mục `crazygames-assets/` (đồng thời có sẵn trong `public/`):

| Loại Asset | Kích thước chuẩn | File upload | Trạng thái |
|---|:---:|---|:---:|
| **Landscape Cover (16:9)** | `1920 x 1080 px` | `crazygames-assets/cover_landscape_1920x1080.png` | ✅ Đã tạo (325 KB) |
| **Portrait Cover (2:3)** | `800 x 1200 px` | `crazygames-assets/cover_portrait_800x1200.png` | ✅ Đã tạo (126 KB) |
| **Square Cover (1:1)** | `800 x 800 px` | `crazygames-assets/cover_square_800x800.png` | ✅ Đã tạo (128 KB) |
| **Standard Thumbnail** | `512 x 384 px` | `crazygames-assets/thumbnail_512x384.png` | ✅ Sẵn sàng (75 KB) |
| **Square Icon** | `512 x 512 px` | `crazygames-assets/icon_512x512.png` | ✅ Sẵn sàng (78 KB) |

---

## 5. AUDIT KỸ THUẬT ĐÃ HOÀN TẤT TRƯỚC KHI SUBMIT

1. **Khử hoàn toàn lỗi Iframe Scrollbar:**
   - Đã đổi `width: 100vw; height: 100vh;` thành `width: 100%; height: 100%;` kết hợp `touch-action: none; overflow: hidden;` trong `index.html`.
2. **Tuân thủ quy định Ad Cooldown 3 phút:**
   - Đã sửa `CrazySDK.lastMidgameAdTime = Date.now()` (khởi tạo tại thời điểm nạp game, không để 0).
   - Chặn tuyệt đối Midgame ad trong 180 giây đầu để bảo vệ retention ($D_1$) và không vi phạm quy định nền tảng.
3. **Vòng đời SDK chuẩn hóa (Lifecycle):**
   - Đã tích hợp `CrazySDK.loadingStart()` ngay khi SDK init.
   - Gọi `CrazySDK.loadingStop()` khi nạp xong scene 3D, terrain và nhân vật.
   - Gọi `CrazySDK.gameplayStart()` khi người chơi bắt đầu tương tác.
4. **Tự động Mute & Pause khi rời tab / CrazyGames Toolbar:**
   - Đã lắng nghe sự kiện `visibilitychange` (tắt tiếng Web Audio context, gọi `gameplayStop()`).
   - Đã tích hợp `CrazySDK.addSettingsChangeListener` lắng nghe nút Mute của thanh công cụ CrazyGames.
5. **Kiểm thử tự động:**
   - 202/202 unit & integration tests đều vượt qua (100% PASS).
   - Bản build production `npm run build` hoàn thành trong < 1.2 giây, bundle nén gọn gàng.
