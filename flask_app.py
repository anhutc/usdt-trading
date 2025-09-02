from flask import Flask, render_template_string, request
import requests
import ccxt
import logging
import time
import functools # Thêm import functools
import pandas as pd # Thêm import pandas
import numpy as np # Thêm import numpy
import plotly.graph_objects as go # Thêm import plotly
from datetime import datetime

# --- Cấu hình Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)

# --- Các hàm tiện ích ---
def get_exchange(exchange_id):
    """Khởi tạo đối tượng sàn giao dịch từ ccxt."""
    try:
        exchange_class = getattr(ccxt, exchange_id)
        exchange = exchange_class({
            'timeout': 30000,
            'enableRateLimit': True,
        })
        return exchange
    except Exception as e:
        logging.error(f"Lỗi khi khởi tạo sàn {exchange_id}: {e}")
        return None

def check_exchange_connectivity(exchange_id, public_endpoint=None):
    """Kiểm tra kết nối đến một sàn giao dịch bằng một public endpoint đơn giản."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        if exchange_id == 'binance':
            url = public_endpoint or "https://api.binance.com/api/v3/ping"
        elif exchange_id == 'huobi':
            url = public_endpoint or "https://api.huobi.pro/v1/common/symbols"
        elif exchange_id == 'okx':
            url = public_endpoint or "https://www.okx.com/api/v5/public/instruments?instType=SPOT"
        elif exchange_id == 'gate':
            url = public_endpoint or "https://api.gateio.ws/api/v4/spot/currencies"
        elif exchange_id == 'mexc':
            url = public_endpoint or "https://api.mexc.com/api/v3/exchangeInfo"
        elif exchange_id == 'bybit':
            url = public_endpoint or "https://api.bybit.com/v2/public/time"
        else:
            return f"Không có public endpoint mặc định cho sàn {exchange_id}", "warning"

        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            return f"Kết nối đến {exchange_id} thành công!", "success"
        else:
            return f"Kết nối đến {exchange_id} thất bại. Mã trạng thái: {response.status_code}", "error"
    except requests.exceptions.Timeout:
        return f"Kết nối đến {exchange_id} bị HẾT THỜI GIAN (Timeout).", "error"
    except requests.exceptions.ConnectionError:
        return f"Lỗi kết nối đến {exchange_id}. Kiểm tra mạng hoặc địa chỉ URL.", "error"
    except Exception as e:
        return f"Lỗi không xác định khi kết nối đến {exchange_id}: {e}", "error"


# --- Hàm lấy cặp USDT ---
@functools.lru_cache() # Thay thế @functools.lru_cache(maxsize=128) bằng @functools.lru_cache()
def fetch_all_usdt_pairs(exchange_id):
    """
    Truy xuất tất cả các cặp giao dịch USDT từ một sàn giao dịch.
    Sử dụng endpoint public, không cần API key.
    """
    exchange = get_exchange(exchange_id)
    if not exchange:
        logging.error(f"Could not initialize exchange {exchange_id} in fetch_all_usdt_pairs.") # Thêm logging
        return []

    try:
        markets = exchange.load_markets()
        usdt_pairs = [symbol for symbol in markets if symbol.endswith('/USDT')]
        logging.info(f"Đã tải {len(usdt_pairs)} cặp USDT từ {exchange_id}.")
        return usdt_pairs
    except Exception as e:
        logging.error(f"Failed to fetch USDT pairs from {exchange_id}: {e}", exc_info=True)
        return []


# --- Hàm lấy dữ liệu nến OHLCV ---
@functools.lru_cache() # Thay thế @functools.lru_cache(ttl=60) bằng @functools.lru_cache()
def fetch_ohlcv_data(exchange_id, symbol, timeframe, limit=100):
    exchange = get_exchange(exchange_id)
    if not exchange:
        logging.error(f"Không thể khởi tạo sàn {exchange_id} để lấy OHLCV.")
        return None

    try:
        ohlcv = exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
        if not ohlcv: return None

        df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        df = df.set_index('timestamp')
        return df
    except Exception as e:
        logging.error(f"Lỗi khi lấy OHLCV {symbol} từ {exchange_id} ({timeframe}): {e}", exc_info=True)
        return None

# --- Hàm tính Đường trung bình động đơn giản (SMA) ---
def calculate_sma(df, window):
    return df['close'].rolling(window=window).mean()

# --- Hàm xây dựng URL giao dịch trực tiếp ---
def build_trade_url(exchange_id, symbol):
    base_url = "#"
    if exchange_id == 'binance':
        base_url = f"https://www.binance.com/en/trade/{symbol.replace('/', '_')}"
    elif exchange_id == 'okx':
        base_url = f"https://www.okx.com/trade-spot/{symbol.replace('/', '-')}"
    elif exchange_id == 'huobi':
        base_url = f"https://www.huobi.com/exchange/{symbol.lower().replace('/', '_')}"
    elif exchange_id == 'gate':
        base_url = f"https://www.gate.io/trade/{symbol.replace('/', '_')}"
    elif exchange_id == 'mexc':
        base_url = f"https://www.mexc.com/exchange/{symbol.replace('/', '_')}"
    elif exchange_id == 'bybit':
        base_url = f"https://www.bybit.com/trade/{symbol.lower().replace('/', '/')}"
    return base_url

# --- Hàm kiểm tra nến Doji ---
def is_doji(open_price, high_price, low_price, close_price, max_body_percent, body_method="Theo biên độ nến"):
    body = abs(open_price - close_price)
    if body_method == "Theo biên độ nến":
        candle_range = high_price - low_price
        if candle_range == 0: return True # Nến flat, coi là doji
        body_percentage = (body / candle_range) * 100
    else: # Theo giá mở
        if open_price == 0: return False # Tránh chia cho 0
        body_percentage = (body / open_price) * 100
    
    return body_percentage <= max_body_percent

# --- Hàm kiểm tra khối lượng và Doji ---
def check_volume_and_doji(exchange_id, symbol, doji_timeframe, doji_lookback, doji_max_body_percent, doji_body_method, volume_lookback):
    df_ohlcv = fetch_ohlcv_data(exchange_id, symbol, doji_timeframe, limit=max(doji_lookback, volume_lookback) + 10) # Lấy thêm nến để đảm bảo tính toán
    if df_ohlcv is None or df_ohlcv.empty: return False

    # Lọc dữ liệu gần nhất (không quá 30 ngày)
    df_ohlcv = df_ohlcv[df_ohlcv.index > (datetime.now() - pd.Timedelta(days=30))]
    if len(df_ohlcv) < doji_lookback + volume_lookback: return False

    # Kiểm tra Doji cho các nến gần nhất
    doji_candles = []
    for i in range(1, doji_lookback + 1):
        idx = -i
        open_p, high_p, low_p, close_p = df_ohlcv.iloc[idx][['open', 'high', 'low', 'close']]
        if is_doji(open_p, high_p, low_p, close_p, doji_max_body_percent, doji_body_method):
            doji_candles.append(df_ohlcv.iloc[idx])

    if not doji_candles: return False

    # Tính toán khối lượng trung bình và kiểm tra
    recent_volume = df_ohlcv['volume'].iloc[-volume_lookback-1:-1].mean()
    for doji_c in doji_candles:
        if doji_c['volume'] > recent_volume * 1.5: # Khối lượng nến Doji gấp 1.5 lần trung bình
            return True
    return False


EXCHANGES = ['binance', 'okx', 'huobi', 'gate', 'mexc', 'bybit']

@app.route('/')
def index():
    connectivity_results = {}
    connected_exchanges = []
    for ex_id in EXCHANGES:
        message, status = check_exchange_connectivity(ex_id)
        connectivity_results[ex_id] = {'message': message, 'status': status}
        if status == "success":
            connected_exchanges.append(ex_id)
        time.sleep(1) # Tăng độ trễ giữa các lần kiểm tra

    connectivity_items = connectivity_results.items()

    # default_selected_exchanges sẽ chỉ bao gồm các sàn đã kết nối thành công
    default_selected_exchanges = connected_exchanges

    html_output = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Giao Dịch USDT - Phân Tích Nến Doji</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background-color: #2e3b4e; color: #f0f2f6; line-height: 1.6; }
            .container { max-width: 1200px; margin: auto; padding: 20px; background-color: #3b4759; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); }
            h1, h2, h3 { color: #4CAF50; text-align: center; margin-bottom: 20px; }
            .sidebar { background-color: #4a596b; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .sidebar h3 { color: #f0f2f6; text-align: left; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #5d6d7e; padding-bottom: 10px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input[type="number"], select, button { width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #5d6d7e; background-color: #2e3b4e; color: #f0f2f6; margin-top: 5px; }
            input[type="checkbox"] { margin-right: 10px; }
            button { background-color: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 1em; margin-top: 10px; transition: background-color 0.3s ease; }
            button:hover { background-color: #45a049; }
            .result-item { padding: 10px 15px; margin-bottom: 10px; border-radius: 5px; font-weight: bold; }
            .success { background-color: #4CAF50; color: white; }
            .error { background-color: #f44336; color: white; }
            .warning { background-color: #ff9800; color: white; }
            .info { background-color: #2196F3; color: white; }
            .expander { background-color: #5d6d7e; padding: 15px; border-radius: 8px; margin-top: 20px; }
            .expander-header { cursor: pointer; font-weight: bold; color: #f0f2f6; display: flex; justify-content: space-between; align-items: center; }
            .expander-content { display: none; margin-top: 10px; }
            .expander-content.show { display: block; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #5d6d7e; padding: 8px; text-align: left; }
            th { background-color: #4a596b; color: white; }
            .footer { text-align: center; margin-top: 30px; font-size: 0.8em; color: #a0a0a0; }
        </style>
        <script>
            function toggleExpander(id) {
                var content = document.getElementById(id);
                if (content.classList.contains('show')) {
                    content.classList.remove('show');
                } else {
                    content.classList.add('show');
                }
            }
        </script>
    </head>
    <body>
        <div class="container">
            <h1>Giao Dịch USDT</h1>

            <div class="sidebar">
                <h3>Kiểm tra kết nối sàn (Public Endpoints)</h3>
                {% for ex_id, result in connectivity_items %}
                    <div class="result-item {{ result.status }}">{{ result.message }}</div>
                {% endfor %}
                {% if connected_exchanges %}
                    <div class="result-item info">Đã kết nối thành công với: {{ ', '.join(connected_exchanges) }}</div>
                {% else %}
                    <div class="result-item error">Không thể kết nối đến bất kỳ sàn giao dịch nào.</div>
                {% endif %}

                <h3>Bộ Lọc & Cấu Hình</h3>
                <form action="/filter" method="post">
                    <div class="form-group">
                        <label for="limit_results">Giới hạn kết quả:</label>
                        <input type="number" id="limit_results" name="limit_results" value="20" min="0">
                    </div>
                    <div class="form-group">
                        <label for="selected_exchanges">Sàn giao dịch:</label>
                        <select id="selected_exchanges" name="selected_exchanges" multiple>
                            {% for ex in all_exchanges %}
                                <option value="{{ ex }}" {% if ex in default_selected_exchanges %}selected{% endif %}>{{ ex | capitalize }}</option>
                            {% endfor %}
                        </select>
                    </div>
                    <div class="form-group">
                        <input type="checkbox" id="exclude_leveraged_futures" name="exclude_leveraged_futures" checked>
                        <label for="exclude_leveraged_futures">Loại trừ token đòn bẩy/hợp đồng tương lai</label>
                    </div>

                    <div class="expander">
                        <div class="expander-header" onclick="toggleExpander('dojiVolumeSettings')">
                            Tùy chỉnh Doji & Volume <span>&#9660;</span>
                        </div>
                        <div id="dojiVolumeSettings" class="expander-content">
                            <div class="form-group">
                                <label for="doji_lookback">Số lượng nến gần nhất để kiểm tra Doji:</label>
                                <input type="number" id="doji_lookback" name="doji_lookback" value="3" min="1" max="10">
                            </div>
                            <div class="form-group">
                                <label for="doji_timeframe">Khung thời gian nến Doji:</label>
                                <select id="doji_timeframe" name="doji_timeframe">
                                    <option value="1m">1 phút</option>
                                    <option value="5m">5 phút</option>
                                    <option value="15m">15 phút</option>
                                    <option value="1h" selected>1 giờ</option>
                                    <option value="4h">4 giờ</option>
                                    <option value="1d">1 ngày</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="doji_body_method">Phương pháp tính tỷ lệ thân nến Doji:</label>
                                <select id="doji_body_method" name="doji_body_method">
                                    <option value="Theo biên độ nến">Theo biên độ nến</option>
                                    <option value="Theo giá mở">Theo giá mở</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="doji_max_body_percent">Tỷ lệ phần trăm thân nến tối đa để được coi là Doji (%):</label>
                                <input type="number" id="doji_max_body_percent" name="doji_max_body_percent" value="5.0" step="0.1" min="0.0" max="10.0">
                            </div>
                            <div class="form-group">
                                <label for="volume_lookback">Số lượng nến để tính khối lượng trung bình:</label>
                                <input type="number" id="volume_lookback" name="volume_lookback" value="20" min="5" max="50">
                            </div>
                        </div>
                    </div>
                    <button type="submit">Tìm kiếm cặp USDT phù hợp</button>
                </form>
            </div>

            <h2>Kết quả lọc cặp USDT</h2>
            {% if filtered_pairs_data %}
                <table>
                    <thead>
                        <tr>
                            <th>Sàn giao dịch</th>
                            <th>Cặp USDT</th>
                            <th>Giá hiện tại</th>
                            <th>Giá cao nhất</th>
                            <th>Giá thấp nhất</th>
                            <th>Link Sàn</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for row in filtered_pairs_data %}
                            <tr>
                                <td>{{ row['Sàn giao dịch'] }}</td>
                                <td><a href="/detail/{{ row['Sàn giao dịch'] }}/{{ row['Cặp usdt'] }}">{{ row['Cặp usdt'] }}</a></td>
                                <td>{{ row['Giá hiện tại'] }}</td>
                                <td>{{ row['Giá cao nhất'] }}</td>
                                <td>{{ row['Giá thấp nhất'] }}</td>
                                <td><a href="{{ row['Link Sàn'] }}" target="_blank">Giao dịch</a></td>
                            </tr>
                        {% endfor %}
                    </tbody>
                </table>
            {% else %}
                <p>{{ filtering_status }}</p>
            {% endif %}

            <h2 style="margin-top: 50px;">Chi tiết cặp & Biểu đồ</h2>
            <p>Thông tin chi tiết và biểu đồ nến sẽ hiển thị ở đây khi một cặp được chọn.</p>

            <div class="footer">
                <p>&copy; 2025 Giao Dịch USDT. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return render_template_string(html_output,
                                  connectivity_items=connectivity_items,
                                  connected_exchanges=connected_exchanges,
                                  all_exchanges=EXCHANGES,
                                  default_selected_exchanges=default_selected_exchanges, # Mặc định chọn các sàn đã kết nối
                                  filtered_pairs_data=None, # Sẽ được điền sau khi lọc
                                  filtering_status="Chưa bắt đầu")

@app.route('/filter', methods=['POST'])
def filter_pairs():
    limit_results = int(request.form.get('limit_results', 20))
    selected_exchanges = request.form.getlist('selected_exchanges')
    exclude_leveraged_futures = 'exclude_leveraged_futures' in request.form
    doji_lookback = int(request.form.get('doji_lookback', 3))
    doji_timeframe = request.form.get('doji_timeframe', '1h')
    doji_body_method = request.form.get('doji_body_method', 'Theo biên độ nến')
    doji_max_body_percent = float(request.form.get('doji_max_body_percent', 5.0))
    volume_lookback = int(request.form.get('volume_lookback', 20))

    all_filtered_pairs = []
    for exchange_id in selected_exchanges:
        pairs = fetch_all_usdt_pairs(exchange_id)
        if pairs:
            # Logic loại trừ token đòn bẩy/hợp đồng tương lai
            if exclude_leveraged_futures:
                pairs = [p for p in pairs if not any(keyword in p.upper() for keyword in ['UP/', 'DOWN/', 'BULL/', 'BEAR/', 'PERP', 'FUTURES'])]
            
            for pair in pairs:
                # Kiểm tra Doji và khối lượng
                if check_volume_and_doji(exchange_id, pair, doji_timeframe, doji_lookback, doji_max_body_percent, doji_body_method, volume_lookback):
                    all_filtered_pairs.append({'Sàn giao dịch': exchange_id, 'Cặp usdt': pair})
    
    # Áp dụng giới hạn kết quả
    if limit_results > 0:
        all_filtered_pairs = all_filtered_pairs[:limit_results]

    # Chuyển đổi sang DataFrame và sau đó sang list of dicts để hiển thị trong template
    import pandas as pd # Đảm bảo pandas được import
    df_filtered_pairs = pd.DataFrame(all_filtered_pairs)
    
    # Thêm các cột placeholder cho Giá hiện tại, Giá cao nhất, Giá thấp nhất, Link Sàn
    if not df_filtered_pairs.empty:
        for index, row in df_filtered_pairs.iterrows():
            exchange_id = row['Sàn giao dịch']
            pair = row['Cặp usdt']
            
            exchange = get_exchange(exchange_id)
            if exchange:
                try:
                    ticker = exchange.fetch_ticker(pair)
                    df_filtered_pairs.loc[index, 'Giá hiện tại'] = ticker['last']
                    df_filtered_pairs.loc[index, 'Giá cao nhất'] = ticker['high']
                    df_filtered_pairs.loc[index, 'Giá thấp nhất'] = ticker['low']
                except Exception as e:
                    logging.warning(f"Không thể lấy ticker cho {pair} trên {exchange_id}: {e}")
            
            df_filtered_pairs.loc[index, 'Link Sàn'] = build_trade_url(exchange_id, pair)
    
    filtered_pairs_data = df_filtered_pairs.to_dict(orient='records')
    filtering_status = f"Hoàn tất tìm kiếm. Tìm thấy {len(filtered_pairs_data)} cặp."
    if not filtered_pairs_data:
        filtering_status = "Không tìm thấy cặp nào."

    # Lấy lại trạng thái kết nối sàn để hiển thị trên trang
    connectivity_results = {}
    connected_exchanges = []
    for ex_id in EXCHANGES:
        message, status = check_exchange_connectivity(ex_id)
        connectivity_results[ex_id] = {'message': message, 'status': status}
        if status == "success":
            connected_exchanges.append(ex_id)
    connectivity_items = connectivity_results.items()
    default_selected_exchanges = connected_exchanges

    return render_template_string(html_output,
                                  connectivity_items=connectivity_items,
                                  connected_exchanges=connected_exchanges,
                                  all_exchanges=EXCHANGES,
                                  default_selected_exchanges=default_selected_exchanges,
                                  filtered_pairs_data=filtered_pairs_data,
                                  filtering_status=filtering_status)


@app.route('/detail/<exchange_id>/<path:pair_symbol>')
def pair_detail(exchange_id, pair_symbol):
    # Lấy timeframe từ query parameter hoặc mặc định là 1h
    timeframe = request.args.get('timeframe', '1h')
    limit = 100 # Số lượng nến mặc định

    df_ohlcv = fetch_ohlcv_data(exchange_id, pair_symbol, timeframe, limit=limit)

    if df_ohlcv is None or df_ohlcv.empty:
        return render_template_string("""
        <h1>Lỗi</h1><p>Không thể tải dữ liệu nến cho {{ pair_symbol }} trên {{ exchange_id }}.</p>
        """, exchange_id=exchange_id, pair_symbol=pair_symbol)

    # Tính toán SMA
    df_ohlcv['SMA_7'] = calculate_sma(df_ohlcv, 7)
    df_ohlcv['SMA_25'] = calculate_sma(df_ohlcv, 25)
    df_ohlcv['SMA_99'] = calculate_sma(df_ohlcv, 99)

    # Thông tin nến gần nhất
    last_candle = df_ohlcv.iloc[-1]
    current_price = last_candle['close']
    open_price = last_candle['open']
    high_price = last_candle['high']
    low_price = last_candle['low']
    close_price = last_candle['close']
    volume = last_candle['volume']
    
    # Tính toán độ biến động (Volatility) và Biên độ nến (Range)
    volatility = (high_price - low_price) / close_price * 100 if close_price else 0
    candle_range = (high_price - low_price)
    body = abs(open_price - close_price)
    upper_shadow = high_price - max(open_price, close_price)
    lower_shadow = min(open_price, close_price) - low_price

    # Tính toán khối lượng bằng USDT
    volume_usdt = volume * close_price

    # Xây dựng biểu đồ nến với Plotly
    fig = go.Figure(data=[
        go.Candlestick(
            x=df_ohlcv.index,
            open=df_ohlcv['open'],
            high=df_ohlcv['high'],
            low=df_ohlcv['low'],
            close=df_ohlcv['close'],
            name='Nến'
        ),
        go.Scatter(x=df_ohlcv.index, y=df_ohlcv['SMA_7'], mode='lines', name='SMA 7', line=dict(color='orange', width=1)),
        go.Scatter(x=df_ohlcv.index, y=df_ohlcv['SMA_25'], mode='lines', name='SMA 25', line=dict(color='purple', width=1)),
        go.Scatter(x=df_ohlcv.index, y=df_ohlcv['SMA_99'], mode='lines', name='SMA 99', line=dict(color='blue', width=1))
    ])

    fig.update_layout(
        title=f'{pair_symbol} - Biểu đồ Nến ({timeframe})',
        xaxis_rangeslider_visible=False,
        xaxis_title='Thời gian',
        yaxis_title='Giá',
        template='plotly_dark',
        height=600
    )

    # Biểu đồ khối lượng riêng biệt
    fig_volume = go.Figure(data=[
        go.Bar(
            x=df_ohlcv.index,
            y=df_ohlcv['volume'],
            name='Khối lượng',
            marker_color='rgba(0,128,0,0.7)'
        )
    ])
    fig_volume.update_layout(
        xaxis_title='Thời gian',
        yaxis_title='Khối lượng',
        template='plotly_dark',
        height=200
    )

    chart_html = fig.to_html(full_html=False, include_plotlyjs='cdn')
    volume_chart_html = fig_volume.to_html(full_html=False, include_plotlyjs='cdn')
    trade_url = build_trade_url(exchange_id, pair_symbol)

    detail_html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chi Tiết Cặp {{ pair_symbol }}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background-color: #2e3b4e; color: #f0f2f6; line-height: 1.6; }
            .container { max-width: 1200px; margin: auto; padding: 20px; background-color: #3b4759; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); }
            h1, h2, h3 { color: #4CAF50; text-align: center; margin-bottom: 20px; }
            .info-box { background-color: #4a596b; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-around; }
            .info-item { flex: 1 1 calc(33% - 40px); min-width: 200px; background-color: #3b4759; padding: 10px; border-radius: 5px; }
            .info-item strong { color: #4CAF50; }
            .chart-container { background-color: #3b4759; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .timeframe-selector { text-align: center; margin-bottom: 20px; }
            .timeframe-selector a { color: #4CAF50; text-decoration: none; padding: 8px 15px; border: 1px solid #4CAF50; border-radius: 5px; margin: 0 5px; transition: background-color 0.3s ease; }
            .timeframe-selector a.active, .timeframe-selector a:hover { background-color: #4CAF50; color: white; }
            .trade-link { display: block; text-align: center; margin-top: 20px; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; transition: background-color 0.3s ease; }
            .trade-link:hover { background-color: #1976D2; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Chi Tiết Cặp: {{ pair_symbol }} ({{ exchange_id | capitalize }})</h1>
            
            <div class="timeframe-selector">
                <h3>Chọn Khung Thời Gian:</h3>
                <a href="/detail/{{ exchange_id }}/{{ pair_symbol }}?timeframe=1m" {% if timeframe == '1m' %}class="active"{% endif %}>1m</a>
                <a href="/detail/{{ exchange_id }}/{{ pair_symbol }}?timeframe=5m" {% if timeframe == '5m' %}class="active"{% endif %}>5m</a>
                <a href="/detail/{{ exchange_id }}/{{ pair_symbol }}?timeframe=15m" {% if timeframe == '15m' %}class="active"{% endif %}>15m</a>
                <a href="/detail/{{ exchange_id }}/{{ pair_symbol }}?timeframe=1h" {% if timeframe == '1h' %}class="active"{% endif %}>1h</a>
                <a href="/detail/{{ exchange_id }}/{{ pair_symbol }}?timeframe=4h" {% if timeframe == '4h' %}class="active"{% endif %}>4h</a>
                <a href="/detail/{{ exchange_id }}/{{ pair_symbol }}?timeframe=1d" {% if timeframe == '1d' %}class="active"{% endif %}>1d</a>
            </div>

            <div class="info-box">
                <div class="info-item"><strong>Giá hiện tại:</strong> {{ current_price | round(5) }}</div>
                <div class="info-item"><strong>Giá mở:</strong> {{ open_price | round(5) }}</div>
                <div class="info-item"><strong>Giá cao:</strong> {{ high_price | round(5) }}</div>
                <div class="info-item"><strong>Giá thấp:</strong> {{ low_price | round(5) }}</div>
                <div class="info-item"><strong>Giá đóng:</strong> {{ close_price | round(5) }}</div>
                <div class="info-item"><strong>Khối lượng:</strong> {{ volume | round(2) }}</div>
                <div class="info-item"><strong>Khối lượng USDT:</strong> {{ volume_usdt | round(2) }}</div>
                <div class="info-item"><strong>Độ biến động:</strong> {{ volatility | round(2) }}%</div>
                <div class="info-item"><strong>Biên độ nến:</strong> {{ candle_range | round(5) }}</div>
                <div class="info-item"><strong>Thân nến:</strong> {{ body | round(5) }}</div>
                <div class="info-item"><strong>Bóng trên:</strong> {{ upper_shadow | round(5) }}</div>
                <div class="info-item"><strong>Bóng dưới:</strong> {{ lower_shadow | round(5) }}</div>
                <div class="info-item"><strong>SMA 7:</strong> {{ df_ohlcv['SMA_7'].iloc[-1] | round(5) }}</div>
                <div class="info-item"><strong>SMA 25:</strong> {{ df_ohlcv['SMA_25'].iloc[-1] | round(5) }}</div>
                <div class="info-item"><strong>SMA 99:</strong> {{ df_ohlcv['SMA_99'].iloc[-1] | round(5) }}</div>
            </div>

            <div class="chart-container">
                {{ chart_html | safe }}
                {{ volume_chart_html | safe }}
            </div>

            <a href="{{ trade_url }}" target="_blank" class="trade-link">Giao Dịch trên {{ exchange_id | capitalize }}</a>
        </div>
    </body>
    </html>
    """
    return render_template_string(detail_html,
                                  exchange_id=exchange_id,
                                  pair_symbol=pair_symbol,
                                  timeframe=timeframe,
                                  current_price=current_price,
                                  open_price=open_price,
                                  high_price=high_price,
                                  low_price=low_price,
                                  close_price=close_price,
                                  volume=volume,
                                  volume_usdt=volume_usdt,
                                  volatility=volatility,
                                  candle_range=candle_range,
                                  body=body,
                                  upper_shadow=upper_shadow,
                                  lower_shadow=lower_shadow,
                                  df_ohlcv=df_ohlcv,
                                  chart_html=chart_html,
                                  volume_chart_html=volume_chart_html,
                                  trade_url=trade_url)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
