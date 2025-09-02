import streamlit as st
import ccxt
import pandas as pd
import altair as alt
import requests
import logging
import time

# --- Cấu hình Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- CSS Tùy chỉnh ---
st.markdown("""
<style>
    .reportview-container .main .block-container {
        max-width: 1200px;
        padding-top: 2rem;
        padding-right: 2rem;
        padding-left: 2rem;
        padding-bottom: 2rem;
    }
    .full-width-chart .stPlotlyChart {
        width: 100% !important;
    }
    .st-emotion-cache-1cypcdb { /* Sidebar width on smaller screens */
        width: 250px;
    }
    @media (max-width: 768px) {
        .reportview-container .main .block-container {
            padding-top: 1rem;
            padding-right: 1rem;
            padding-left: 1rem;
        }
        .st-emotion-cache-1cypcdb { /* Adjust sidebar width for mobile */
            width: 100% !important;
        }
    }
    .main-header {
        font-size: 2.5em;
        font-weight: bold;
        color: #4CAF50;
        text-align: center;
        margin-bottom: 1.5em;
    }
    .stNotification {
        font-size: 0.9em;
    }
</style>
""", unsafe_allow_html=True)

# --- Cấu hình trang ---
st.set_page_config(
    page_title="Giao Dịch USDT - Phân Tích Nến Doji",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- Các hàm tiện ích ---
@st.cache_data(ttl=3600) # Cache kết quả trong 1 giờ
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

@st.cache_data(ttl=600) # Cache kết quả trong 10 phút
def fetch_all_usdt_pairs(exchange_id):
    """
    Truy xuất tất cả các cặp giao dịch USDT từ một sàn giao dịch.
    Sử dụng endpoint public, không cần API key.
    """
    exchange = get_exchange(exchange_id)
    if not exchange:
        st.error(f"Không thể khởi tạo sàn {exchange_id}.")
        return []

    try:
        markets = exchange.load_markets()
        usdt_pairs = [symbol for symbol in markets if symbol.endswith('/USDT')]
        logging.info(f"Đã tải {len(usdt_pairs)} cặp USDT từ {exchange_id}.")
        return usdt_pairs
    except Exception as e:
        st.error(f"Lỗi khi lấy cặp USDT từ {exchange_id}: {e}")
        logging.error(f"Failed to fetch USDT pairs from {exchange_id}: {e}", exc_info=True)
        return []

def check_exchange_connectivity(exchange_id, public_endpoint=None):
    """Kiểm tra kết nối đến một sàn giao dịch bằng một public endpoint đơn giản."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        if exchange_id == 'binance':
            url = public_endpoint or "https://data.binance.com/api/v3/exchangeInfo" # Endpoint public để lấy thông tin sàn
        elif exchange_id == 'huobi':
            url = public_endpoint or "https://api.huobi.pro/v1/common/symbols" # Một public endpoint khác không cần xác thực
        elif exchange_id == 'okx':
            url = public_endpoint or "https://www.okx.com/api/v5/public/instruments?instType=SPOT"
        elif exchange_id == 'gate':
            url = public_endpoint or "https://api.gateio.ws/api/v4/spot/currencies"
        elif exchange_id == 'mexc':
            url = public_endpoint or "https://api.mexc.com/api/v3/exchangeInfo"
        elif exchange_id == 'bybit':
            url = public_endpoint or "https://api.bybit.com/v5/market/time" # Endpoint public để lấy thời gian máy chủ
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


# --- Giao diện người dùng ---
st.markdown("<h1 class='main-header'>Giao Dịch USDT</h1>", unsafe_allow_html=True)

# Sidebar
st.sidebar.header("Bộ Lọc & Cấu Hình")

# Kiểm tra kết nối sàn ban đầu
st.sidebar.subheader("Kiểm tra kết nối sàn (Public Endpoints)")
EXCHANGES = ['binance', 'okx', 'huobi', 'gate', 'mexc', 'bybit']
connectivity_results = {}

for ex_id in EXCHANGES:
    message, status = check_exchange_connectivity(ex_id)
    connectivity_results[ex_id] = status
    if status == "success":
        st.sidebar.success(message)
    elif status == "warning":
        st.sidebar.warning(message)
    else:
        st.sidebar.error(message)
    time.sleep(2) # Tăng độ trễ lên 2 giây giữa các lần kiểm tra để tránh giới hạn tỷ lệ

# Hiển thị thông báo tổng quan
connected_exchanges = [ex for ex, status in connectivity_results.items() if status == "success"]
if connected_exchanges:
    st.sidebar.info(f"Đã kết nối thành công với: {', '.join(connected_exchanges)}")
else:
    st.sidebar.error("Không thể kết nối đến bất kỳ sàn giao dịch nào.")

# Các tùy chọn lọc placeholder
st.sidebar.number_input("Giới hạn kết quả:", min_value=0, value=20, key="limit_results")
st.sidebar.multiselect("Sàn giao dịch:", options=EXCHANGES, default=EXCHANGES, key="selected_exchanges")
st.sidebar.checkbox("Loại trừ token đòn bẩy/hợp đồng tương lai", value=True, key="exclude_leveraged_futures")

with st.sidebar.expander("Tùy chỉnh Doji & Volume"):
    st.slider("Số lượng nến gần nhất để kiểm tra Doji:", 1, 10, 3, key="doji_lookback")
    st.selectbox("Khung thời gian nến Doji:", ["1m", "5m", "15m", "1h", "4h", "1d"], key="doji_timeframe")
    st.selectbox("Phương pháp tính tỷ lệ thân nến Doji:", ["Theo biên độ nến", "Theo giá mở"], key="doji_body_method")
    st.slider("Tỷ lệ phần trăm thân nến tối đa để được coi là Doji (%):", 0.0, 10.0, 5.0, key="doji_max_body_percent")
    st.slider("Số lượng nến để tính khối lượng trung bình:", 5, 50, 20, key="volume_lookback")

# Nút tìm kiếm
if st.sidebar.button("Tìm kiếm cặp USDT phù hợp"):
    st.write("Đang tìm kiếm...")
    # Logic tìm kiếm sẽ được thêm vào đây
    st.info("Chức năng tìm kiếm sẽ được triển khai chi tiết sau.")

# Khu vực hiển thị kết quả chính
st.subheader("Kết quả lọc cặp USDT")
st.write("Các cặp giao dịch phù hợp sẽ hiển thị ở đây sau khi tìm kiếm.")

st.subheader("Chi tiết cặp & Biểu đồ")
st.write("Thông tin chi tiết và biểu đồ nến sẽ hiển thị ở đây khi một cặp được chọn.")

# --- Quản lý trạng thái (placeholder) ---
if 'filtering_status' not in st.session_state:
    st.session_state.filtering_status = "Chưa bắt đầu"
if 'filtered_pairs_data' not in st.session_state:
    st.session_state.filtered_pairs_data = pd.DataFrame()
if 'selected_pair_info' not in st.session_state:
    st.session_state.selected_pair_info = None
