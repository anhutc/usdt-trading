const express = require('express');
const cors = require('cors');
const path = require('path');
// Không cần require('node-fetch') nữa vì Node.js v18+ đã có fetch tích hợp sẵn.

const app = express();
const PORT = process.env.PORT || 8080; // Use Heroku's PORT environment variable or default to 8080

// Cấu hình CORS chi tiết hơn
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));

// Thêm middleware để log requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Serve static files from the current directory with proper MIME types
app.use(express.static(__dirname, {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html');
        }
    }
}));

// Root route để đảm bảo index.html được serve
app.get('/', (req, res) => {
    console.log('[ROOT] Serving index.html');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// API info endpoint
app.get('/api-info', (req, res) => {
    res.json({
        message: 'USDT Trading CORS Proxy',
        endpoints: {
            proxy: '/proxy?url=ENCODED_URL',
            health: '/health',
            apiInfo: '/api-info',
            testBinance: '/test-binance',
            testGate: '/test-gate',
            testAllExchanges: '/test-all-exchanges'
        },
        supportedExchanges: ['binance', 'okx', 'huobi', 'gate', 'mexc', 'bybit'],
        note: 'Use encodeURIComponent() for URL parameter'
    });
});

// Test Binance API endpoint
app.get('/test-binance', async (req, res) => {
    try {
        const response = await fetch('https://api.binance.com/api/v3/exchangeInfo', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            },
            timeout: 5000
        });
        
        if (response.ok) {
            const data = await response.json();
            res.json({
                status: 'success',
                message: 'Binance API connection successful',
                dataCount: data.symbols ? data.symbols.length : 'N/A',
                sampleData: data.symbols ? data.symbols.slice(0, 3) : data
            });
        } else {
            res.status(response.status).json({
                status: 'error',
                message: `Binance API returned ${response.status}`,
                statusText: response.statusText
            });
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to connect to Binance API',
            error: error.message
        });
    }
});

// Test Gate.io API endpoint
app.get('/test-gate', async (req, res) => {
    try {
        // Thử nhiều endpoints khác nhau
        const endpoints = [
            'https://api.gate.io/api/v4/spot/currency_pairs',
            'https://api.gate.io/api/v4/spot/tickers',
            'https://api.gate.io/api/v4/spot/markets'
        ];
        
        let lastError = null;
        
        for (const endpoint of endpoints) {
            try {
                console.log(`[TEST] Trying endpoint: ${endpoint}`);
                const response = await fetch(endpoint, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json',
                        'Accept-Language': 'en-US,en;q=0.9'
                    },
                    timeout: 5000
                });
                
                if (response.ok) {
                    const data = await response.json();
                    return res.json({
                        status: 'success',
                        message: 'Gate.io API connection successful',
                        endpoint: endpoint,
                        dataCount: Array.isArray(data) ? data.length : 'N/A',
                        sampleData: Array.isArray(data) ? data.slice(0, 3) : data
                    });
                } else {
                    lastError = `Status ${response.status}: ${response.statusText}`;
                    console.log(`[TEST] Failed: ${endpoint} - ${lastError}`);
                }
            } catch (err) {
                lastError = err.message;
                console.log(`[TEST] Error: ${endpoint} - ${err.message}`);
            }
        }
        
        // Nếu tất cả endpoints đều fail
        res.status(500).json({
            status: 'error',
            message: 'All Gate.io API endpoints failed',
            lastError: lastError,
            endpoints: endpoints
        });
        
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to connect to Gate.io API',
            error: error.message
        });
    }
});

// Test all exchanges endpoint
app.get('/test-all-exchanges', async (req, res) => {
    const exchanges = [
        { name: 'Binance', url: 'https://api.binance.com/api/v3/exchangeInfo' },
        { name: 'OKX', url: 'https://www.okx.com/api/v5/public/instruments?instType=SPOT' },
        { name: 'Gate.io', url: 'https://api.gate.io/api/v4/spot/currency_pairs' },
        { name: 'MEXC', url: 'https://api.mexc.com/api/v3/exchangeInfo' },
        { name: 'Bybit', url: 'https://api.bybit.com/v5/market/instruments-info?category=spot' }
    ];
    
    const results = [];
    
    for (const exchange of exchanges) {
        try {
            console.log(`[TEST-ALL] Testing ${exchange.name}: ${exchange.url}`);
            const response = await fetch(exchange.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                },
                timeout: 5000
            });
            
            if (response.ok) {
                const data = await response.json();
                results.push({
                    exchange: exchange.name,
                    status: 'success',
                    url: exchange.url,
                    dataCount: Array.isArray(data) ? data.length : (data.symbols ? data.symbols.length : 'N/A')
                });
            } else {
                results.push({
                    exchange: exchange.name,
                    status: 'error',
                    url: exchange.url,
                    error: `Status ${response.status}: ${response.statusText}`
                });
            }
        } catch (error) {
            results.push({
                exchange: exchange.name,
                status: 'error',
                url: exchange.url,
                error: error.message
            });
        }
    }
    
    res.json({
        message: 'All exchanges test results',
        results: results,
        summary: {
            total: exchanges.length,
            successful: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'error').length
        }
    });
});

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('Missing target URL parameter.');
    }

    try {
        // Decode URL để tránh double encoding
        const decodedTargetUrl = decodeURIComponent(targetUrl);
        console.log('[DEBUG] Original URL:', targetUrl);
        console.log('[DEBUG] Decoded URL:', decodedTargetUrl);
        
        // Thêm timeout và retry logic
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(decodedTargetUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.error(`[ERROR] API responded with status ${response.status}: ${response.statusText}`);
            return res.status(response.status).json({
                error: `API request failed with status ${response.status}`,
                message: response.statusText,
                url: decodedTargetUrl
            });
        }
        
        const data = await response.json();
        console.log('[SUCCESS] Proxy request completed successfully');
        res.json(data);
    } catch (error) {
        console.error('[ERROR] Proxy request failed:', error.message);
        console.error('[ERROR] Target URL:', targetUrl);
        console.error('[ERROR] Error type:', error.name);
        
        let errorMessage = error.message;
        if (error.name === 'AbortError') {
            errorMessage = 'Request timeout';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'DNS resolution failed';
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Connection refused';
        }
        
        res.status(500).json({
            error: 'Proxy request failed',
            message: errorMessage,
            url: targetUrl,
            errorType: error.name
        });
    }
});

// Fallback route để serve index.html cho SPA
app.get('*', (req, res) => {
    console.log(`[FALLBACK] Serving index.html for: ${req.path}`);
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Thêm keep-alive để tránh sleep trên Render free tier
setInterval(() => {
    console.log(`[KEEP-ALIVE] Server running for ${Math.floor(process.uptime())} seconds`);
}, 30000); // Ping mỗi 30 giây

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 USDT Trading CORS Proxy server running on port ${PORT}`);
    console.log(`📊 Frontend available at: http://localhost:${PORT}`);
    console.log(`🔗 Proxy endpoint: http://localhost:${PORT}/proxy?url=YOUR_TARGET_URL`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`📋 API info: http://localhost:${PORT}/api-info`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Server started at: ${new Date().toISOString()}`);
});
