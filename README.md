# Ứng dụng Giao Dịch USDT

Ứng dụng Streamlit này giúp người dùng xác định các cơ hội giao dịch tiềm năng cho các cặp USDT trên nhiều sàn giao dịch tiền điện tử bằng cách lọc các nến "Doji" có khối lượng giao dịch cao.

## Tính năng

*   **Hỗ trợ đa sàn giao dịch:** Kết nối với Binance, OKX, Huobi, Gate, MEXC và Bybit.
*   **Phát hiện nến Doji:** Xác định các nến giống Doji dựa trên tiêu chí do người dùng định nghĩa.
*   **Lọc theo khối lượng cao:** Lọc các cặp mà khối lượng của nến Doji vượt quá khối lượng trung bình.
*   **Loại trừ token:** Tùy chọn loại trừ các token đòn bẩy (UP/DOWN/BULL/BEAR) và token hợp đồng tương lai (PERP/FUTURES).
*   **Biểu đồ tương tác:** Trực quan hóa dữ liệu nến, độ biến động và các đường trung bình động đơn giản (SMA 7, SMA 25, SMA 99) cho các cặp được chọn.
*   **Giao diện người dùng đáp ứng:** Giao diện thân thiện với người dùng được tối ưu hóa cho nhiều kích thước màn hình.

## Cách sử dụng

### 1. Điều kiện tiên quyết

*   Python 3.7+
*   `pip` (Trình cài đặt gói Python)

### 2. Cài đặt

1.  **Sao chép kho lưu trữ:**
    ```bash
    git clone https://github.com/your-username/usdt-trading.git
    cd usdt-trading
    ```
2.  **Tạo môi trường ảo (khuyến nghị):**
    ```bash
    python -m venv venv
    venv\Scripts\activate  # Trên Windows
    source venv/bin/activate # Trên macOS/Linux
    ```
3.  **Cài đặt các phụ thuộc:**
    ```bash
    pip install -r requirements.txt
    ```

### 3. Chạy ứng dụng

Để chạy ứng dụng Streamlit, thực thi lệnh sau trong terminal của bạn:

```bash
streamlit run app.py
```

Ứng dụng sẽ mở trong trình duyệt web của bạn, thường là tại `http://localhost:8501`.

### 4. Giao diện ứng dụng

Giao diện ứng dụng bao gồm một thanh bên cho các bộ lọc và một khu vực chính để hiển thị kết quả và biểu đồ.

#### Tùy chọn thanh bên:

*   **Giới hạn kết quả (Max Results):** Đặt giới hạn số lượng cặp hiển thị. Nhập `0` để không giới hạn.
*   **Sàn giao dịch (Exchanges):** Chọn các sàn giao dịch tiền điện tử bạn muốn tìm kiếm.
*   **Loại trừ (Exclusion):**
    *   **Token đòn bẩy (Leverage Tokens):** Loại trừ các token như UP/DOWN/BULL/BEAR.
    *   **Hợp đồng tương lai (Futures Tokens):** Loại trừ các token như PERP/FUTURES.
*   **Tùy chỉnh Doji & Volume (Doji & Volume Customization):**
    *   **Số nến gần nhất để kiểm tra Doji (Number of recent candles for Doji check):** Xác định số lượng nến gần đây để phân tích mẫu Doji.
    *   **Khung thời gian nến Doji (Doji Candle Timeframe):** Chọn khung thời gian cho nến (ví dụ: 1 phút, 1 ngày, 3 ngày).
    *   **Cách tính tỷ lệ thân nến Doji (Doji body percentage calculation method):** Chọn giữa 'Theo biên độ nến' hoặc 'Theo giá mở'.
    *   **Tỷ lệ thân nến Doji tối đa (%):** Đặt tỷ lệ phần trăm tối đa cho thân nến Doji.
    *   **Số nến tính Volume trung bình (Number of candles for average Volume):** Xác định khoảng thời gian để tính khối lượng trung bình.

#### Khu vực chính:

*   **Tìm kiếm cặp usdt phù hợp (Search for suitable USDT pairs):** Nhấp vào nút này để bắt đầu quá trình lọc.
*   **Dừng (Stop):** Dừng quá trình lọc đang diễn ra.
*   **Bảng các cặp đã lọc:** Hiển thị danh sách các cặp USDT đáp ứng tiêu chí của bạn, bao gồm sàn giao dịch, tên cặp, giá hiện tại, giá cao, giá thấp và liên kết trực tiếp đến trang giao dịch trên sàn.
*   **Biểu đồ chi tiết:** Khi bạn chọn một cặp từ bảng, biểu đồ nến chi tiết sẽ xuất hiện, hiển thị hành động giá, khối lượng và các đường trung bình động khác nhau (SMA 7, SMA 25, SMA 99). Bạn có thể chọn các khung thời gian khác nhau cho biểu đồ.

## Triển khai trên Heroku

Ứng dụng được thiết kế để có thể triển khai trên Heroku. Các tệp `Dockerfile` và `Procfile` được bao gồm cho mục đích này.

## Đóng góp

Bạn có thể tự do sao chép kho lưu trữ, thực hiện cải tiến và gửi yêu cầu kéo (pull request).

## Giấy phép

Dự án này là mã nguồn mở và có sẵn theo Giấy phép MIT.
