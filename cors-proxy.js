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
            apiInfo: '/api-info'
        },
        supportedExchanges: ['gate', 'mexc'],
        note: 'Use encodeURIComponent() for URL parameter'
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
        
        // Special handling for Gate.io
        let headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site'
        };
        
        // Add specific headers for Gate.io
        if (decodedTargetUrl.includes('gate.io')) {
            headers['Origin'] = 'https://www.gateio.ws';
            headers['Referer'] = 'https://www.gateio.ws/';
            headers['X-Requested-With'] = 'XMLHttpRequest';
        }
        
        const response = await fetch(decodedTargetUrl, {
            signal: controller.signal,
            headers: headers,
            method: 'GET',
            mode: 'cors',
            credentials: 'omit'
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
