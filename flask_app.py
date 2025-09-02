from flask import Flask, render_template_string
import requests
import ccxt
import logging
import time

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

EXCHANGES = ['binance', 'okx', 'huobi', 'gate', 'mexc', 'bybit']

@app.route('/')
def index():
    connectivity_results = {}
    for ex_id in EXCHANGES:
        message, status = check_exchange_connectivity(ex_id)
        connectivity_results[ex_id] = {'message': message, 'status': status}
        time.sleep(1) # Tăng độ trễ giữa các lần kiểm tra

    # Chuyển đổi dict sang list các tuple để tránh lỗi parsing template Jinja2
    connectivity_items = connectivity_results.items()

    html_output = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kiểm Tra Kết Nối Sàn</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background-color: #2e3b4e; color: #f0f2f6; }
            .container { max-width: 800px; margin: auto; padding: 20px; background-color: #3b4759; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); }
            h1 { color: #4CAF50; text-align: center; margin-bottom: 30px; }
            .result-item { padding: 10px 15px; margin-bottom: 10px; border-radius: 5px; font-weight: bold; }
            .success { background-color: #4CAF50; color: white; }
            .error { background-color: #f44336; color: white; }
            .warning { background-color: #ff9800; color: white; }
            .info { background-color: #2196F3; color: white; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Kiểm Tra Kết Nối Sàn (Public Endpoints)</h1>
            {% for ex_id, result in connectivity_items %}
                <div class="result-item {{ result.status }}">{{ result.message }}</div>
            {% endfor %}
            {% set connected_exchanges = [ex for ex, result in connectivity_items if result.status == 'success'] %}
            {% if connected_exchanges %}
                <div class="result-item info">Đã kết nối thành công với: {{ ', '.join(connected_exchanges) }}</div>
            {% else %}
                <div class="result-item error">Không thể kết nối đến bất kỳ sàn giao dịch nào.</div>
            {% endif %}
        </div>
    </body>
    </html>
    """
    return render_template_string(html_output, connectivity_items=connectivity_items)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
