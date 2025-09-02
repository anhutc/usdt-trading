# USDT Trading Bot

This Streamlit application helps users identify potential trading opportunities for USDT pairs across multiple cryptocurrency exchanges by filtering for "Doji" candlesticks with high trading volume.

## Features

*   **Multi-Exchange Support:** Connects to Binance, OKX, Huobi, Gate, MEXC, and Bybit.
*   **Doji Candle Detection:** Identifies Doji-like candlesticks based on user-defined criteria.
*   **High Volume Filtering:** Filters pairs where the Doji candle's volume exceeds the average volume.
*   **Token Exclusion:** Option to exclude leverage tokens (UP/DOWN/BULL/BEAR) and futures tokens (PERP/FUTURES).
*   **Interactive Charts:** Visualize candlestick data, volatility, and Simple Moving Averages (SMAs) for selected pairs.
*   **Responsive UI:** User-friendly interface optimized for various screen sizes.

## How to Use

### 1. Prerequisites

*   Python 3.7+
*   `pip` (Python package installer)

### 2. Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/usdt-trading.git
    cd usdt-trading
    ```
2.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv
    venv\Scripts\activate  # On Windows
    source venv/bin/activate # On macOS/Linux
    ```
3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

### 3. Running the Application

To run the Streamlit application, execute the following command in your terminal:

```bash
streamlit run app.py
```

The application will open in your web browser, typically at `http://localhost:8501`.

### 4. Application Interface

The application interface consists of a sidebar for filters and a main area for displaying results and charts.

#### Sidebar Options:

*   **Giới hạn kết quả (Max Results):** Set a limit on the number of pairs to display. Enter `0` for no limit.
*   **Sàn giao dịch (Exchanges):** Select the cryptocurrency exchanges you want to search on.
*   **Loại trừ (Exclusion):**
    *   **Token đòn bẩy (Leverage Tokens):** Exclude tokens like UP/DOWN/BULL/BEAR.
    *   **Hợp đồng tương lai (Futures Tokens):** Exclude tokens like PERP/FUTURES.
*   **Tùy chỉnh Doji & Volume (Doji & Volume Customization):**
    *   **Số nến gần nhất để kiểm tra Doji (Number of recent candles for Doji check):** Define how many recent candles to analyze for Doji patterns.
    *   **Khung thời gian nến Doji (Doji Candle Timeframe):** Select the timeframe for the candles (e.g., 1 phút, 1 ngày, 3 ngày).
    *   **Cách tính tỷ lệ thân nến Doji (Doji body percentage calculation method):** Choose between 'Theo biên độ nến' (By candle range) or 'Theo giá mở' (By open price).
    *   **Tỷ lệ thân nến Doji tối đa (%):** Set the maximum percentage for the Doji candle body.
    *   **Số nến tính Volume trung bình (Number of candles for average Volume):** Define the period for calculating average volume.

#### Main Area:

*   **Tìm kiếm cặp usdt phù hợp (Search for suitable USDT pairs):** Click this button to start the filtering process.
*   **Dừng (Stop):** Stop the ongoing filtering process.
*   **Filtered Pairs Table:** Displays the list of USDT pairs that meet your criteria, including the exchange, pair name, current price, high, low, and a direct link to the trading page on the exchange.
*   **Detailed Chart:** When you select a pair from the table, a detailed candlestick chart will appear, showing price action, volume, and various moving averages (SMA 7, SMA 25, SMA 99). You can select different timeframes for the chart.

## Deployment on Heroku

The application is designed to be deployable on Heroku. The `Dockerfile` and `Procfile` are included for this purpose.

## Contributing

Feel free to fork the repository, make improvements, and submit pull requests.

## License

This project is open source and available under the MIT License.
