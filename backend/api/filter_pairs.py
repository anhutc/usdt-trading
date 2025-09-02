import ccxt
import pandas as pd
import datetime
import json

def handler(request, response):
    try:
        if request.method == 'GET':
            query_params = request.query
            exchange_name = query_params.get('exchange', 'binance')
            pair = query_params.get('pair')
            num_doji_candles = int(query_params.get('num_doji_candles', 6))
            doji_candle_timeframe = query_params.get('doji_candle_timeframe', '3d')
            doji_body_percentage = float(query_params.get('doji_body_percentage', 15.0))
            avg_volume_candles = int(query_params.get('avg_volume_candles', 20))
            doji_calculation_method = query_params.get('doji_calculation_method', 'Theo biên độ nến')

            if not pair:
                response.status = 400
                response.headers['Content-Type'] = 'application/json'
                response.end(json.dumps({'error': 'Missing "pair" parameter'}))
                return

            exchange_class = getattr(ccxt, exchange_name)
            config = {
                'enableRateLimit': True,
                'timeout': 30000,
                'rateLimit': 1000,
            }
            if exchange_name in ['mexc', 'gate', 'okx']:
                config['timeout'] = 20000
                config['rateLimit'] = 800
            exchange = exchange_class(config)

            limit_candles = max(num_doji_candles, avg_volume_candles)
            ohlcvs = exchange.fetch_ohlcv(pair, doji_candle_timeframe, limit=limit_candles)

            if not ohlcvs or len(ohlcvs) < limit_candles:
                response.status = 200
                response.headers['Content-Type'] = 'application/json'
                response.end(json.dumps({'is_doji_volume_match': False}))
                return

            df = pd.DataFrame(ohlcvs, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')

            latest_candle_timestamp = df['timestamp'].iloc[-1]
            now = datetime.datetime.now()
            thirty_days_ago = now - datetime.timedelta(days=30)

            if latest_candle_timestamp < thirty_days_ago:
                response.status = 200
                response.headers['Content-Type'] = 'application/json'
                response.end(json.dumps({'is_doji_volume_match': False}))
                return

            doji_found = False
            doji_volume = 0

            for i in range(-num_doji_candles, 0):
                candle = df.iloc[i]
                open_price = candle['open']
                high_price = candle['high']
                low_price = candle['low']
                close_price = candle['close']
                volume = candle['volume']

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

                if body_percentage < doji_body_percentage:
                    doji_found = True
                    doji_volume = volume
                    break
            
            is_doji_volume_match = False
            if doji_found:
                average_volume = df['volume'].iloc[-avg_volume_candles:].mean()
                if doji_volume > average_volume:
                    is_doji_volume_match = True
            
            response.status = 200
            response.headers['Content-Type'] = 'application/json'
            response.end(json.dumps({'is_doji_volume_match': is_doji_volume_match}))

        else:
            response.status = 405
            response.headers['Content-Type'] = 'application/json'
            response.end(json.dumps({'error': 'Method Not Allowed'}))

    except Exception as e:
        response.status = 500
        response.headers['Content-Type'] = 'application/json'
        response.end(json.dumps({'error': str(e)}))
