import requests # Import the requests module
import streamlit as st
import pandas as pd
import ccxt
import datetime
import numpy as np
import altair as alt
import concurrent.futures
import os # Import the os module
import time # Import the time module for delays
import logging # Import the logging module

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Configuration ---

# Check if the application is running on Heroku
is_heroku_deployment = os.getenv('DYNO') is not None

# Initialize session state for filtering status
if "filtering_in_progress" not in st.session_state:
    st.session_state.filtering_in_progress = False
if 'start_filtering_triggered' not in st.session_state:
    st.session_state.start_filtering_triggered = False
if 'df_filtered_pairs' not in st.session_state:
    st.session_state.df_filtered_pairs = pd.DataFrame()
if 'max_results_display' not in st.session_state:
    st.session_state.max_results_display = 0
if 'selected_pair_data' not in st.session_state:
    st.session_state.selected_pair_data = None
if 'selected_pair_index' not in st.session_state:
    st.session_state.selected_pair_index = None
# Initialize selected_timeframe in session_state if not already present
if 'selected_timeframe_label' not in st.session_state:
    st.session_state.selected_timeframe_label = "3 ngày"
if 'selected_timeframe_value' not in st.session_state:
    st.session_state.selected_timeframe_value = "3d"
if 'stop_filtering' not in st.session_state:
    st.session_state.stop_filtering = False
if 'max_results_input_value' not in st.session_state:
    st.session_state.max_results_input_value = 0
if 'stop_button_disabled_temp' not in st.session_state:
    st.session_state.stop_button_disabled_temp = False
if 'current_filtered_pairs_list' not in st.session_state:
    st.session_state.current_filtered_pairs_list = []


st.set_page_config(
    layout="wide",
    page_title="Giao Dịch USDT",
    page_icon="📈",
    initial_sidebar_state="expanded"
)

# Add custom CSS for better mobile experience
st.markdown("""
<style>
    @media (max-width: 768px) {
        .main .block-container {
            padding-left: 1rem;
            padding-right: 1rem;
        }
        .stButton > button {
            width: 100%;
            margin-bottom: 0.5rem;
        }
        .stDataFrame {
            font-size: 12px;
        }
    }
    
    /* Improve sidebar on mobile */
    @media (max-width: 768px) {
        .css-1d391kg {
            width: 100%;
        }
    }
    
    /* Better spacing for mobile */
    .main .block-container {
        padding-top: 1rem; /* Reduced from 2rem */
        padding-bottom: 2rem;
    }
</style>
""", unsafe_allow_html=True)

st.markdown("<h1 style='text-align: center;'>Giao Dịch USDT</h1>", unsafe_allow_html=True)

# Placeholders for status and progress
status_message_placeholder = st.empty()
progress_bar_placeholder = st.empty()

# Function to get cached exchange object
@st.cache_resource
def get_exchange_object(exchange_name):
    exchange_class = getattr(ccxt, exchange_name)
    config = {
        'enableRateLimit': True,
            'timeout': 30000,
        'rateLimit': 1000,
    }
    if exchange_name in ['mexc', 'gate', 'okx']:
        config['timeout'] = 20000
        config['rateLimit'] = 800
    if exchange_name == 'binance':
        config['timeout'] = 45000
        config['rateLimit'] = 1200
        config['options'] = {
            'defaultType': 'spot',
            'adjustForTimeDifference': True,
        }
    return exchange_class(config)

# Function to fetch data directly from Binance API
@st.cache_data(ttl=3600) # Cache for 1 hour
def _fetch_binance_data_direct(endpoint, params=None):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        url = f"https://api.binance.com/api/v3/{endpoint}"
        logging.info(f"Đang yêu cầu Binance API: {url} với tham số {params}") # Thay thế st.write bằng logging.info
        response = requests.get(url, params=params, headers=headers, timeout=30)
        response.raise_for_status()  # Raise an exception for HTTP errors
        data = response.json()
        logging.info(f"Phản hồi từ Binance API (rút gọn): {str(data)[:200]}...") # Thay thế st.write bằng logging.info
        return data
    except requests.exceptions.RequestException as e:
        st.warning(f"Lỗi khi lấy dữ liệu từ Binance API trực tiếp: {e}")
        return None

# Function to fetch all USDT pairs from an exchange
@st.cache_data(ttl=3600) # Cache for 1 hour
def get_all_pairs(exchange_name):
    if exchange_name == 'binance':
        try:
            exchange_info = _fetch_binance_data_direct('exchangeInfo')
            if exchange_info:
                usdt_pairs = []
                for symbol_info in exchange_info['symbols']:
                    if symbol_info['quoteAsset'] == 'USDT' and symbol_info['status'] == 'TRADING':
                        usdt_pairs.append(f"{symbol_info['baseAsset']}/{symbol_info['quoteAsset']}")
                return usdt_pairs
            return []
        except Exception as e:
            st.warning(f"Lỗi khi lấy tất cả các cặp Binance trực tiếp: {e}")
            return []
    else:
        try:
            exchange = get_exchange_object(exchange_name)
            markets = exchange.load_markets()
            
            usdt_pairs = []
            for symbol in markets:
                if symbol.endswith('/USDT'):
                    usdt_pairs.append(symbol)
            return usdt_pairs
        except ccxt.NetworkError as e:
            if exchange_name == 'binance' and is_heroku_deployment:
                st.warning(f"⚠️ Binance có thể bị chặn hoặc rate limit. Lỗi: {e}")
            else:
                st.warning(f"Lỗi mạng khi kết nối với {exchange_name}: {e}")
            return []
        except ccxt.ExchangeError as e:
            if exchange_name == 'binance' and is_heroku_deployment:
                st.warning(f"⚠️ Binance API error: {e}")
            else:
                st.warning(f"Lỗi sàn giao dịch {exchange_name}: {e}")
            return []
        except Exception as e:
            if exchange_name == 'binance' and is_heroku_deployment:
                st.warning(f"⚠️ Binance không khả dụng: {e}")
            else:
                st.warning(f"Đã xảy ra lỗi không mong muốn với {exchange_name}: {e}")
            return []

