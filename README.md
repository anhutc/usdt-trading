# USDT Trading Analysis Tool

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/anhutc/usdt-trading)
[![Web Application](https://img.shields.io/badge/Web-App-brightgreen)](https://anhutc.github.io/usdt-trading/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

<div align="center">

**Công cụ phân tích thị trường tiền điện tử đa sàn giao dịch với tính năng quét và phát hiện cơ hội giao dịch USDT**

[🌐 Live Demo](https://anhutc.github.io/usdt-trading/) • [📁 Source Code](https://github.com/anhutc/usdt-trading)

</div>

## ✨ Tính Năng Nổi Bật

- **🔍 Quét Đa Sàn**: Hỗ trợ 6 sàn giao dịch lớn: Binance, OKX, Huobi, Gate, MEXC, Bybit
- **📊 Bộ Lọc Thông Minh**: Tùy chỉnh điều kiện nến, khối lượng và loại trừ token
- **📈 Hiển Thị Biểu Đồ**: Xem biểu đồ nến trực tiếp với đầy đủ thông tin giá
- **📱 Responsive Design**: Giao diện tối ưu cho cả desktop và mobile
- **⚡ Real-time Data**: Dữ liệu thị trường được cập nhật theo thời gian thực
- **🎯 Điều Kiện Nến Linh Hoạt**: 2 loại điều kiện phân tích nến

## 🛠 Công Nghệ Sử Dụng

**Frontend:**
- ![HTML5](https://skillicons.dev/icons?i=html) HTML5 Semantic
- ![CSS3](https://skillicons.dev/icons?i=css) CSS3 với Grid/Flexbox
- ![JavaScript](https://skillicons.dev/icons?i=js) Vanilla JavaScript ES6+

**APIs Integration:**
- Binance API
- OKX API  
- Huobi API
- Gate.io API
- MEXC API
- Bybit API

## 🚀 Bắt Đầu Nhanh

### Cài Đặt & Chạy Dự Án

```bash
# Clone repository
git clone https://github.com/anhutc/usdt-trading.git

# Di chuyển vào thư mục dự án
cd usdt-trading

# Mở file index.html trong trình duyệt
# Hoặc sử dụng local server:
python -m http.server 8000
# Truy cập: http://localhost:8000
```

### Sử Dụng GitHub Pages

Dự án đã được tối ưu cho GitHub Pages. Chỉ cần:
1. Push code lên repository `usdt-trading`
2. Kích hoạt GitHub Pages trong settings
3. Truy cập: `https://anhutc.github.io/usdt-trading/`

## 📖 Hướng Dẫn Sử Dụng

### 1. Thiết Lập Bộ Lọc
- **Chọn Sàn Giao Dịch**: Tick vào các sàn muốn quét
- **Thiết Lập Khoảng Thời Gian Nến**: Chọn khung thời gian phù hợp
- **Số Lượng Nến Phân Tích**: Mặc định 6 nến
- **Chu Kỳ Khối Lượng**: Thiết lập chu kỳ trung bình khối lượng (mặc định 20)

### 2. Điều Kiện Nến
- **Thân Nến**: |Giá đóng - Giá mở| / (Giá trần - Giá sàn) < N%
- **Thay Đổi Giá**: |Giá đóng - Giá mở| / Giá mở < N%

### 3. Loại Trừ
- **Token Đòn Bẩy**: Tự động loại trừ các token có đòn bẩy
- **Futures**: Loại trừ các hợp đồng tương lai

### 4. Quét & Phân Tích
Nhấn "Lọc dữ liệu thị trường" để bắt đầu quét. Hệ thống sẽ hiển thị:
- Tiến trình quét chi tiết
- Kết quả các cặp giao dịch tiềm năng
- Biểu đồ nến trực tiếp khi click "Xem"

## 🏪 Sàn Giao Dịch Hỗ Trợ

| Sàn | Trạng Thái | API Support |
|-----|------------|-------------|
| Binance | ✅ | Public API |
| OKX | ✅ | Public API |
| Huobi | ✅ | Public API |
| Gate.io | ✅ | Public API |
| MEXC | ✅ | Public API |
| Bybit | ✅ | Public API |

## 📊 Tính Năng Phân Tích

### Điều Kiện Nến Nhỏ
Phát hiện các cặp có nến nhỏ, cho thấy thị trường đang tích lũy:
```javascript
// Condition 1: Body < N%
Math.abs(close - open) / (high - low) < (conditionValue / 100)

// Condition 2: Price Change < N%  
Math.abs(close - open) / open < (conditionValue / 100)
```

### Phân Tích Khối Lượng
So sánh khối lượng hiện tại với trung bình chu kỳ để xác định sự bất thường.

## 🎨 Giao Diện

### Desktop View
- Panel lọc bên trái
- Kết quả hiển thị bên phải
- Biểu đồ modal overlay

### Mobile View  
- Nút toggle mở panel lọc
- Giao diện tối ưu cảm ứng
- Scroll horizontal cho bảng kết quả

## 📁 Cấu Trúc Dự Án

```
usdt-trading/
├── index.html          # File chính
├── style.css           # Stylesheet chính
├── script.js           # Logic ứng dụng
├── logo.png            # Favicon
└── README.md           # Tài liệu dự án
```

## 🔧 Tùy Chỉnh

### Thêm Sàn Giao Dịch Mới
```javascript
// Thêm HTML trong .exchange-section
<div class="exchange-item" id="new-exchange-item">
    <input type="checkbox" class="exchange-checkbox" id="newExchange">
    <span class="exchange-name">New Exchange</span>
    <select class="candle-interval-select" id="newExchangeCandleInterval" disabled>
        <!-- Options -->
    </select>
</div>

// Thêm logic trong script.js
// Xem hàm initializeExchangeIntervals() và scanMarketData()
```

### Tùy Chỉnh Điều Kiện Lọc
Chỉnh sửa các tham số trong `script.js`:
- `conditionValue`: Ngưỡng phần trăm
- `numberOfCandles`: Số nến phân tích
- `volumePeriods`: Chu kỳ khối lượng

## 🐛 Xử Lý Lỗi

Ứng dụng bao gồm cơ chế xử lý lỗi toàn diện:
- Hiển thị thông báo lỗi chi tiết
- Toast notifications cho hành động người dùng
- Fallback khi API không phản hồi

## 🤝 Đóng Góp

Đóng góp luôn được chào đón! Vui lòng:

1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## ⚠️ Lưu ý Quan Trọng

- Đây là công cụ phân tích, không phải lời khuyên đầu tư
- Luôn kiểm tra kỹ trước khi giao dịch
- Hiệu suất trong quá khứ không đảm bảo kết quả tương lai
- Sử dụng có trách nhiệm

## 👨‍💻 Tác Giả

**Đặng Văn Ánh**
- 🌐 Portfolio: [https://anhutc.github.io/](https://anhutc.github.io/)
- 💼 GitHub: [@anhutc](https://github.com/anhutc)
- 📧 Email: [anhutck58@gmail.com](mailto:anhutck58@gmail.com)

## 📞 Hỗ Trợ

Nếu bạn gặp vấn đề hoặc có câu hỏi:
1. Kiểm tra [Issues](https://github.com/anhutc/usdt-trading/issues)
2. Tạo issue mới với mô tả chi tiết
3. Liên hệ qua thông tin tác giả

---

<div align="center">

**⭐ Nếu bạn thấy dự án hữu ích, hãy cho nó một ngôi sao!**

*"From Bac Ninh With Love"*  
*© 2025 USDT Trading. All rights reserved.*

</div>
