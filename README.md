# Giao Dịch USDT - Streamlit App

Ứng dụng Streamlit để tìm kiếm các cặp giao dịch USDT có mẫu hình Doji và volume cao.

## Cài đặt

```bash
pip install -r requirements.txt
```

## Chạy ứng dụng

```bash
streamlit run app.py
```

## Về Streamlit Cloud

Khi triển khai trên Streamlit Cloud, một số sàn giao dịch có thể không hoạt động do:

### Sàn hoạt động tốt:
- **MEXC** - Thường hoạt động ổn định
- **Gate.io** - Tương đối ổn định

### Sàn có thể gặp vấn đề:
- **Binance** - Có thể bị chặn hoặc rate limit
- **OKX** - Đôi khi gặp timeout
- **Huobi** - Có thể bị chặn ở một số khu vực
- **Bybit** - Đôi khi gặp vấn đề kết nối

### Giải pháp:
1. Chỉ chọn MEXC và Gate để có kết quả tốt nhất
2. Thử lại sau vài phút nếu gặp lỗi
3. Kiểm tra kết nối internet
4. Sử dụng VPN nếu cần thiết

## Tính năng

- Tìm kiếm cặp USDT có mẫu hình Doji
- Lọc theo volume trung bình
- Hiển thị biểu đồ nến với SMA
- Hỗ trợ nhiều sàn giao dịch
- Giao diện thân thiện

## Lưu ý

Ứng dụng này chỉ dành cho mục đích phân tích và không phải là lời khuyên đầu tư.
