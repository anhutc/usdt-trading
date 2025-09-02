import ccxt
import pandas as pd
import json

def handler(request, response):
    try:
        if request.method == 'GET':
            query_params = request.query
            exchange_name = query_params.get('exchange', 'binance')
            pair = query_params.get('pair')
            timeframe = query_params.get('timeframe', '1d')
            limit = int(query_params.get('limit', 100))

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
            
            ohlcvs = exchange.fetch_ohlcv(pair, timeframe, limit=limit)
            df = pd.DataFrame(ohlcvs, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')

            # Convert DataFrame to JSON serializable format
            result = df.to_dict(orient='records')
            
            response.status = 200
            response.headers['Content-Type'] = 'application/json'
            response.end(json.dumps({'data': result}))

        else:
            response.status = 405
            response.headers['Content-Type'] = 'application/json'
            response.end(json.dumps({'error': 'Method Not Allowed'}))

    except Exception as e:
        response.status = 500
        response.headers['Content-Type'] = 'application/json'
        response.end(json.dumps({'error': str(e)}))
