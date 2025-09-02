from flask import Flask, render_template_string, request
import requests
import ccxt
import logging
import time
import functools # Thêm import functools
import pandas as pd # Thêm import pandas

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
@functools.lru_cache(maxsize=128) # Thay thế @app.cache bằng @functools.lru_cache
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
                # Tạm thời bỏ qua logic Doji và khối lượng, sẽ thêm sau
                all_filtered_pairs.append({'Sàn giao dịch': exchange_id, 'Cặp usdt': pair})
    
    # Áp dụng giới hạn kết quả
    if limit_results > 0:
        all_filtered_pairs = all_filtered_pairs[:limit_results]

    # Chuyển đổi sang DataFrame và sau đó sang list of dicts để hiển thị trong template
    import pandas as pd # Đảm bảo pandas được import
    df_filtered_pairs = pd.DataFrame(all_filtered_pairs)
    
    # Thêm các cột placeholder cho Giá hiện tại, Giá cao nhất, Giá thấp nhất, Link Sàn
    if not df_filtered_pairs.empty:
        df_filtered_pairs['Giá hiện tại'] = "N/A"
        df_filtered_pairs['Giá cao nhất'] = "N/A"
        df_filtered_pairs['Giá thấp nhất'] = "N/A"
        df_filtered_pairs['Link Sàn'] = "#"
    
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
