import ccxt
import json

def handler(request, response):
    try:
        if request.method == 'GET':
            query_params = request.query
            exchange_name = query_params.get('exchange', 'binance')
            pair = query_params.get('pair')

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
            
            ticker = exchange.fetch_ticker(pair)
            
            response.status = 200
            response.headers['Content-Type'] = 'application/json'
            response.end(json.dumps({
                'current_price': ticker['last'],
                'high_price': ticker['high'],
                'low_price': ticker['low']
            }))

        else:
            response.status = 405
            response.headers['Content-Type'] = 'application/json'
            response.end(json.dumps({'error': 'Method Not Allowed'}))

    except Exception as e:
        response.status = 500
        response.headers['Content-Type'] = 'application/json'
        response.end(json.dumps({'error': str(e)}))
