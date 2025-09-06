# Ứng dụng USDT Trading

Đây là một ứng dụng web được thiết kế để quét các sàn giao dịch tiền điện tử khác nhau (Binance, OKX, Huobi, Gate.io, MEXC, Bybit) để tìm các cặp giao dịch USDT dựa trên các điều kiện nến và khối lượng tùy chỉnh. Ứng dụng bao gồm một máy chủ proxy CORS để xử lý các yêu cầu API.

## Tính năng

-   Quét nhiều sàn giao dịch tiền điện tử để tìm các cặp giao dịch USDT.
-   Lọc kết quả dựa trên các điều kiện nến (phần trăm thân nến, thay đổi giá).
-   Tổng hợp dữ liệu cho các khoảng thời gian khác nhau (ví dụ: 30 phút, 1 giờ, 1 ngày, 3 ngày, 1 tuần, 1 tháng).
-   Giao diện người dùng đáp ứng cho máy tính để bàn và thiết bị di động.
-   Tích hợp proxy CORS để vượt qua các hạn chế cross-origin cho các cuộc gọi API.

## Cài đặt cục bộ

Để chạy dự án này cục bộ, hãy làm theo các bước sau:

1.  **Sao chép kho lưu trữ (nếu chưa):**
    ```bash
    git clone <địa-chỉ-repo-của-bạn>
    cd usdt
    ```

2.  **Cài đặt các phụ thuộc của Node.js:**
    ```bash
    npm install
    ```

3.  **Khởi động máy chủ proxy CORS:**
    Máy chủ sẽ chạy trên `http://localhost:8080` theo mặc định.
    ```bash
    npm start
    ```

4.  **Mở `index.html`:**
    Khi máy chủ đang chạy, hãy mở `index.html` trong trình duyệt web của bạn. Frontend sẽ giao tiếp với proxy CORS cục bộ.

## Triển khai Heroku

Ứng dụng này được thiết kế để có thể triển khai trên Heroku.

-   **Tên ứng dụng:** `usdt-trading`
-   **URL đã triển khai:** `https://usdt-trading-9817606488f2.herokuapp.com/`

`Procfile` cấu hình Heroku để chạy `npm start`, lệnh này thực thi `cors-proxy.js`. `script.js` tự động điều chỉnh URL proxy CORS cho việc triển khai Heroku.

---

**Được phát triển bởi:** [DVA]
**Năm:** 2025
