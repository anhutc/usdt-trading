import ccxt
import json

def handler(request, response):
    try:
        if request.method == 'GET':
            exchange_name = request.query.get('exchange', 'binance')

            exchange_class = getattr(ccxt, exchange_name)
            exchange = exchange_class({'enableRateLimit': True})
            markets = exchange.load_markets()

            usdt_pairs = []
            for symbol in markets:
                if symbol.endswith('/USDT'):
                    usdt_pairs.append(symbol)
            
            response.status = 200
            response.headers['Content-Type'] = 'application/json'
            response.end(json.dumps({'pairs': usdt_pairs}))
        else:
            response.status = 405
            response.headers['Content-Type'] = 'application/json'
            response.end(json.dumps({'error': 'Method Not Allowed'}))

    except Exception as e:
        response.status = 500
        response.headers['Content-Type'] = 'application/json'
        response.end(json.dumps({'error': str(e)}))