def filter_doji_volume(pair, exchange_name, num_doji_candles, doji_candle_timeframe, doji_body_percentage, avg_volume_candles, doji_calculation_method):
    try:
        ohlcvs = []
        if exchange_name == 'binance':
            binance_symbol = pair.replace('/', '')
            interval_map = {
                '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
                '1h': '1h', '4h': '4h', '1d': '1d', '3d': '3d', '1w': '1w'
            }
            binance_interval = interval_map.get(doji_candle_timeframe, '1d')
            limit_candles = max(num_doji_candles, avg_volume_candles)
            
            # Try 3d first, then fallback to 1d
            data = _fetch_binance_data_direct('klines', {'symbol': binance_symbol, 'interval': '3d', 'limit': limit_candles})
            if not data or len(data) == 0:
                data = _fetch_binance_data_direct('klines', {'symbol': binance_symbol, 'interval': '1d', 'limit': limit_candles * 3}) # Fetch more for 1d to simulate 3d if needed

            if data:
                # Convert Binance klines format to desired OHLCV format
                ohlcvs = [[int(k[0]), float(k[1]), float(k[2]), float(k[3]), float(k[4]), float(k[5])] for k in data]
            
        else:
            exchange = get_exchange_object(exchange_name)
            limit_candles = max(num_doji_candles, avg_volume_candles)
            ohlcvs = exchange.fetch_ohlcv(pair, doji_candle_timeframe, limit=limit_candles)
        
        if not ohlcvs or len(ohlcvs) < limit_candles:
            return False

        df = pd.DataFrame(ohlcvs, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')

        # --- BẮT ĐẦU: LỌC DỮ LIỆU GẦN NHẤT ---
        latest_candle_timestamp = df['timestamp'].iloc[-1]
        now = datetime.datetime.now()
        thirty_days_ago = now - datetime.timedelta(days=30)

        if latest_candle_timestamp < thirty_days_ago:
            return False # Loại bỏ nếu nến gần nhất cũ hơn 30 ngày
        # --- KẾT THÚC: LỌC DỮ LIỆU GẦN NHẤT ---

        doji_found = False
        doji_volume = 0

        # Check the last `num_doji_candles` for Doji
        for i in range(-num_doji_candles, 0): # Use num_doji_candles
            candle = df.iloc[i]
            open_price = candle['open']
            high_price = candle['high']
            low_price = candle['low']
            close_price = candle['close']
            volume = candle['volume']

            # Calculate body size percentage based on selected method
            body_percentage = 0.0
            if doji_calculation_method == 'Theo biên độ nến':
                if high_price == low_price:
                    body_percentage = 0
                else:
                    body_percentage = abs(close_price - open_price) / (high_price - low_price) * 100
            elif doji_calculation_method == 'Theo giá mở':
                if open_price == 0:
                    body_percentage = 0
            else:
                    body_percentage = abs(close_price - open_price) / open_price * 100

            # Doji condition
            if body_percentage < doji_body_percentage:
                doji_found = True
                doji_volume = volume
                break
        
        if doji_found:
            # Calculate `avg_volume_candles`-period average volume
            average_volume = df['volume'].iloc[-avg_volume_candles:].mean()
            if doji_volume > average_volume:
                return True
        return False

    except ccxt.NetworkError:
        return False
    except ccxt.ExchangeError:
        return False
    except Exception:
        return False

# Function to fetch candlestick data
@st.cache_data(ttl=600) # Cache for 10 minutes
def get_candle_data(pair, exchange_name, timeframe, limit):
    if exchange_name == 'binance':
        try:
            binance_symbol = pair.replace('/', '')
            interval_map = {
                "1s": "1s", "15m": "15m", "1h": "1h", "4h": "4h",
                "1d": "1d", "3d": "3d", "1w": "1w"
            }
            binance_interval = interval_map.get(timeframe, '1d')
            data = _fetch_binance_data_direct('klines', {'symbol': binance_symbol, 'interval': binance_interval, 'limit': limit})
            if data:
                ohlcvs = [[int(k[0]), float(k[1]), float(k[2]), float(k[3]), float(k[4]), float(k[5])] for k in data]
                df = pd.DataFrame(ohlcvs, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
                return df
            return pd.DataFrame()
        except Exception as e:
            st.warning(f"Không thể lấy dữ liệu nến cho {pair} trên Binance (trực tiếp): {e}")
            return pd.DataFrame()
    else:
        try:
            exchange = get_exchange_object(exchange_name)
            ohlcvs = exchange.fetch_ohlcv(pair, timeframe, limit=limit)
            df = pd.DataFrame(ohlcvs, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            return df
        except Exception as e:
            st.warning(f"Không thể lấy dữ liệu nến cho {pair} trên {exchange_name}: {e}")
            return pd.DataFrame()

# Function to calculate Simple Moving Average (SMA)
def calculate_sma(df, window):
    return df['close'].rolling(window=window).mean()

# Function to get trade URL for each exchange
def get_exchange_trade_url(exchange_name, pair):
    base, quote = pair.split('/')
    symbol_for_url = f"{base}_{quote}"

    if exchange_name.lower() == 'binance':
        return f"https://www.binance.com/en/trade/{symbol_for_url}"
    elif exchange_name.lower() == 'okx':
        # OKX uses BASE-QUOTE format for spot
        return f"https://www.okx.com/trade-spot/{base}-{quote}"
    elif exchange_name.lower() == 'huobi':
        # Huobi often uses lowercase for pairs in URL, e.g., btcusdt
        return f"https://www.huobi.com/en-us/exchange/{base.lower()}{quote.lower()}"
    elif exchange_name.lower() == 'gate':
        return f"https://www.gate.io/trade/{symbol_for_url}"
    elif exchange_name.lower() == 'mexc':
        return f"https://www.mexc.com/exchange/{symbol_for_url}"
    elif exchange_name.lower() == 'bybit':
        return f"https://www.bybit.com/trade/spot/{base}/{quote}"
    return "#"

# Sidebar for filters


st.sidebar.markdown("### Giới hạn kết quả")
max_results_sidebar_input = st.sidebar.number_input(
    'Số lượng tối đa',
    min_value=0,
    value=int(st.session_state.max_results_input_value),
    step=1,
    disabled=st.session_state.filtering_in_progress,
    key='max_results_input',
    help='Nhập 0 để không giới hạn kết quả'
)
st.session_state.max_results_input_value = max_results_sidebar_input
# If max_results_sidebar_input is 0, set to infinity for filtering logic
max_results_for_filtering_func = max_results_sidebar_input if max_results_sidebar_input > 0 else float('inf')
st.sidebar.markdown("---")

st.sidebar.markdown("### Sàn giao dịch")
exchanges = ['binance', 'okx', 'huobi', 'gate', 'mexc', 'bybit'] # Using lowercase for ccxt exchange IDs
selected_exchanges = []

# Add info about exchange status
# st.sidebar.markdown("*💡 MEXC, Gate và OKX thường hoạt động tốt nhất trên Streamlit Cloud*") # Xóa dòng này

# Add exchange status indicators
# st.sidebar.markdown("**Trạng thái sàn:**") # Xóa dòng này
# reliable_exchanges = ['mexc', 'gate', 'okx'] # Xóa dòng này
# for exchange_name in exchanges:
#     if exchange_name == 'binance':
#         status_icon = "🔴"
#         status_text = "Thường bị chặn"
#     elif exchange_name in reliable_exchanges:
#         status_icon = "🟢"
#         status_text = "Ổn định"
#     else:
#         status_icon = "🟡"
#         status_text = "Có thể gặp vấn đề"
#     st.sidebar.markdown(f"{status_icon} {exchange_name.capitalize()}: {status_text}") # Xóa dòng này

# Add specific note about Binance
# st.sidebar.markdown("---") # Xóa dòng này
# st.sidebar.markdown("**💡 Lưu ý:**") # Xóa dòng này
# st.sidebar.markdown("*Binance thường bị chặn ở nhiều khu vực. Nếu không hoạt động, hãy thử MEXC, Gate hoặc OKX.*") # Xóa dòng này

reliable_exchanges = ['binance', 'bybit']
for exchange_name in exchanges:
    status_text = ""
    if exchange_name in reliable_exchanges:
        status_text = "Thường bị chặn"
    else:
        status_text = "Hoạt động ổn định"

    if st.sidebar.checkbox(exchange_name.capitalize(), value=False, disabled=st.session_state.filtering_in_progress, key=f"exchange_{exchange_name}", help=status_text):
        selected_exchanges.append(exchange_name)
st.sidebar.markdown("---")

st.sidebar.markdown("### Loại trừ")
exclude_leverage_tokens = st.sidebar.checkbox('Token đòn bẩy', help='UP/DOWN/BULL/BEAR', value=True, disabled=st.session_state.filtering_in_progress, key='exclude_leverage_tokens')
exclude_futures_tokens = st.sidebar.checkbox('Hợp đồng tương lai', help='PERP/FUTURES', value=True, disabled=st.session_state.filtering_in_progress, key='exclude_futures_tokens')
st.sidebar.markdown("---")

st.sidebar.markdown("### Tùy chỉnh Doji & Volume")
num_doji_candles = st.sidebar.number_input('Số nến gần nhất để kiểm tra Doji', min_value=1, value=6, step=1, disabled=st.session_state.filtering_in_progress, key='num_doji_candles')
doji_candle_timeframe_options = {
    '1 phút': '1m',
    '5 phút': '5m',
    '15 phút': '15m',
    '30 phút': '30m',
    '1 giờ': '1h',
    '4 giờ': '4h',
    '1 ngày': '1d',
    '3 ngày': '3d',
    '1 tuần': '1w'
}
doji_candle_timeframe_label = st.sidebar.selectbox(
    'Khung thời gian nến Doji',
    options=list(doji_candle_timeframe_options.keys()),
    index=list(doji_candle_timeframe_options.keys()).index('3 ngày'), # '3d'
    disabled=st.session_state.filtering_in_progress,
    key='doji_timeframe_selector'
)
doji_candle_timeframe_value = doji_candle_timeframe_options[doji_candle_timeframe_label]
doji_calculation_method = st.sidebar.selectbox(
    'Cách tính tỷ lệ thân nến Doji',
    options=['Theo biên độ nến', 'Theo giá mở'],
    index=0, # Mặc định là "Theo biên độ nến"
    disabled=st.session_state.filtering_in_progress,
    key='doji_calc_method',
    help='Theo biên độ nến: |Giá đóng - Giá mở| / (Giá trần - Giá sàn) * 100 // Theo giá mở: |Giá đóng - Giá mở| / Giá mở * 100'
)
doji_body_percentage = st.sidebar.slider('Tỷ lệ thân nến Doji tối đa (%)', min_value=1.0, max_value=50.0, value=15.0, step=0.01, disabled=st.session_state.filtering_in_progress, key='doji_body_percentage')

avg_volume_candles = st.sidebar.number_input('Số nến tính Volume trung bình', min_value=5, value=20, step=1, disabled=st.session_state.filtering_in_progress, key='avg_volume_candles')

def perform_filtering(selected_exchanges, exclude_leverage_tokens, exclude_futures_tokens, max_results_input, status_placeholder, progress_placeholder):

    def _fetch_and_filter_initial_pairs_for_exchange(exchange_name, exclude_leverage_tokens, exclude_futures_tokens):
        try:
            all_pairs = get_all_pairs(exchange_name)
            filtered_initial_pairs = []
            for pair in all_pairs:
                exclude = False
                if exclude_leverage_tokens and ('UP/' in pair or 'DOWN/' in pair or 'BULL/' in pair or 'BEAR/' in pair):
                    exclude = True
                if exclude_futures_tokens and ('PERP/' in pair or 'FUTURES/' in pair):
                    exclude = True
                
                if not exclude:
                    filtered_initial_pairs.append(pair)
            return exchange_name, filtered_initial_pairs
        except Exception as e:
            st.warning(f"Lỗi khi xử lý sàn {exchange_name}: {e}")
            return exchange_name, []

    try:
        status_placeholder.info("Đang tìm kiếm... Vui lòng chờ.")
        
        # Determine the actual max_results to use
        max_results = max_results_input
        
        # Use session state to store filtered pairs data so it persists across reruns
        # and can be displayed even if filtering is stopped mid-way.
        # This list is cleared when 'Bắt Đầu Lọc' is clicked.
        # filtered_pairs_data = [] # No longer needed as a local variable
        
        # Initialize progress bar
        progress_text = "Đang lấy dữ liệu..."
        my_bar = progress_placeholder.progress(0, text=progress_text)
        
        total_exchanges = len(selected_exchanges)
        if total_exchanges == 0:
            my_bar.progress(1.0, text="Không có sàn giao dịch nào được chọn.")
            status_placeholder.warning("Không có sàn giao dịch nào được chọn.")
            return

        all_exchanges_initial_pairs = {} # Store results from concurrent fetching
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:  # Limit concurrent requests
            futures = {executor.submit(_fetch_and_filter_initial_pairs_for_exchange, exchange_name, exclude_leverage_tokens, exclude_futures_tokens): exchange_name for exchange_name in selected_exchanges}
            for i, future in enumerate(concurrent.futures.as_completed(futures)):
                if st.session_state.stop_filtering:
                    break # Stop if user initiated stop
                exchange_name_result = futures[future]
                try:
                    exchange_name_key, filtered_initial_pairs = future.result()
                    all_exchanges_initial_pairs[exchange_name_key] = filtered_initial_pairs
                except Exception as exc:
                    st.warning(f"Sàn {exchange_name_result} tạo ra một ngoại lệ: {exc}")
                finally:
                    progress_percentage_fetch = (i + 1) / total_exchanges
                    my_bar.progress(progress_percentage_fetch, text=f"Đang tải dữ liệu sàn: {exchange_name_result.capitalize()}...")
        
        if st.session_state.stop_filtering:
            status_placeholder.warning("Quá trình tìm kiếm đã dừng.")
            return

        # Now process each exchange's pairs sequentially for Doji/Volume filtering
        total_processed_exchanges = len(all_exchanges_initial_pairs)
        current_exchange_idx = 0

        for exchange_name in selected_exchanges:
            if st.session_state.stop_filtering: # Check for stop signal again before processing pairs
                status_placeholder.warning("Quá trình tìm kiếm đã dừng.")
                break
            if len(st.session_state.current_filtered_pairs_list) >= max_results:
                break
            
            filtered_initial_pairs = all_exchanges_initial_pairs.get(exchange_name, [])
            if not filtered_initial_pairs:
                current_exchange_idx += 1 # Increment even if no pairs to maintain progress accuracy
                continue

            total_pairs_for_exchange = len(filtered_initial_pairs)
            for j, pair in enumerate(filtered_initial_pairs):
                # Check if max results already reached
                if len(st.session_state.current_filtered_pairs_list) >= max_results:
                    break

                if st.session_state.stop_filtering: # Check for stop signal inside inner loop
                    status_placeholder.warning("Quá trình tìm kiếm đã dừng.")
                    break

                time.sleep(0.05) # Add a small delay for each pair to prevent rate limiting issues.
                
                # Update progress for each pair
                # The total progress now starts after initial fetching is done.
                # We need to refine the progress calculation for the second phase.
                progress_for_pairs_phase = (current_exchange_idx / total_processed_exchanges) + \
                                            ((j / total_pairs_for_exchange) * (1 / total_processed_exchanges))
                my_bar.progress(progress_for_pairs_phase, text=f"Đang kiểm tra {pair} trên {exchange_name.capitalize()} - Đã tìm thấy: {len(st.session_state.current_filtered_pairs_list)} cặp...")
                
                # Check for Doji and Volume condition
                if filter_doji_volume(pair, exchange_name, num_doji_candles, doji_candle_timeframe_value, doji_body_percentage, avg_volume_candles, doji_calculation_method):
                    try:
                        if exchange_name == 'binance':
                            binance_symbol_ticker = pair.replace('/', '')
                            ticker_data = _fetch_binance_data_direct('ticker/24hr', {'symbol': binance_symbol_ticker})
                            if ticker_data:
                                current_price = float(ticker_data['lastPrice'])
                                high_price = float(ticker_data['highPrice'])
                                low_price = float(ticker_data['lowPrice'])
                            else:
                                raise Exception("Không thể lấy dữ liệu ticker từ Binance trực tiếp")
                        else:
                            exchange_class = getattr(ccxt, exchange_name)
                            
                            # Optimize settings for working exchanges
                            config = {
                                'enableRateLimit': True,
                                'timeout': 30000,  # 30 seconds timeout
                                'rateLimit': 1000,  # 1 second between requests
                            }
                            
                            # Add specific optimizations for working exchanges
                            if exchange_name in ['mexc', 'gate', 'okx']:
                                config['timeout'] = 20000  # Shorter timeout for reliable exchanges
                                config['rateLimit'] = 800   # Faster rate for reliable exchanges
                            
                            exchange = exchange_class(config)
                            ticker = exchange.fetch_ticker(pair)
                            current_price = ticker['last']
                            high_price = ticker['high'] # Fetch high price
                            low_price = ticker['low']   # Fetch low price
                        
                        st.session_state.current_filtered_pairs_list.append({
                            'Sàn giao dịch': exchange_name.capitalize(),
                            'Cặp usdt': pair,
                            'Giá hiện tại': current_price,
                            'Giá cao nhất': high_price, # Add high price
                            'Giá thấp nhất': low_price,
                            'Link Sàn': get_exchange_trade_url(exchange_name, pair) # Add trade URL
                        })

                        # Update the DataFrame in session state after each new pair is found
                        st.session_state.df_filtered_pairs = pd.DataFrame(st.session_state.current_filtered_pairs_list)
                        # st.rerun() # Removed to prevent immediate rerun and allow filtering to complete
                    except Exception as e:
                        pass # Ignore errors for individual price fetches
            current_exchange_idx += 1 # Increment after processing all pairs for the current exchange
            time.sleep(0.1) # Add a small delay between exchange processing to prevent rate limiting
        
        my_bar.progress(1.0, text="Hoàn thành!") # Ensure progress bar reaches 1.0 (100%) at the end
        
        # Show exchange status summary
        working_exchanges = [ex for ex in selected_exchanges if all_exchanges_initial_pairs.get(ex, [])]
        if working_exchanges:
            status_placeholder.success(f"Hoàn thành! Các sàn hoạt động: {', '.join([ex.capitalize() for ex in working_exchanges])}")
        else:
            status_placeholder.warning("Không có sàn nào hoạt động. Vui lòng thử lại sau hoặc chọn sàn khác.")
        
        if st.session_state.current_filtered_pairs_list:
            df_filtered_pairs = pd.DataFrame(st.session_state.current_filtered_pairs_list)
            st.session_state.df_filtered_pairs = df_filtered_pairs # Store in session state
            st.session_state.max_results_display = max_results # Store max results for display
        else:
            status_placeholder.info("Không tìm thấy cặp giao dịch nào thỏa mãn điều kiện tìm kiếm.")
            st.session_state.df_filtered_pairs = pd.DataFrame() # Clear dataframe if no results
            st.session_state.max_results_display = max_results
    except Exception as e:
        # Catch any other unexpected errors during the filtering process
        status_placeholder.error(f"Đã xảy ra lỗi không mong muốn trong quá trình lọc: {e}")
        st.session_state.df_filtered_pairs = pd.DataFrame()
        st.session_state.max_results_display = 0
    finally:
        st.session_state.filtering_in_progress = False
        st.session_state.start_filtering_triggered = False
        st.session_state.selected_pair_data = None
        st.session_state.selected_pair_index = None
        st.session_state.stop_filtering = False
        st.session_state.stop_button_disabled_temp = False
        status_placeholder.empty()
        progress_placeholder.empty()

# Main interface - responsive layout
if st.session_state.filtering_in_progress:
    # On mobile, stack buttons vertically
    col1, col2 = st.columns([1, 1])
else:
    # On desktop, use side-by-side layout
    col1, col2 = st.columns([1, 1])

with col1:
    if st.button('Tìm kiếm cặp usdt phù hợp', disabled=st.session_state.filtering_in_progress or not selected_exchanges, use_container_width=True):
        # Check if user selected reliable exchanges
        reliable_exchanges = ['mexc', 'gate', 'okx']
        selected_reliable = [ex for ex in selected_exchanges if ex in reliable_exchanges]
        
        if selected_exchanges and not selected_reliable:
            st.warning("💡 Khuyến nghị: Chọn Okx, Huobi, Gate và Mexc để có kết quả tốt nhất!")
        
        # Special warning for Binance
        if 'binance' in selected_exchanges and is_heroku_deployment:
            st.info("⚠️ Binance và Bybit có thể không hoạt động do bị chặn hoặc rate limit.")
        
        st.session_state.filtering_in_progress = True
        st.session_state.start_filtering_triggered = True
        st.session_state.stop_filtering = False # Reset stop signal
        st.session_state.stop_button_disabled_temp = False # Enable stop button on new filter run
        st.session_state.df_filtered_pairs = pd.DataFrame() # Clear previous results
        st.session_state.current_filtered_pairs_list = [] # Clear current filtered pairs list
        # Clear selected pair data on new filter run
        st.session_state.selected_pair_data = None
        st.session_state.selected_pair_index = None # Clear selected index
        st.rerun()

def stop_filtering_callback():
    st.session_state.stop_filtering = True
    st.session_state.filtering_in_progress = False # Immediately set to false to display results
    st.session_state.stop_button_disabled_temp = True # Disable button immediately
    status_message_placeholder.warning("Quá trình tìm kiếm đã dừng. Hiển thị kết quả hiện có.")
    st.session_state.selected_pair_data = None
    st.session_state.selected_pair_index = None
    # st.rerun() # Force a rerun to update the UI - REMOVED as it's a no-op in callbacks

with col2:
    st.button(
        'Dừng',
        key='stop_filtering_button',
        disabled=not st.session_state.filtering_in_progress,
        on_click=stop_filtering_callback, # Call the new function
        use_container_width=True
    )

if st.session_state.start_filtering_triggered:
    perform_filtering(selected_exchanges, exclude_leverage_tokens, exclude_futures_tokens, max_results_for_filtering_func, status_message_placeholder, progress_bar_placeholder)

def handle_dataframe_select():
    if st.session_state.df_filtered_pairs.empty:
        st.session_state.selected_pair_data = None
        st.session_state.selected_pair_index = None
        return

    if st.session_state._df_filtered_pairs_selection["selection"]["rows"]:
        new_selected_index = st.session_state._df_filtered_pairs_selection["selection"]["rows"][0]
        
        # Add boundary check for the index
        if new_selected_index < 0 or new_selected_index >= len(st.session_state.df_filtered_pairs):
            st.session_state.selected_pair_data = None
            st.session_state.selected_pair_index = None
            return

        if new_selected_index != st.session_state.selected_pair_index:
            st.session_state.selected_pair_data = st.session_state.df_filtered_pairs.iloc[new_selected_index].to_dict()
            st.session_state.selected_pair_index = new_selected_index
    elif st.session_state.selected_pair_index is not None:
        st.session_state.selected_pair_data = None
        st.session_state.selected_pair_index = None

# Display filtered pairs and detailed view outside the filtering function
if not st.session_state.df_filtered_pairs.empty:
    st.subheader(f"Đã tìm thấy {len(st.session_state.df_filtered_pairs)} cặp USDT")
    
    st.dataframe(
        st.session_state.df_filtered_pairs,
        width='stretch',
        hide_index=True,
        selection_mode="single-row",
        column_config={
            "Link Sàn": st.column_config.LinkColumn("Link Sàn", display_text="Xem trực tiếp")
        },
        key="_df_filtered_pairs_selection", # Keep the key
        on_select=handle_dataframe_select, # Use the callback function
        use_container_width=True  # Better for mobile
    )


if st.session_state.get('selected_pair_data'):
    pair_data = st.session_state.selected_pair_data
    selected_exchange = pair_data['Sàn giao dịch'].lower() # Convert back to lowercase for ccxt
    selected_pair = pair_data['Cặp usdt']

    # Display pair details in a more compact way, similar to exchanges
    st.markdown(f"### {selected_pair} trên {pair_data['Sàn giao dịch']}")

    # Placeholders for dynamic info are removed as per user request.

    # Timeframe selector
    timeframe_options = {
        "1 giây": "1s", "15 phút": "15m", "1 giờ": "1h", "4 giờ": "4h",
        "1 ngày": "1d", "3 ngày": "3d", "1 tuần": "1w"
    }
    # Use selected_timeframe_label and _value from session state
    # No need to re-initialize here, as it's done at the top of the script
    
    def update_timeframe():
        st.session_state.selected_timeframe_value = timeframe_options[st.session_state.timeframe_selector]
        # Set the label for consistency, Streamlit will re-run and pick up the new label
        st.session_state.selected_timeframe_label = st.session_state.timeframe_selector

    selected_timeframe_label_current = st.selectbox(
        "Chọn khung thời gian",
        options=list(timeframe_options.keys()),
        index=list(timeframe_options.keys()).index(st.session_state.selected_timeframe_label),
        key="timeframe_selector",
        on_change=update_timeframe
    )
    # Ensure the label in session state is updated after selectbox interaction
    st.session_state.selected_timeframe_label = selected_timeframe_label_current


    # Fetch candle data for the selected pair and timeframe
    current_timeframe = st.session_state.selected_timeframe_value
    candle_df = get_candle_data(selected_pair, selected_exchange, current_timeframe, limit=100) # Fetch more candles for better chart visualization

    if not candle_df.empty:
        # --- BẮT ĐẦU: LÀM SẠCH DỮ LIỆU NGOẠI LỆ ---
        # Lọc bỏ các nến có giá high > 5 lần giá đóng hoặc low < 0.2 lần giá đóng (có thể điều chỉnh ngưỡng)
        initial_rows = len(candle_df)
        candle_df = candle_df[
            (candle_df['high'] / candle_df['close'] < 5) & 
            (candle_df['low'] / candle_df['close'] > 0.2)
        ]
        if len(candle_df) < initial_rows:
            st.warning(f"Đã loại bỏ {initial_rows - len(candle_df)} nến ngoại lệ để biểu đồ hiển thị rõ ràng hơn.")
        # --- KẾT THÚC: LÀM SẠCH DỮ LIỆU NGOẠI LỆ ---

        # Calculate volatility and range for all candles in the dataframe
        candle_df['volatility'] = candle_df['close'] - candle_df['open']
        candle_df['candle_range'] = candle_df['high'] - candle_df['low']
        
        # Calculate percentage volatility and range, handling division by zero
        candle_df['volatility_percent'] = candle_df.apply(
            lambda row: (row['volatility'] / row['open']) * 100 if row['open'] != 0 else 0,
            axis=1
        )
        candle_df['candle_range_percent'] = candle_df.apply(
            lambda row: (row['candle_range'] / row['low']) * 100 if row['low'] != 0 else 0,
            axis=1
        )

        # Calculate Vol (USDT) for each candle (approximation)
        candle_df['volume_usdt'] = candle_df['volume'] * candle_df['close']

        # Calculate SMAs
        candle_df['SMA_7'] = calculate_sma(candle_df, 7)
        candle_df['SMA_25'] = calculate_sma(candle_df, 25)
        candle_df['SMA_99'] = calculate_sma(candle_df, 99)

        # Get latest candle data for display above the chart
        latest_candle = candle_df.iloc[-1]
        formatted_date = latest_candle['timestamp'].strftime('%Y/%m/%d %H:%M')

        base1, quote = selected_pair.split('/')

        st.markdown(f"""
            <div style="display: flex; flex-wrap: wrap; justify-content: space-around; background-color: #1E2129; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                <div style="text-align: center; margin: 5px;">
                    <span style="font-size: 12px; color: #8E909B;">Giá hiện tại</span><br>
                    <span style="font-size: 16px; font-weight: bold; color: {'#03A699' if latest_candle['close'] >= latest_candle['open'] else '#FF3333'};">{latest_candle['close']:.4f}</span>
                </div>
                <div style="text-align: center; margin: 5px;">
                    <span style="font-size: 12px; color: #8E909B;">Mở</span><br>
                    <span style="font-size: 14px; color: white;">{latest_candle['open']:.4f}</span>
                </div>
                <div style="text-align: center; margin: 5px;">
                    <span style="font-size: 12px; color: #8E909B;">Cao</span><br>
                    <span style="font-size: 14px; color: #03A699;">{latest_candle['high']:.4f}</span>
                </div>
                <div style="text-align: center; margin: 5px;">
                    <span style="font-size: 12px; color: #8E909B;">Thấp</span><br>
                    <span style="font-size: 14px; color: #FF3333;">{latest_candle['low']:.4f}</span>
                </div>
                <div style="text-align: center; margin: 5px;">
                    <span style="font-size: 12px; color: #8E909B;">Đóng</span><br>
                    <span style="font-size: 14px; color: white;">{latest_candle['close']:.4f}</span>
                </div>
                <div style="text-align: center; margin: 5px;">
                    <span style="font-size: 12px; color: #8E909B;">Biến động</span><br>
                    <span style="font-size: 14px; color: {'#03A699' if latest_candle['volatility_percent'] >= 0 else '#FF3333'};">{latest_candle['volatility_percent']:.2f}%</span>
                </div>
                <div style="text-align: center; margin: 5px;">
                    <span style="font-size: 12px; color: #8E909B;">Biên độ</span><br>
                    <span style="font-size: 14px; color: white;">{latest_candle['candle_range_percent']:.2f}%</span>
                </div>
                <div style="text-align: center; margin: 5px;">
                    <span style="font-size: 12px; color: #8E909B;">SMA 7</span><br>
                    <span style="font-size: 14px; color: #FFD700;">{latest_candle['SMA_7']:.4f}</span>
                </div>
                <div style="text-align: center; margin: 5px;">
                    <span style="font-size: 12px; color: #8E909B;">SMA 25</span><br>
                    <span style="font-size: 14px; color: #FFA500;">{latest_candle['SMA_25']:.4f}</span>
                </div>
                <div style="text-align: center; margin: 5px;">
                    <span style="font-size: 12px; color: #8E909B;">SMA 99</span><br>
                    <span style="font-size: 14px; color: #DA70D6;">{latest_candle['SMA_99']:.4f}</span>
                </div>
                <div style="text-align: center; margin: 5px;">
                    <span style="font-size: 12px; color: #8E909B;">Vol ({base1})</span><br>
                    <span style="font-size: 14px; color: white;">{latest_candle['volume']:.2f}</span>
                </div>
                <div style="text-align: center; margin: 5px;">
                    <span style="font-size: 12px; color: #8E909B;">Vol ({quote})</span><br>
                    <span style="font-size: 14px; color: white;">{latest_candle['volume_usdt']:.2f}</span>
                </div>
            </div>
            """, unsafe_allow_html=True)

        st.subheader(f"Biểu đồ {selected_pair} trên {pair_data['Sàn giao dịch']} ({st.session_state.selected_timeframe_label})")

        # Create a selection for zooming and panning
        zoom = alt.selection_interval(encodings=["x"], resolve="union")

        # Candlestick Chart
        base = alt.Chart(candle_df).encode(
            x=alt.X('timestamp', axis=alt.Axis(format="%d-%m-%Y %H:%M"), title="")
        ).add_selection(
            zoom
        )

        candlestick = base.mark_rule().encode(
            y=alt.Y('low', title=""),
            y2='high',
            color=alt.condition(
                alt.datum.open < alt.datum.close,
                alt.value('#03A699'), # Green for bullish
                alt.value('#FF3333') # Red for bearish
            ),
            tooltip=[
                alt.Tooltip('timestamp', title='Thời Gian', format='%d-%m-%Y'),
                alt.Tooltip('open', title='Mở', format='.4f'),
                alt.Tooltip('high', title='Cao', format='.4f'),
                alt.Tooltip('low', title='Thấp', format='.4f'),
                alt.Tooltip('close', title='Đóng', format='.4f'),
                alt.Tooltip('volatility_percent', title='Biến động', format='.2f'),
                alt.Tooltip('candle_range_percent', title='Biên độ', format='.2f')
            ]
        )

        bar = base.mark_bar(size=10).encode(
            y='open',
            y2='close',
            color=alt.condition(
                alt.datum.open < alt.datum.close,
                alt.value('#03A699'), # Green for bullish
                alt.value('#FF3333') # Red for bearish
            ),
            tooltip=[
                alt.Tooltip('timestamp', title='Thời Gian', format='%d-%m-%Y'),
                alt.Tooltip('open', title='Mở', format='.4f'),
                alt.Tooltip('high', title='Cao', format='.4f'),
                alt.Tooltip('low', title='Thấp', format='.4f'),
                alt.Tooltip('close', title='Đóng', format='.4f'),
                alt.Tooltip('volatility_percent', title="Biến động", format='.2f'),
                alt.Tooltip('candle_range_percent', title="Biên độ", format='.2f')
            ]
        )

        # SMA Lines
        sma_7 = base.mark_line(color='#FFD700').encode(y=alt.Y('SMA_7', title=''), tooltip=[alt.Tooltip('SMA_7', title='SMA 7', format='.4f')])
        sma_25 = base.mark_line(color='#FFA500').encode(y=alt.Y('SMA_25', title=''), tooltip=[alt.Tooltip('SMA_25', title='SMA 25', format='.4f')])
        sma_99 = base.mark_line(color='#DA70D6').encode(y=alt.Y('SMA_99', title=''), tooltip=[alt.Tooltip('SMA_99', title='SMA 99', format='.4f')])

        price_chart = alt.layer(candlestick, bar, sma_7, sma_25, sma_99).properties(
            height=400
        ).interactive()

        # Volume Chart
        volume_chart = alt.Chart(candle_df).mark_bar().encode(
            x=alt.X('timestamp', axis=alt.Axis(format="%d-%m-%Y", labels=False), title=""), # No labels, shared with price chart
            y=alt.Y('volume', title=""),
            color=alt.condition(
                alt.datum.open < alt.datum.close,
                alt.value('#03A699'),
                alt.value('#FF3333')
            ),
            tooltip=[
                alt.Tooltip('timestamp', title='Thời Gian', format='%d-%m-%Y'),
                alt.Tooltip('volume', title=f'Vol({base1})', format='.2f'),
                alt.Tooltip('volume_usdt', title=f'Vol({quote})', format='.2f')
            ]
        ).properties(
            height=150
        ).add_selection(
            zoom
        )

        # Combine charts
        chart = alt.vconcat(price_chart, volume_chart).resolve_axis(x="shared")

        st.altair_chart(chart, use_container_width=True)
    else:
        st.write("Không có dữ liệu nến để hiển thị.")