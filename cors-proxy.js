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

// Serve static files from the current directory
app.use(express.static(__dirname));

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
        supportedExchanges: ['binance', 'okx', 'huobi', 'gate', 'mexc', 'bybit'],
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
        
        const response = await fetch(decodedTargetUrl);
        
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
        res.status(500).json({
            error: 'Proxy request failed',
            message: error.message,
            url: targetUrl
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
