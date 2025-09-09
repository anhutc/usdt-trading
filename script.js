class USDTTradingPortable {
    constructor() {
        this.scanButton = document.getElementById('scanButton');
        this.filterPanel = document.getElementById('filterPanel');
        this.loading = document.getElementById('loading');
        this.resultsTable = document.getElementById('resultsTable');
        this.resultsTitle = document.getElementById('resultsTitle');
        this.resultsBody = document.getElementById('resultsBody');
        this.chartModal = document.getElementById('chartModal');
        this.closeChart = document.getElementById('closeChart');
        this.initialContent = document.getElementById('initialContent');
        this.errorMessageContainer = document.getElementById('errorMessageContainer');
        this.errorMessageDetail = document.getElementById('errorMessageDetail');
        this.resultsArea = document.getElementById('resultsArea');

        this.chartCurrentPrice = document.getElementById('chartCurrentPrice');
        this.chartOpen = document.getElementById('chartOpen');
        this.chartHigh = document.getElementById('chartHigh');
        this.chartLow = document.getElementById('chartLow');
        this.chartClose = document.getElementById('chartClose');
        this.chartChange = document.getElementById('chartChange');
        this.chartRange = document.getElementById('chartRange');
        this.chartSma7 = document.getElementById('chartSma7');
        this.chartSma25 = document.getElementById('chartSma25');
        this.chartSma99 = document.getElementById('chartSma99');
        this.chartBaseAsset = document.getElementById('chartBaseAsset');
        this.chartVolumeBase = document.getElementById('chartVolumeBase');
        this.chartVolumeQuote = document.getElementById('chartVolumeQuote');

        this.progressDetails = document.getElementById('progressDetails');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressStatus = document.getElementById('progressStatus');
        this.progressFill = document.getElementById('progressFill');

        this.totalTasks = 0;
        this.completedTasks = 0;
        this.satisfiedResultsCount = 0;
        this.progressItems = new Map();

        this.exchangeSupportedIntervals = {
            'binance': ['1h', '4h', '1d', '3d', '1w', '1M'],
            'okx': ['1h', '4h', '1d', '1w', '1M'],
            'huobi': ['1h', '4h', '1d', '1w', '1M'],
            'gate': ['30m', '1h', '4h', '1d', '3d', '1w', '1M'],
            'mexc': ['30m', '1h', '1d', '3d', '1w', '1M'],
            'bybit': ['1h', '4h', '1d', '1w', '1M']
        };

        this.exchangeCandleIntervalSelects = {};
        ['binance', 'okx', 'huobi', 'gate', 'mexc', 'bybit'].forEach(exchangeId => {
            this.exchangeCandleIntervalSelects[exchangeId] = document.getElementById(`${exchangeId}CandleInterval`);
            this.populateExchangeIntervalOptions(exchangeId);
        });
        
        this.updateDisplayState([], null); 
        
        this.selectedRow = null;

        this.updateDisplayState();

        this.corsProxyBaseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8080' : window.location.origin;
        
        // Kiểm tra kết nối đến proxy server
        this.checkProxyConnection();
        this.selectedConditions = {};
        this.resultLimit = 5;

    }

    setupEventListeners() {
        this.scanButton.addEventListener('click', () => this.startScan());

        document.querySelectorAll('.exchange-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.handleExchangeChange(e));
        });

        document.querySelectorAll('.candle-interval-select').forEach(select => {
            select.addEventListener('change', () => this.showToast('Khoảng thời gian nến đã cập nhật', 'info'));
        });

        document.querySelectorAll('input[name="candleCondition"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.handleConditionChange(e));
        });

        document.querySelectorAll('.input-field').forEach(input => {
            input.addEventListener('input', () => this.showToast('Cài đặt đã cập nhật', 'info'));
        });

        this.closeChart.addEventListener('click', () => this.closeChartModal());
        
        this.chartModal.addEventListener('click', (e) => {
            if (e.target === this.chartModal) {
                this.closeChartModal();
            }
        });
    }

    handleExchangeChange(event) {
        const checkbox = event.target;
        const exchangeId = checkbox.id;
        const exchangeItem = checkbox.closest('.exchange-item');
        const intervalSelect = this.exchangeCandleIntervalSelects[exchangeId];
        
        if (checkbox.checked) {
            exchangeItem.classList.add('selected');
            exchangeItem.style.background = '#4a4a4a';
            if (intervalSelect) {
                intervalSelect.disabled = false;
                if (intervalSelect.value === "" && intervalSelect.options.length > 0) {
                        intervalSelect.value = intervalSelect.options[0].value;
                }
            }
        } else {
            exchangeItem.classList.remove('selected');
            exchangeItem.style.background = '#3a3a3a';
            if (intervalSelect) {
                intervalSelect.disabled = true;
            }
        }

        const exchangeNames = {
            'binance': 'Binance',
            'okx': 'OKX',
            'huobi': 'Huobi',
            'gate': 'Gate',
            'mexc': 'MEXC',
            'bybit': 'Bybit'
        };

        this.showToast(`Sàn ${exchangeNames[exchangeId]} ${checkbox.checked ? 'đã bật' : 'đã tắt'}`, 'info');
    }

    handleConditionChange(event) {
        const radio = event.target;
        const conditionValue = document.getElementById('conditionValue');
        
        if (radio.value === 'body') {
            conditionValue.value = '15';
            conditionValue.placeholder = '15';
            this.showToast('Đã chọn điều kiện: Thân nến < 15% (|Giá đóng - Giá mở| / (Giá trần - Giá sàn))', 'info');
        } else {
            conditionValue.value = '20';
            conditionValue.placeholder = '20';
            this.showToast('Đã chọn điều kiện: Thay đổi giá < 20% (|Giá đóng - Giá mở| / Giá mở)', 'info');
        }
    }

    disableFilterControls() {
        document.querySelectorAll('.exchange-checkbox').forEach(cb => cb.disabled = true);
        document.querySelectorAll('input[name="candleCondition"]').forEach(radio => radio.disabled = true);
        document.querySelectorAll('.input-field').forEach(input => input.disabled = true);
        document.querySelectorAll('.exclusion-checkbox').forEach(cb => cb.disabled = true);
        document.querySelectorAll('.candle-interval-select').forEach(select => select.disabled = true);
        document.getElementById('numberOfCandles').disabled = true;
        document.getElementById('volumePeriods').disabled = true;
        document.getElementById('maxResults').disabled = true;
        document.getElementById('conditionValue').disabled = true;
    }

    enableFilterControls() {
        document.querySelectorAll('.exchange-checkbox').forEach(cb => cb.disabled = false);
        document.querySelectorAll('input[name="candleCondition"]').forEach(radio => radio.disabled = false);
        document.querySelectorAll('.input-field').forEach(input => input.disabled = false);
        document.querySelectorAll('.exclusion-checkbox').forEach(cb => cb.disabled = false);
        document.querySelectorAll('.exchange-checkbox:checked').forEach(cb => {
            const exchangeId = cb.id;
            const intervalSelect = this.exchangeCandleIntervalSelects[exchangeId];
            if (intervalSelect) {
                intervalSelect.disabled = false;
            }
        });
        document.getElementById('numberOfCandles').disabled = false;
        document.getElementById('volumePeriods').disabled = false;
        document.getElementById('maxResults').disabled = false;
        document.getElementById('conditionValue').disabled = false;
    }

    updateScanButton() {
        if (this.scanning) {
            this.scanButton.textContent = 'Đang lọc dữ liệu thị trường...';
            this.scanButton.classList.add('scanning');
            this.scanButton.disabled = true;
        } else {
            this.scanButton.textContent = 'Lọc dữ liệu thị trường';
            this.scanButton.classList.remove('scanning');
            this.scanButton.disabled = false;
        }
    }

    clearResults() {
        while (this.resultsBody.firstChild) {
            this.resultsBody.removeChild(this.resultsBody.firstChild);
        }
        this.resultsTable.classList.add('hidden');
        this.resultsTitle.classList.add('hidden');
        this.selectedRow = null;
    }

    clearProgress() {
        this.totalTasks = 0;
        this.completedTasks = 0;
        this.satisfiedResultsCount = 0;
        this.progressItems = new Map();
        this.progressContainer.style.width = '0%';
        this.progressDetails.innerHTML = '';
        this.progressStatus.textContent = '';
    }

    async startScan() {
        this.scanning = true;
        this.updateScanButton();
        this.clearResults();
        this.clearProgress();
        this.disableFilterControls();

        try {
            const startTime = new Date().toISOString();
            
            const filters = this.getFilters();
            if (filters.exchanges.length === 0) {
                this.showToast('Vui lòng chọn ít nhất một sàn giao dịch để bắt đầu lọc dữ liệu thị trường.', 'error');
                this.hideLoading();
                this.updateDisplayState([], null);
                return;
            }

            this.showToast('Bắt đầu lọc dữ liệu thị trường...', 'info');
            
            this.showLoading();
            const results = await this.fetchRealDataFromExchanges(filters);
            this.hideLoading();
            if (results.length > 0) {
                this.updateDisplayState(results);
                this.showToast(`Tìm thấy ${results.length} cặp thỏa mãn điều kiện!`, 'success');
            } else {
                this.showToast('Không tìm thấy kết quả nào thỏa mãn điều kiện.', 'info');
                this.updateDisplayState([], 'Không tìm thấy kết quả nào thỏa mãn điều kiện.');
            }
        } catch (error) {
            this.hideLoading();
            if (error.message === 'Limit reached, stopping scan') {
                this.showToast('Đã đạt giới hạn kết quả, dừng quét.', 'success');
                if (results.length > 0) {
                    this.updateDisplayState(results, null);
                } else {
                    this.updateDisplayState([], 'Đã đạt giới hạn kết quả, nhưng không tìm thấy cặp nào thỏa mãn trước đó.');
                }
            } else if (error.message.includes('Không thể kết nối API')) {
                this.showToast(error.message, 'error');
                this.updateDisplayState([], error.message);
            } else {
                console.error('Lỗi quét:', error);
                this.showToast('Quét thất bại: ' + error.message, 'error');
                this.updateDisplayState([], 'Quét thất bại: ' + error.message);
            }
        } finally {
            this.scanning = false;
            this.enableFilterControls();
            this.updateScanButton();
        }
    }

    getFilters() {
        const selectedCondition = document.querySelector('input[name="candleCondition"]:checked').value;
        
        const selectedExchangesWithIntervals = Array.from(document.querySelectorAll('.exchange-checkbox:checked')).map(cb => {
            const exchangeId = cb.id;
            const intervalSelect = this.exchangeCandleIntervalSelects[exchangeId];
            return {
                id: exchangeId,
                interval: intervalSelect ? intervalSelect.value : '1d'
            };
        });

        return {
            exchanges: selectedExchangesWithIntervals,
            excludeLeveraged: document.getElementById('excludeLeveraged').checked,
            excludeFutures: document.getElementById('excludeFutures').checked,
            numberOfCandles: parseInt(document.getElementById('numberOfCandles').value) || 6,
            selectedCondition: selectedCondition,
            conditionValue: document.getElementById('conditionValue').value,
            volumePeriods: document.getElementById('volumePeriods').value,
            maxResults: parseInt(document.getElementById('maxResults').value) || 0
        };
    }

    async fetchRealDataFromExchanges(filters) {
        const exchanges = ['Binance', 'OKX', 'Huobi', 'Gate', 'MEXC', 'Bybit'];
        const results = [];
        let hasRealData = false;
        
        console.log('🔍 Bắt đầu lọc dữ liệu thị trường với điều kiện:', filters);
        
        for (const exchangeObj of filters.exchanges) {
            const exchangeId = exchangeObj.id;
            const selectedInterval = exchangeObj.interval;
            try {
                this.showToast(`Đang lấy danh sách cặp từ ${exchanges.find(name => name.toLowerCase() === exchangeId)}...`, 'info');
                console.log(`\n📡 Đang lấy danh sách cặp từ sàn: ${exchangeId}`);
                
                const allPairs = await this.getAllUSDTPairs(exchangeId);
                console.log(`  📊 Tìm thấy ${allPairs.length} cặp USDT trên ${exchangeId}`);
                
                if (allPairs.length === 0) {
                    console.log(`  ⚠️ Không tìm thấy cặp USDT nào trên ${exchangeId}`);
                    continue;
                }
                
                this.initializeProgress([exchangeId], allPairs);
                
                for (const pair of allPairs) {
                    const progressKey = `${exchangeId}-${pair}`;
                    
                    try {
                        this.updateProgressItem(progressKey, 'processing');
                        console.log(`  📊 Đang xử lý cặp: ${pair}`);
                        
                        const exchangeData = await this.fetchExchangeData(exchangeId, pair, filters);
                        
                        if (exchangeData && exchangeData.candles.length > 0) {
                            hasRealData = true;
                            console.log(`  ✅ Nhận được ${exchangeData.candles.length} nến từ ${exchangeId} cho ${pair} với interval ${selectedInterval}`);
                            
                            console.log(`  🔍 Kiểm tra điều kiện nến...`);
                            const candleConditionMet = this.checkCandleCondition(exchangeData.candles, filters.selectedCondition, filters.conditionValue);
                            
                            console.log(`  🔍 Kiểm tra điều kiện volume...`);
                            const volumeConditionMet = this.checkVolumeCondition(exchangeData.volumes);
                            
                            console.log(`  📋 Kết quả kiểm tra: Nến=${candleConditionMet}, Volume=${volumeConditionMet}`);
                            
                            if (candleConditionMet && volumeConditionMet) {
                                const lastCandle = exchangeData.candles[exchangeData.candles.length - 1];
                                const change24h = ((lastCandle.close - lastCandle.open) / lastCandle.open * 100).toFixed(3);
                                
                                console.log(`  🎯 Cặp ${pair} thỏa mãn cả hai điều kiện!`);
                                
                                this.satisfiedResultsCount++;
                                
                                results.push({
                                    pair: pair,
                                    exchange: exchanges.find(name => name.toLowerCase() === exchangeId),
                                    currentPrice: lastCandle.close,
                                    highPrice: lastCandle.high,
                                    lowPrice: lastCandle.low,
                                    change24h: change24h,
                                    volume: exchangeData.volumes[exchangeData.volumes.length - 1],
                                    conditionMet: this.getConditionDescription(filters.selectedCondition),
                                    exchangeId: exchangeId,
                                    candleData: exchangeData.candles,
                                    volumeData: exchangeData.volumes
                                });
                                
                                if (filters.maxResults !== 0 && results.length >= filters.maxResults) {
                                    console.log(`🎯 Đã đạt đến giới hạn ${filters.maxResults} cặp thỏa mãn điều kiện. Dừng quét.`);
                                    for (let i = allPairs.indexOf(pair) + 1; i < allPairs.length; i++) {
                                        this.updateProgressItem(`${exchangeId}-${allPairs[i]}`, 'skipped');
                                        this.completeTask();
                                    }
                                    throw new Error('Limit reached, stopping scan');
                                }
                                
                                this.updateProgressItem(progressKey, 'satisfied_success');
                            } else {
                                console.log(`  ❌ Cặp ${pair} không thỏa mãn điều kiện`);
                                this.updateProgressItem(progressKey, 'unsatisfied_success');
                            }
                        } else {
                            console.log(`  ⚠️ Không nhận được dữ liệu nến từ ${exchangeId} cho ${pair}`);
                            this.updateProgressItem(progressKey, 'error', 'Không có dữ liệu');
                        }
                        
                        this.completeTask();
                        
                        await this.delay(100);
                        
                    } catch (pairError) {
                        if (pairError.message === 'Limit reached, stopping scan') {
                            console.log('Quá trình quét dừng lại do đã đạt giới hạn kết quả.');
                            throw pairError;
                        }
                        console.error(`  ❌ Lỗi lấy dữ liệu cặp ${pair} từ ${exchangeId}:`, pairError);
                        this.updateProgressItem(progressKey, 'error', 'Lỗi API');
                        this.completeTask();
                    }
                }
                
            } catch (exchangeError) {
                console.error(`❌ Lỗi lấy dữ liệu từ sàn ${exchangeId}:`, exchangeError);
            }
        }
        
        console.log(`\n📊 Tổng kết: Tìm thấy ${results.length} cặp thỏa mãn điều kiện`);
        
        if (!hasRealData) {
            throw new Error('Không thể kết nối API hoặc lấy dữ liệu thực. Vui lòng kiểm tra kết nối internet hoặc trạng thái API.');
        }
        
        return results;
    }

    async fetchExchangeData(exchangeId, pair, filters) {
        try {
            const symbol = this.convertPairToSymbol(pair, exchangeId);
            const limit = filters.numberOfCandles;
            const volumePeriods = parseInt(filters.volumePeriods) || 20;
            const selectedInterval = filters.exchanges.find(e => e.id === exchangeId).interval;
            const exchangeInterval = this.getExchangeInterval(exchangeId, selectedInterval);
            console.log(`[DEBUG] ${exchangeId} - Selected interval: ${selectedInterval}, API interval: ${exchangeInterval}`);
            
            let candles = [];
            let volumes = [];
            
            switch (exchangeId) {
                case 'binance':
                    const binanceData = await this.fetchBinanceData(symbol, exchangeInterval, limit);
                    candles = binanceData.candles.reverse();
                    volumes = binanceData.volumes;
                    break;
                    
                case 'okx':
                    const okxData = await this.fetchOKXData(symbol, exchangeInterval, limit);
                    candles = okxData.candles;
                    volumes = okxData.volumes;
                    break;
                    
                case 'huobi':
                    const huobiData = await this.fetchHuobiData(symbol, exchangeInterval, limit);
                    candles = huobiData.candles;
                    volumes = huobiData.volumes;
                    break;
                    
                case 'gate':
                    const gateData = await this.fetchGateData(symbol, exchangeInterval, limit);
                    candles = gateData.candles;
                    volumes = gateData.volumes;
                    break;
                    
                case 'mexc':
                    let mexcFetchInterval = exchangeInterval;
                    let fetchLimit = limit;

                    if (selectedInterval === '1h') {
                        mexcFetchInterval = '30m';
                        fetchLimit = limit * 2;
                    } else if (selectedInterval === '3d') {
                        mexcFetchInterval = '1d';
                        fetchLimit = limit * 3;
                    } else if (selectedInterval === '1w') {
                        mexcFetchInterval = '1d';
                        fetchLimit = limit * 7;
                    }
                    const mexcData = await this.fetchMEXCData(symbol, mexcFetchInterval, fetchLimit);

                    candles = mexcData.candles;
                    volumes = mexcData.volumes;
                    if (selectedInterval === '1h' || selectedInterval === '3d' || selectedInterval === '1w') {
                        let targetSeconds;
                        if (selectedInterval === '1h') {
                            targetSeconds = 1 * 3600;
                        } else if (selectedInterval === '3d') {
                            targetSeconds = 3 * 86400;
                        } else if (selectedInterval === '1w') {
                            targetSeconds = 7 * 86400;
                        }
                        const rawCandles = mexcData.candles.map(c => [
                            Math.floor(c.timestamp / 1000).toString(),
                            c.volume.toString(),
                            c.close.toString(),
                            c.high.toString(),
                            c.low.toString(),
                            c.open.toString(),
                            (c.volume * c.close).toString(),
                            'true'
                        ]);
                        const aggregated = this.aggregateCandles(rawCandles, (targetSeconds).toString());
                        const aggCandles = aggregated.slice().reverse().map(k => ({
                            timestamp: parseFloat(k[0]) * 1000,
                            open: parseFloat(k[5]),
                            high: parseFloat(k[3]),
                            low: parseFloat(k[4]),
                            close: parseFloat(k[2]),
                            volume: parseFloat(k[1])
                        }));
                        const aggVolumes = aggregated.slice().reverse().map(k => ({
                            baseVolume: parseFloat(k[1]),
                            quoteVolume: parseFloat(k[6])
                        }));
                        candles = aggCandles;
                        volumes = aggVolumes;
                    }
                    break;
                    
                case 'bybit':
                    const bybitData = await this.fetchBybitData(symbol, exchangeInterval, limit);
                    candles = bybitData.candles;
                    volumes = bybitData.volumes;
                    break;
                    
                default:
                    console.error(`Sàn không được hỗ trợ: ${exchangeId}`);
                    return null;
            }
            
            if (volumes.length === 0) {
                volumes = this.generateVolumeDataForPair(volumePeriods);
            }
            
            return { candles, volumes };
            
        } catch (error) {
            console.error(`Lỗi lấy dữ liệu từ ${exchangeId}:`, error);
            return null;
        }
    }

    async getAllUSDTPairs(exchangeId) {
        try {
            switch (exchangeId) {
                case 'binance':
                    return await this.getBinanceUSDTPairs();
                case 'okx':
                    return await this.getOKXUSDTPairs();
                case 'huobi':
                    return await this.getHuobiUSDTPairs();
                case 'gate':
                    return await this.getGateUSDTPairs();
                case 'mexc':
                    return await this.getMEXCUSDTPairs();
                case 'bybit':
                    return await this.getBybitUSDTPairs();
                default:
                    console.error(`Sàn không được hỗ trợ: ${exchangeId}`);
                    return [];
            }
        } catch (error) {
            console.error(`Lỗi lấy danh sách cặp từ ${exchangeId}:`, error);
            return [];
        }
    }

    async getBinanceUSDTPairs() {
        const data = await this.fetchWithFallback('https://api.binance.com/api/v3/exchangeInfo');
        
        if (data && data.symbols && data.symbols.length > 0) {
            return data.symbols
                .filter(symbol => symbol.quoteAsset === 'USDT' && symbol.status === 'TRADING')
                .map(symbol => symbol.baseAsset + '/USDT');
        }
        console.warn('[WARN] Binance: Không có dữ liệu symbols từ API. Bỏ qua sàn này.');
        return [];
    }

    async getOKXUSDTPairs() {
        const data = await this.fetchWithFallback('https://www.okx.com/api/v5/public/instruments?instType=SPOT');
        
        if (data && data.data && data.data.length > 0) {
            return data.data
                .filter(instrument => instrument.quoteCcy === 'USDT' && instrument.state === 'live')
                .map(instrument => instrument.baseCcy + '/USDT');
        }
        console.warn('[WARN] OKX: Không có dữ liệu instruments từ API. Bỏ qua sàn này.');
        return [];
    }

    async getHuobiUSDTPairs() {
        const data = await this.fetchWithFallback('https://api.huobi.pro/v1/common/symbols'); 
        console.log('[DEBUG] Huobi raw symbols data:', data);
        
        if (data && data.data && data.data.length > 0) {
            const filtered = data.data
                .filter(symbol => {
                    return symbol['quote-currency'] && symbol['quote-currency'].toLowerCase() === 'usdt' && 
                           symbol.state && symbol.state.toLowerCase() === 'online';
                });
            console.log('[DEBUG] Huobi filtered symbols:', filtered);
            
            const mapped = filtered.map(symbol => {
                const baseCurrency = symbol['base-currency'].toUpperCase();
                const quoteCurrency = symbol['quote-currency'].toUpperCase();
                return `${baseCurrency}/${quoteCurrency}`;
            });
            console.log('[DEBUG] Huobi mapped pairs:', mapped);
            return mapped;
        }
        console.warn('[WARN] Huobi: Không có dữ liệu symbols từ API. Bỏ qua sàn này.');
        return [];
    }

    async getGateUSDTPairs() {
        const data = await this.fetchWithFallback('https://api.gate.io/api/v4/spot/currency_pairs', 'gate');
        if (!data) {
            console.warn('[WARN] Gate: Không có dữ liệu currency_pairs từ API. Bỏ qua sàn này.');
            return;
        }
        console.log('[DEBUG] Gate.io Raw currency_pairs response:', data);
        
        if (data && data.length > 0) {
            return data
                .filter(pair => pair.quote === 'USDT' && pair.trade_status === 'tradable')
                .map(pair => pair.base + '/USDT');
        }
        console.warn('[WARN] Gate: Không có dữ liệu currency_pairs từ API. Bỏ qua sàn này.');
        return [];
    }

    async getMEXCUSDTPairs() {
        try {
            const data = await this.fetchWithFallback('https://api.mexc.com/api/v3/exchangeInfo', 'mexc');
            console.log('[DEBUG] MEXC Raw exchangeInfo response:', data);

            if (!data) {
                console.warn('[WARN] MEXC: Không có dữ liệu exchangeInfo từ API. Bỏ qua sàn này.');
                return;
            }
            if (data && Array.isArray(data.symbols) && data.symbols.length > 0) {
                const pairs = data.symbols
                    .filter(s => (s.quoteAsset || s.quoteCurrency) === 'USDT' && (s.status === '1' || s.status === 1 || s.status === 'ENABLED' || s.status === 'TRADING'))
                    .map(s => {
                        const base = (s.baseAsset || s.baseCurrency || '').toUpperCase();
                        const quote = (s.quoteAsset || s.quoteCurrency || '').toUpperCase();
                        return `${base}/${quote}`;
                    });
                if (pairs.length > 0) {
                    return pairs;
                }
            }
        } catch (error) {
            console.error(`Lỗi lấy dữ liệu từ MEXC:`, error);
            this.showToast(`Lỗi kết nối API.`, 'error');
            return [];
        }
        console.warn('[WARN] MEXC: Không có dữ liệu symbols từ API. Bỏ qua sàn này.');
        return [];
    }

    async getBybitUSDTPairs() {
        const data = await this.fetchWithFallback('https://api.bybit.com/v5/market/instruments-info?category=spot');
        
        if (data && data.result && data.result.list && data.result.list.length > 0) {
            return data.result.list
                .filter(instrument => instrument.quoteCoin === 'USDT' && instrument.status === 'Trading')
                .map(instrument => instrument.baseCoin + '/USDT');
        }
        console.warn('[WARN] Bybit: Không có dữ liệu instruments từ API. Bỏ qua sàn này.');
        return [];
    }

    convertPairToSymbol(pair, exchangeId) {
        const [base, quote] = pair.split('/');
        
        switch (exchangeId) {
            case 'binance':
                return `${base}${quote}`;
            case 'okx':
                return `${base}-${quote}`;
            case 'bybit':
                return `${base}${quote}`;
            case 'huobi':
                return `${base.toLowerCase()}${quote.toLowerCase()}`;
            case 'gate':
                return `${base}_${quote}`;
            case 'mexc':
                return `${base}_${quote}`;
            default:
                return `${base}${quote}`;
        }
    }

    generateMockResults(filters) {
        const exchanges = ['Binance', 'OKX', 'Huobi', 'Gate', 'MEXC', 'Bybit'];
        
        const selectedExchanges = filters.exchanges;
        const results = [];
        
        selectedExchanges.forEach(exchangeId => {
            const exchangeName = exchanges.find(name => name.toLowerCase() === exchangeId) || exchangeId;
            
            const samplePairs = ['BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'DOT/USDT', 'LINK/USDT', 'UNI/USDT', 'LTC/USDT', 'BCH/USDT', 'XRP/USDT'];
            
            const numResults = Math.floor(Math.random() * 3) + 2;
            
            for (let i = 0; i < numResults; i++) {
                const randomPair = samplePairs[Math.floor(Math.random() * samplePairs.length)];
                const candleData = this.generateCandleDataForPair(randomPair, filters.candleInterval, filters.numberOfCandles);
                const volumeData = this.generateVolumeDataForPair(candleData, filters.numberOfCandles);
                
                const candleConditionMet = this.checkCandleCondition(candleData, filters.selectedCondition, filters.conditionValue);
                
                const volumeConditionMet = this.checkVolumeCondition(volumeData);
                
                if (candleConditionMet && volumeConditionMet) {
                    const lastCandle = candleData[candleData.length - 1];
                    const change24h = ((lastCandle.close - lastCandle.open) / lastCandle.open * 100).toFixed(3);
                    
                    results.push({
                        pair: randomPair,
                        exchange: exchangeName,
                        currentPrice: lastCandle.close,
                        highPrice: lastCandle.high,
                        lowPrice: lastCandle.low,
                        change24h: change24h,
                        volume: volumeData[volumeData.length - 1],
                        conditionMet: this.getConditionDescription(filters.selectedCondition),
                        exchangeId: exchangeId,
                        candleData: candleData,
                        volumeData: volumeData
                    });
                }
            }
        });
        
        return results;
    }

    generateCandleDataForPair(pair, interval, limit) {
        const candles = [];
        const baseTimestamp = Date.now() - (limit * 24 * 60 * 60 * 1000);
        let currentOpen = Math.random() * 100 + 10000;
        
        for (let i = 0; i < limit; i++) {
            const timestamp = baseTimestamp + (i * 24 * 60 * 60 * 1000);
            const open = currentOpen;
            const close = open + (Math.random() - 0.5) * open * 0.05;
            const high = Math.max(open, close) + Math.random() * open * 0.01;
            const low = Math.min(open, close) - Math.random() * open * 0.01;
            const volume = Math.random() * 1000000 + 100000;
            
            candles.push({ timestamp, open, high, low, close, volume });
            currentOpen = close;
        }
        return candles;
    }

    generateVolumeDataForPair(candleData, volumePeriods) {
        const volumes = [];
        let baseVolume = 1000000 + Math.random() * 5000000;
        
        for (let i = 0; i < volumePeriods; i++) {
            const variation = 0.3 + Math.random() * 1.4;
            const simulatedBaseVolume = Math.floor(baseVolume * variation);
            
            const mockPrice = candleData && candleData[i] ? candleData[i].close : 1;
            const simulatedQuoteVolume = simulatedBaseVolume * mockPrice;

            volumes.push({ baseVolume: simulatedBaseVolume, quoteVolume: simulatedQuoteVolume });
            
            baseVolume = baseVolume * (0.9 + Math.random() * 0.2);
        }
        
        return volumes;
    }

    async fetchBinanceData(symbol, interval, limit) {
        try {
            const response = await this.fetchWithFallback(
                `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
                null
            );

            if (response && response.length > 0) {
                const candles = response.map(kline => ({
                    timestamp: kline[0],
                    open: parseFloat(kline[1]),
                    high: parseFloat(kline[2]),
                    low: parseFloat(kline[3]),
                    close: parseFloat(kline[4]),
                    volume: parseFloat(kline[5])
                }));
                const volumes = response.map(kline => ({ 
                    baseVolume: parseFloat(kline[5]), 
                    quoteVolume: parseFloat(kline[5]) * parseFloat(kline[4]) 
                }));
                    return { candles, volumes };
            } else {
                console.log(`📊 Binance ${symbol}: Không có dữ liệu nến`);
            return { candles: [], volumes: [] };
            }
        } catch (error) {
            console.error(`Lỗi lấy dữ liệu từ Binance:`, error);
            return { candles: [], volumes: [] };
        }
    }

    async fetchOKXData(symbol, interval, limit) {
        try {
            const response = await this.fetchWithFallback(
                `https://www.okx.com/api/v5/market/candles?instId=${symbol}&bar=${interval}&limit=${limit}`,
                null
            );

            if (response && response.data && response.data.length > 0) {
                const candles = response.data.map(kline => ({
                    timestamp: parseInt(kline[0]),
                    open: parseFloat(kline[1]),
                    high: parseFloat(kline[2]),
                    low: parseFloat(kline[3]),
                    close: parseFloat(kline[4]),
                    volume: parseFloat(kline[5])
                }));
                const volumes = response.data.map(kline => ({ 
                    baseVolume: parseFloat(kline[5]), 
                    quoteVolume: parseFloat(kline[5]) * parseFloat(kline[4]) 
                }));
                    return { candles, volumes };
            } else {
                console.log(`📊 OKX ${symbol}: Không có dữ liệu nến`);
            return { candles: [], volumes: [] };
            }
        } catch (error) {
            console.error(`Lỗi lấy dữ liệu từ OKX:`, error);
            return { candles: [], volumes: [] };
        }
    }

    async fetchHuobiData(symbol, interval, limit) {
        try {
            const response = await this.fetchWithFallback(
                `https://api.huobi.pro/market/history/kline?symbol=${symbol}&period=${interval}&size=${limit}`,
                null
            );

            if (response && response.data && response.data.length > 0) {
                const candles = response.data.map(kline => ({
                    timestamp: kline.id * 1000,
                    open: parseFloat(kline.open),
                    high: parseFloat(kline.high),
                    low: parseFloat(kline.low),
                    close: parseFloat(kline.close),
                    volume: parseFloat(kline.vol)
                }));
                const volumes = response.data.map(kline => ({ 
                    baseVolume: parseFloat(kline.vol), 
                    quoteVolume: parseFloat(kline.vol) * parseFloat(kline.close) 
                }));
                    return { candles, volumes };
            } else {
                console.log(`📊 Huobi ${symbol}: Không có dữ liệu nến`);
            return { candles: [], volumes: [] };
            }
        } catch (error) {
            console.error(`Lỗi lấy dữ liệu từ Huobi:`, error);
            return { candles: [], volumes: [] };
        }
    }

    async fetchGateData(symbol, interval, limit) {
        try {
            const gateApiInterval = interval;

            const response = await this.fetchWithFallback(
                `https://api.gate.io/api/v4/spot/candlesticks?currency_pair=${symbol}&interval=${gateApiInterval}&limit=${limit}`,
                'gate'
            );
            console.log(`[DEBUG] Gate.io Raw kline data for ${symbol} with interval ${gateApiInterval}:`, response);
            if (response && response.length > 0) {
                console.log(`[DEBUG] Gate.io First candle structure:`, response[0]);
                console.log(`[DEBUG] Gate.io Last candle structure:`, response[response.length - 1]);
                console.log(`[DEBUG] Gate.io Data format: [timestamp, volume, close, high, low, open, quote_volume, status]`);
                
                if (response.length > 1) {
                    const timeDiff = parseFloat(response[1][0]) - parseFloat(response[0][0]);
                    console.log(`[DEBUG] Gate.io Time difference between candles: ${timeDiff} seconds (${timeDiff/60} minutes, ${timeDiff/3600} hours)`);
                    console.log(`[DEBUG] Gate.io Expected interval: ${gateApiInterval}`);
                }
            }

            if (response && response.length > 0) {
                const desiredCandleCount = limit; 
                
                const processedCandles = response;

                const recentCandles = processedCandles.slice(-desiredCandleCount);
                const orderedRecentCandles = recentCandles.slice().reverse();

                const candles = orderedRecentCandles.map((kline) => {
                    const timestamp = parseFloat(kline[0]) * 1000;
                    const candle = {
                        timestamp: timestamp,
                        open: parseFloat(kline[5]),
                        high: parseFloat(kline[3]),
                        low: parseFloat(kline[4]),
                        close: parseFloat(kline[2]),
                        volume: parseFloat(kline[1])
                    };
                    
                    return candle;
                });

                const volumes = orderedRecentCandles.map(kline => ({ 
                    baseVolume: parseFloat(kline[1]),
                    quoteVolume: parseFloat(kline[6])
                }));

                return { candles, volumes };
            } else {
                console.warn(`[WARN] No kline data received for ${symbol} with interval ${gateApiInterval}.`);
                return { candles: [], volumes: [] };
            }
        } catch (error) {
            console.error(`[ERROR] Error fetching Gate.io data for ${symbol} with interval ${gateApiInterval}:`, error);
            return { candles: [], volumes: [] };
        }
    }

    async fetchMEXCData(symbol, interval, limit) {
        try {
            const [base, quote] = symbol.split('_');
            const response = await this.fetchWithFallback(
                `https://api.mexc.com/api/v3/klines?symbol=${base}${quote}&interval=${interval}&limit=${limit}`,
                'mexc'
            );
            console.log(`[DEBUG] MEXC Raw kline data for ${symbol}:`, response);

            if (!response || (Array.isArray(response) && response.length === 0)) {
                this.showToast('❌ Lỗi lấy dữ liệu từ MEXC: Không có dữ liệu', 'error');
                throw new Error('Không thể lấy dữ liệu từ MEXC');
            }
            if (!Array.isArray(response)) {
                const code = response.code || 'unknown';
                const msg = response.msg || 'Unknown error';
                console.warn(`[DEBUG] MEXC error response: code=${code}, msg=${msg}`);
                this.showToast(`MEXC lỗi: ${msg}`, 'error');
                return { candles: [], volumes: [] };
            }
            if (response && response.length > 0) {
                const klines = response.slice().reverse();
                const candles = klines.map(kline => ({
                    timestamp: parseInt(kline[0]),
                    open: parseFloat(kline[1]),
                    high: parseFloat(kline[2]),
                    low: parseFloat(kline[3]),
                    close: parseFloat(kline[4]),
                    volume: parseFloat(kline[5])
                }));
                const volumes = klines.map(kline => ({ 
                    baseVolume: parseFloat(kline[5]), 
                    quoteVolume: parseFloat(kline[5]) * parseFloat(kline[4]) 
                }));
                if (interval === '1d' && (limit && limit > 0)) {
                }
                return { candles, volumes };
            }
        } catch (error) {
            console.error(`Lỗi lấy dữ liệu từ MEXC:`, error);
            this.showToast(`Lỗi kết nối API.`, 'error');
            throw error;
        }
    }

    async fetchBybitData(symbol, interval, limit) {
        try {
            const response = await this.fetchWithFallback(
                `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${limit}`,
                null
            );

            if (response && response.result && response.result.list && response.result.list.length > 0) {
                const candles = response.result.list.map(kline => ({
                    timestamp: parseInt(kline[0]),
                    open: parseFloat(kline[1]),
                    high: parseFloat(kline[2]),
                    low: parseFloat(kline[3]),
                    close: parseFloat(kline[4]),
                    volume: parseFloat(kline[5])
                }));
                const volumes = response.result.list.map(kline => ({ 
                    baseVolume: parseFloat(kline[5]), 
                    quoteVolume: parseFloat(kline[5]) * parseFloat(kline[4]) 
                }));
                    return { candles, volumes };
            } else {
                console.log(`📊 Bybit ${symbol}: Không có dữ liệu nến`);
            return { candles: [], volumes: [] };
            }
        } catch (error) {
            console.error(`Lỗi lấy dữ liệu từ Bybit:`, error);
            return { candles: [], volumes: [] };
        }
    }

    checkCandleCondition(candleData, selectedCondition, conditionValue) {
        for (let i = 0; i < candleData.length; i++) {
            const candle = candleData[i];
            const open = candle.open;
            const close = candle.close;
            
            let conditionMet = false;
            
            if (selectedCondition === 'body') {
                const bodyPercent = Math.abs(close - open) / (candle.high - candle.low) * 100;
                conditionMet = bodyPercent < parseFloat(conditionValue);
                
                console.log(`Nến ${i + 1}: Open=${open.toFixed(5)}, Close=${close.toFixed(5)}, High=${candle.high.toFixed(5)}, Low=${candle.low.toFixed(5)}, Body%=${bodyPercent.toFixed(2)}%, Điều kiện < ${conditionValue}%: ${conditionMet}`);
            } else {
                const changePercent = Math.abs((close - open) / open * 100);
                conditionMet = changePercent < parseFloat(conditionValue);
                
                console.log(`Nến ${i + 1}: Open=${open.toFixed(5)}, Close=${close.toFixed(5)}, Thay đổi%=${changePercent.toFixed(2)}%, Điều kiện < ${conditionValue}%: ${conditionMet}`);
            }
            
            if (conditionMet) {
                console.log(`✅ Nến ${i + 1} thỏa mãn điều kiện!`);
                return true;
            }
        }
        
        console.log('❌ Không có nến nào thỏa mãn điều kiện');
        return false;
    }

    checkVolumeCondition(volumeData) {
        if (volumeData.length < 2) return false;
        
        const currentVolume = volumeData[volumeData.length - 1].baseVolume;
        
        const previousVolumes = volumeData.slice(0, -1);
        const averageVolume = previousVolumes.reduce((sum, vol) => sum + vol.baseVolume, 0) / previousVolumes.length;
        
        const conditionMet = currentVolume > averageVolume;
        
        console.log(`📊 Volume: Hiện tại=${currentVolume.toLocaleString()}, Trung bình=${averageVolume.toLocaleString()}, Điều kiện >: ${conditionMet}`);
        
        return conditionMet;
    }

    getConditionDescription(condition) {
        if (condition === 'body') {
            return 'Thân nến < 15% + Khối lượng';
        } else {
            return 'Thay đổi giá < 20% + Khối lượng';
        }
    }

    showLoading() {
        this.resultsTable.classList.add('hidden');
        this.initialContent.classList.add('hidden');
        this.errorMessageContainer.classList.add('hidden');
        
        this.loading.classList.remove('hidden');
        this.progressContainer.classList.remove('hidden');
    }

    hideLoading() {
        this.loading.classList.add('hidden');
        this.progressContainer.classList.add('hidden');
    }

    showResults(results) {
        this.resultsTable.classList.remove('hidden');
        this.populateResultsTable(results);
    }

    populateResultsTable(results) {
        this.resultsBody.innerHTML = '';
        this.resultsTable.classList.remove('hidden');
        this.resultsTitle.classList.remove('hidden');
        
        results.forEach((result, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            
            row.innerHTML = `
                <td>${result.exchange}</td>
                <td><strong>${result.pair}</strong></td>
                <td>${result.currentPrice.toFixed(result.pair.includes('USDT') ? 4 : 8)}</td>
                <td>${result.highPrice.toFixed(result.pair.includes('USDT') ? 4 : 8)}</td>
                <td>${result.lowPrice.toFixed(result.pair.includes('USDT') ? 4 : 8)}</td>
                <td style="color: ${result.change24h > 0 ? '#4CAF50' : '#f44336'};">${result.change24h}%</td>
                <td><a href="${this.getExchangePairUrl(result.exchangeId, result.pair)}" target="_blank" class="view-live-link">Xem ngay</a></td>
            `;
            
            row.addEventListener('click', (event) => {
                if (event.target.classList.contains('view-live-link')) {
                    event.stopPropagation();
                    return;
                }
                this.showChart(result, index);
            });
            
            this.resultsBody.appendChild(row);
        });
    }

    showChart(result, index) {
        this.currentResult = result;

        document.getElementById('chartTitle').textContent = `${result.pair} · 3D · ${result.exchange}`;
        
        const candleData = result.candleData;
        const volumeData = result.volumeData;
        
        const currentCandle = candleData[candleData.length - 1];
        
        const previousCandle = candleData.length > 1 ? candleData[candleData.length - 2] : null;
        const currentPrice = currentCandle ? currentCandle.close : 0;
        const openPrice = currentCandle ? currentCandle.open : 0;
        const highPrice = currentCandle ? currentCandle.high : 0;
        const lowPrice = currentCandle ? currentCandle.low : 0;
        
        this.updateChartInfo(currentCandle, candleData.length - 1, result, previousCandle, candleData, volumeData);
        
        this.drawCandlestickChart(candleData, candleData.length - 1);
        this.chartModal.classList.add('show');
    }

    drawGridLines(svg, chartWidth, chartStartY, chartAreaHeight, margin, minPrice, maxPrice) {
        const priceToY = (price) => {
            return chartStartY + chartAreaHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartAreaHeight;
        };
        
        const priceLevels = 5;
        for (let i = 0; i <= priceLevels; i++) {
            const price = minPrice + (maxPrice - minPrice) * (i / priceLevels);
            const y = priceToY(price);
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', margin);
            line.setAttribute('y1', y);
            line.setAttribute('x2', chartWidth - margin);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', '#e0e0e0');
            line.setAttribute('stroke-width', '1');
            line.setAttribute('stroke-dasharray', '5,5');
            svg.appendChild(line);
        }
    }

    drawTimeLabels(svg, chartWidth, totalChartHeight, margin, candleData, startX, candleWidth, spacing, yOffset) {

        candleData.forEach((candle, index) => {
            const x = startX + index * (candleWidth + spacing) + candleWidth / 2;
            
            const date = new Date(candle.timestamp);
            
            let formattedDate;
            if (this.currentResult && this.currentResult.exchangeId === 'gate') {
                formattedDate = date.toLocaleString('vi-VN', { 
                    day: '2-digit', 
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else {
                formattedDate = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            }

            const timeLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            timeLabel.setAttribute('x', x);
            timeLabel.setAttribute('y', yOffset);
            timeLabel.setAttribute('fill', '#ccc');
            timeLabel.setAttribute('font-size', '10px');
            timeLabel.setAttribute('text-anchor', 'middle');
            timeLabel.textContent = formattedDate;
            timeLabel.classList.add('time-label');
            timeLabel.setAttribute('data-index', index);
            svg.appendChild(timeLabel);
        });
    }

    drawCandlestickChart(candleData, highlightIndex = -1) {
        const chart = document.getElementById('candlestickChart');
        chart.innerHTML = '';
        
        const reversedCandleData = [...candleData].reverse();

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', '150 0 500 500');
        
        const chartWidth = 800;
        const totalChartHeight = 500;
        const margin = 20;
        
        const candlestickAreaHeight = 300;
        const dateLabelAreaHeight = 50;
        const volumeAreaHeight = 100;
        
        const candlestickStartY = margin;
        const dateLabelStartY = candlestickStartY + candlestickAreaHeight;
        const volumeStartY = dateLabelStartY + dateLabelAreaHeight;

        const candleWidth = 40;
        const spacing = 15;
        const limit = reversedCandleData.length; 
        const availableWidth = chartWidth - 2 * margin;
        const totalCandleWidth = limit * candleWidth + (limit - 1) * spacing;
        const startX = margin + (availableWidth - totalCandleWidth) / 2;
        
        let minPrice = Math.min(...reversedCandleData.map(c => c.low));
        let maxPrice = Math.max(...reversedCandleData.map(c => c.high));
        const priceRange = maxPrice - minPrice;
        const padding = priceRange * 0.1;
        minPrice -= padding;
        maxPrice += padding;
        
        const priceToY = (price) => {
            return candlestickStartY + candlestickAreaHeight - ((price - minPrice) / (maxPrice - minPrice)) * candlestickAreaHeight;
        };
        this.drawTimeLabels(svg, chartWidth, totalChartHeight, margin, reversedCandleData, startX, candleWidth, spacing, dateLabelStartY + dateLabelAreaHeight / 2);

        reversedCandleData.forEach((candle, index) => {
            const x = startX + index * (candleWidth + spacing);
            const isGreen = candle.close > candle.open;
            const color = isGreen ? '#4CAF50' : '#f44336';
            
            const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            body.setAttribute('x', x);
            body.setAttribute('y', priceToY(Math.max(candle.open, candle.close)));
            body.setAttribute('width', candleWidth);
            body.setAttribute('height', Math.abs(priceToY(candle.open) - priceToY(candle.close)) || 1);
            body.setAttribute('fill', color);
            body.setAttribute('stroke', color);
            body.setAttribute('stroke-width', '1');
            svg.appendChild(body);

            const wick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            wick.setAttribute('x1', x + candleWidth / 2);
            wick.setAttribute('y1', priceToY(candle.high));
            wick.setAttribute('x2', x + candleWidth / 2);
            wick.setAttribute('y2', priceToY(candle.low));
            wick.setAttribute('stroke', color);
            wick.setAttribute('stroke-width', '1');
            svg.appendChild(wick);

            body.addEventListener('mouseenter', () => {
                if (window.innerWidth > 768) {
                    const hoveredCandle = reversedCandleData[index];
                    const previousHoveredCandle = index > 0 ? reversedCandleData[index - 1] : null;
                    this.updateChartInfo(hoveredCandle, index, this.currentResult, previousHoveredCandle, reversedCandleData, this.currentResult.volumeData);
                    this.highlightTimeLabel(index, true);
                }
            });

            body.addEventListener('click', (event) => {
                event.stopPropagation();
                
                if (this.lastClickedCandleIndex !== undefined && this.lastClickedCandleIndex !== -1 && this.lastClickedCandleIndex !== index) {
                    this.highlightTimeLabel(this.lastClickedCandleIndex, false);
                }

                const clickedCandle = reversedCandleData[index];
                const previousClickedCandle = index > 0 ? reversedCandleData[index - 1] : null;
                this.updateChartInfo(clickedCandle, index, this.currentResult, previousClickedCandle, reversedCandleData, this.currentResult.volumeData);
                this.highlightTimeLabel(index, true);
                this.lastClickedCandleIndex = index;
            });

            body.addEventListener('mouseleave', () => {
                if (window.innerWidth > 768 && this.lastClickedCandleIndex === undefined) {
                    const lastCandleIndex = reversedCandleData.length - 1;
                    const lastCandle = reversedCandleData[lastCandleIndex];
                    const previousLastCandle = lastCandleIndex > 0 ? reversedCandleData[lastCandleIndex - 1] : null;
                    this.updateChartInfo(lastCandle, lastCandleIndex, this.currentResult, previousLastCandle, reversedCandleData, this.currentResult.volumeData);
                    this.highlightTimeLabel(lastCandleIndex, true);
                }
            });

            if (index === highlightIndex) {
                this.highlightTimeLabel(index, true);
                this.lastClickedCandleIndex = index;
            }

            body.setAttribute('data-index', index);
        });

        const reversedVolumeData = [...this.currentResult.volumeData].reverse();
        const maxVolume = Math.max(...reversedVolumeData.map(v => v.baseVolume));

        const volumeToY = (volume) => {
            return volumeStartY + volumeAreaHeight - ((volume / maxVolume) * volumeAreaHeight);
        };

        reversedVolumeData.forEach((volumeObj, index) => {
            const volume = volumeObj.baseVolume;
            const x = startX + index * (candleWidth + spacing);
            const height = (volume / maxVolume) * volumeAreaHeight;
            const y = volumeStartY + volumeAreaHeight - height;

            const candleObj = reversedCandleData[index];
            const isBullish = candleObj.close >= candleObj.open;
            const barColor = isBullish ? '#4CAF50' : '#f44336';

            const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bar.setAttribute('x', x);
            bar.setAttribute('y', y);
            bar.setAttribute('width', candleWidth);
            bar.setAttribute('height', height);
            bar.setAttribute('fill', barColor);
            bar.setAttribute('stroke', barColor);
            bar.setAttribute('stroke-width', '1');
            svg.appendChild(bar);

            if (height > 20) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', x + candleWidth / 2);
                text.setAttribute('y', y - 5);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('font-size', '10');
                text.setAttribute('fill', '#666');
                text.textContent = (volume / 1000).toFixed(0) + 'K';
                svg.appendChild(text);
            }

            bar.addEventListener('mouseenter', () => {
                const hoveredCandle = reversedCandleData[index];
                const previousHoveredCandle = index > 0 ? reversedCandleData[index - 1] : null;
                this.updateChartInfo(hoveredCandle, index, this.currentResult, previousHoveredCandle, reversedCandleData, this.currentResult.volumeData);
                this.highlightTimeLabel(index, true);
            });

            bar.addEventListener('mouseleave', () => {
                const lastCandle = reversedCandleData[reversedCandleData.length - 1];
                const previousCandle = reversedCandleData.length > 1 ? reversedCandleData[reversedCandleData.length - 2] : null;
                this.updateChartInfo(lastCandle, reversedCandleData.length - 1, this.currentResult, previousCandle, reversedCandleData, this.currentResult.volumeData);
                this.highlightTimeLabel(-1, false);
            });

            bar.setAttribute('data-index', index);
        });

        svg.querySelectorAll('.time-label').forEach(label => {
            label.addEventListener('mouseenter', (event) => {
                const index = parseInt(event.target.getAttribute('data-index'));
                const hoveredCandle = reversedCandleData[index];
                const previousHoveredCandle = index > 0 ? reversedCandleData[index - 1] : null;
                this.updateChartInfo(hoveredCandle, index, this.currentResult, previousHoveredCandle, reversedCandleData, this.currentResult.volumeData);
                this.highlightTimeLabel(index, true);
            });
            label.addEventListener('mouseleave', () => {
                const lastCandle = reversedCandleData[reversedCandleData.length - 1];
                const previousCandle = reversedCandleData.length > 1 ? reversedCandleData[reversedCandleData.length - 2] : null;
                this.updateChartInfo(lastCandle, reversedCandleData.length - 1, this.currentResult, previousCandle, reversedCandleData, this.currentResult.volumeData);
                this.highlightTimeLabel(-1, false);
            });
        });

        chart.appendChild(svg);
    }

    closeChartModal() {
        this.chartModal.classList.remove('show');
        
        if (this.selectedRow) {
            this.selectedRow.classList.remove('selected');
            this.selectedRow = null;
        }
    }

    collapseFilterPanel() {
        this.filterPanel.style.width = '300px';
        this.filterPanel.style.transition = 'width 0.5s ease';
    }

    updateStatusBar(message) {
        this.statusBar.textContent = `USDT Trading - Phiên bản Portable | ${message}`;
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.classList.add('toast', type);
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    initializeProgress(exchanges, pairs) {
        this.progressDetails.innerHTML = '';
        this.totalTasks = pairs.length * exchanges.length;
        this.completedTasks = 0;
        this.progressItems = new Map();
        
        exchanges.forEach(exchangeId => {
            pairs.forEach(pair => {
                const progressKey = `${exchangeId}-${pair}`;
                const progressItemDiv = document.createElement('div');
                progressItemDiv.classList.add('progress-detail-item');
                progressItemDiv.id = `progress-item-${progressKey}`;
                
                const pairNameSpan = document.createElement('span');
                pairNameSpan.classList.add('pair-name');
                pairNameSpan.textContent = `${exchangeId.toUpperCase()} - ${pair}`;

                const statusMessageSpan = document.createElement('span');
                statusMessageSpan.classList.add('status-message', 'status-processing');
                statusMessageSpan.textContent = 'Đang xử lý';

                progressItemDiv.appendChild(pairNameSpan);
                progressItemDiv.appendChild(statusMessageSpan);
                this.progressDetails.appendChild(progressItemDiv);
                this.progressItems.set(progressKey, { element: progressItemDiv, statusElement: statusMessageSpan, status: 'pending' });
            });
        });
        this.updateProgress();
    }
    
    addProgressItem(key, exchangeId, pair) {
        const item = document.createElement('div');
        item.className = 'progress-item';
        item.id = `progress-${key}`;
        
        const exchangeNames = {
            'binance': 'Binance',
            'okx': 'OKX',
            'huobi': 'Huobi',
            'gate': 'Gate',
            'mexc': 'MEXC',
            'bybit': 'Bybit'
        };
        
        item.innerHTML = `
            <div class="progress-item-name">${exchangeNames[exchangeId]} - ${pair}</div>
            <div class="progress-item-status status-pending" id="status-${key}">Chờ xử lý</div>
        `;
        
        this.progressDetails.appendChild(item);
    }
    
    updateProgressItem(key, status, message = '') {
        const item = this.progressItems.get(key);
        if (item) {
            item.status = status;
            item.statusElement.classList.remove('status-processing', 'status-success', 'status-failure', 'status-skipped');
            
            let statusText = '';
                switch (status) {
                    case 'processing':
                    statusText = 'Đang xử lý';
                    item.statusElement.classList.add('status-processing');
                        break;
                case 'satisfied_success':
                    statusText = 'Thành công';
                    item.statusElement.classList.add('status-satisfied-success');
                    break;
                case 'unsatisfied_success':
                    statusText = 'Thành công';
                    item.statusElement.classList.add('status-unsatisfied-success');
                        break;
                    case 'error':
                    statusText = message || 'Lỗi';
                    item.statusElement.classList.add('status-failure');
                    break;
                case 'skipped':
                    statusText = 'Bỏ qua';
                    item.statusElement.classList.add('status-skipped');
                    break;
                default:
                    statusText = status;
                        break;
                }
            item.statusElement.textContent = statusText;
            }
        this.updateProgress();
    }
    
    updateProgress() {
        const percentage = this.totalTasks > 0 ? Math.round((this.completedTasks / this.totalTasks) * 100) : 0;
        
        this.progressFill.style.width = `${percentage}%`;
        
        let statusMessage;
        
        statusMessage = `${this.completedTasks}/${this.totalTasks} (${percentage}%)`;

        if (this.satisfiedResultsCount !== undefined) {
            statusMessage += ` *- OK: ${this.satisfiedResultsCount}`;
        }
        
        this.progressStatus.textContent = statusMessage;
    }
    
    completeTask() {
        this.completedTasks++;
        this.updateProgress();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    aggregateCandles(candles, targetInterval) {
        if (!candles || candles.length === 0) return [];
        
        const targetIntervalMs = parseInt(targetInterval) * 1000; 
        const aggregatedCandles = [];
        const candlesByPeriod = new Map();
        
        candles.forEach(candle => {
            const timestamp = parseFloat(candle[0]) * 1000;
            const periodStart = Math.floor(timestamp / targetIntervalMs) * targetIntervalMs;
            const periodKey = periodStart.toString();
            
            if (!candlesByPeriod.has(periodKey)) {
                candlesByPeriod.set(periodKey, []);
            }
            candlesByPeriod.get(periodKey).push(candle);
        });
        
        candlesByPeriod.forEach((periodCandles, periodKey) => {
            if (periodCandles.length === 0) return;
            
            periodCandles.sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
            
            const firstCandle = periodCandles[0];
            const lastCandle = periodCandles[periodCandles.length - 1];
            
            const open = parseFloat(firstCandle[5]);
            const close = parseFloat(lastCandle[2]);
            const high = Math.max(...periodCandles.map(c => parseFloat(c[3])));
            const low = Math.min(...periodCandles.map(c => parseFloat(c[4])));
            const volume = periodCandles.reduce((sum, c) => sum + parseFloat(c[1]), 0);
            const quoteVolume = periodCandles.reduce((sum, c) => sum + parseFloat(c[6]), 0);
            
            const periodTimestamp = parseFloat(firstCandle[0]);
            
            const aggregatedCandle = [
                periodTimestamp.toString(),
                volume.toString(),
                close.toString(),
                high.toString(),
                low.toString(),
                open.toString(),
                quoteVolume.toString(),
                'true'
            ];
            
            aggregatedCandles.push(aggregatedCandle);
        });
        
        aggregatedCandles.sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
        
        console.log(`[DEBUG] Created ${aggregatedCandles.length} ${targetInterval}-second candles from ${candles.length} raw candles`);
       
        return aggregatedCandles;
    }

    async fetchWithRateLimit(url, fallbackData = null, delayMs = 100) {
        await this.delay(delayMs);
        return await this.fetchWithFallback(url, fallbackData);
    }

    logFetchDetails(exchange, symbol, data, method) {
        const timestamp = new Date().toISOString();
        console.log(`🕐 [${timestamp}] ${exchange} ${symbol}: ${method}`);
        if (data && Array.isArray(data)) {
            console.log(`   📊 Số lượng candles: ${data.length}`);
            if (data.length > 0) {
                console.log(`   📈 Candle đầu tiên:`, data[0]);
                console.log(`   📉 Candle cuối cùng:`, data[data.length - 1]);
            }
        } else if (data && data.data && Array.isArray(data.data)) {
            console.log(`   📊 Số lượng candles: ${data.data.length}`);
            if (data.data.length > 0) {
                console.log(`   📈 Candle đầu tiên:`, data.data[0]);
                console.log(`   📉 Candle cuối cùng:`, data.data[data.data.length - 1]);
            }
        } else if (data && data.result && data.result.list && Array.isArray(data.result.list)) {
            console.log(`   📊 Số lượng candles: ${data.result.list.length}`);
            if (data.result.list.length > 0) {
                console.log(`   📈 Candle đầu tiên:`, data.result.list[0]);
                console.log(`   📉 Candle cuối cùng:`, data.result.list[data.result.list.length - 1]);
            }
        } else {
            console.log(`   ❌ Không có dữ liệu hoặc format không đúng`);
        }
    }

    checkDataConsistency(exchange, symbol, candles) {
        if (!candles || candles.length === 0) {
            console.warn(`⚠️ ${exchange} ${symbol}: Không có dữ liệu candles`);
            return false;
        }

        for (let i = 0; i < candles.length; i++) {
            const candle = candles[i];
            if (!candle.open || !candle.high || !candle.low || !candle.close || !candle.volume) {
                console.error(`❌ ${exchange} ${symbol}: Candle ${i} có dữ liệu không hợp lệ:`, candle);
                return false;
            }
            
            if (candle.high < candle.low || candle.high < candle.open || candle.high < candle.close ||
                candle.low > candle.open || candle.low > candle.close) {
                console.error(`❌ ${exchange} ${symbol}: Candle ${i} có giá không hợp lệ:`, candle);
                return false;
            }
        }

        console.log(`✅ ${exchange} ${symbol}: Dữ liệu hợp lệ (${candles.length} candles)`);
        return true;
    }

    async fetchWithFallback(url, exchangeId = null, retries = 3, delay = 1000) {
        let finalUrl = url;
        if ((exchangeId === 'gate' || exchangeId === 'mexc') && !url.startsWith(`${this.corsProxyBaseUrl}/proxy`)) {
            finalUrl = `${this.corsProxyBaseUrl}/proxy?url=${encodeURIComponent(url)}`;
            console.log(`[DEBUG] Using local CORS proxy for ${exchangeId}: ${finalUrl}`);
        }

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(finalUrl);
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ API call thành công: ${finalUrl}`);
                    if (exchangeId === 'gate' || exchangeId === 'mexc') {
                        console.log(`[DEBUG] Raw data from ${exchangeId} (via proxy):`, data);
                    }
                    return data;
                } else if (response.status === 429 && i < retries - 1) {
                    console.warn(`⚠️ API call thất bại với status ${response.status}: ${finalUrl}. Thử lại sau ${delay / 1000} giây...`);
                    this.showToast(`API call thất bại (${response.status}). Thử lại...`, 'warning');
                    await this.delay(delay);
                    delay *= 2;
                } else {
                    console.warn(`⚠️ API call thất bại với status ${response.status}: ${finalUrl}`);
                    
                    // Thử parse error response để hiển thị thông tin chi tiết hơn
                    try {
                        const errorData = await response.json();
                        console.error(`[ERROR] API Error Details:`, errorData);
                    } catch (parseError) {
                        console.error(`[ERROR] Could not parse error response`);
                    }
                    
                    this.showToast(`API call thất bại (${response.status}).`, 'error');
                    break;
                }
            } catch (error) {
                console.error(`❌ Lỗi fetch từ ${finalUrl}:`, error);
                this.showToast(`Lỗi kết nối API: ${error.message}`, 'error');
                break;
            }
        }
        
        console.log(`🔄 Không thể lấy dữ liệu từ: ${finalUrl} sau ${retries} lần thử.`);
        return null;
    }

    updateChartInfo(currentCandle, hoverIndex, result, previousCandle, candleData, volumeData) {
        const [baseAsset, quoteAsset] = result.pair.split('/');

        const currentPrice = currentCandle.close;
        const open = currentCandle.open;
        const high = currentCandle.high;
        const low = currentCandle.low;
        const close = currentCandle.close;
        const candleDate = new Date(currentCandle.timestamp);
        const formattedDate = candleDate.toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        const changeValue = (close - open).toFixed(2);
        const changePercent = ((close - open) / open * 100).toFixed(2);
        const changeColor = changePercent > 0 ? '#4CAF50' : '#f44336';
        const changeSign = changePercent > 0 ? '+' : '';
        const amplitudePercent = ((high - low) / low * 100).toFixed(2);
        const candlesForSMA = candleData.slice(0, hoverIndex + 1);
        const sma7 = this.calculateSMA(candlesForSMA, 7);
        const sma25 = this.calculateSMA(candlesForSMA, 25);
        const sma99 = this.calculateSMA(candlesForSMA, 99);

        const currentVolume = volumeData[hoverIndex];
        
        document.getElementById('chartTitle').textContent = `${result.pair} · ${formattedDate} · ${result.exchange}`;

        this.chartCurrentPrice.textContent = currentPrice.toFixed(4);
        this.chartCurrentPrice.style.color = currentPrice >= open ? '#4CAF50' : '#f44336';

        this.chartOpen.textContent = open.toFixed(4);
        this.chartHigh.textContent = high.toFixed(4);
        this.chartHigh.style.color = '#4CAF50';

        this.chartLow.textContent = low.toFixed(4);
        this.chartLow.style.color = '#f44336';
        
        this.chartClose.textContent = close.toFixed(4);

        this.chartChange.textContent = `${changeSign}${changeValue} (${changeSign}${changePercent}%)`;
        this.chartChange.style.color = changeColor;

        this.chartRange.textContent = `${amplitudePercent}%`;
        this.chartRange.style.color = '#ffd700';

        this.chartSma7.textContent = `${sma7}`;
        this.chartSma7.style.color = '#ffd700';

        this.chartSma25.textContent = `${sma25}`;
        this.chartSma25.style.color = '#FF69B4';

        this.chartSma99.textContent = `${sma99}`;
        this.chartSma99.style.color = '#9370DB';

        this.chartBaseAsset.textContent = baseAsset;
        this.chartVolumeBase.textContent = currentVolume.baseVolume.toLocaleString('en-US', { maximumFractionDigits: 0 });
        
        this.chartVolumeQuote.textContent = currentVolume.quoteVolume.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }

    getExchangeInterval(exchangeId, interval) {
        switch (exchangeId) {
            case 'binance':
                return interval; 
            case 'okx':
                switch (interval) {
                    case '1h': return '1H';
                    case '4h': return '4H';
                    case '1d': return '1D';
                    case '1w': return '1W';
                    case '1M': return '1M';
                    default: return '1D';
                }
            case 'huobi':
                switch (interval) {
                    case '1h': return '60min';
                    case '4h': return '4hour';
                    case '1d': return '1day';
                    case '3d': return '3day';
                    case '1w': return '1week';
                    case '1M': return '1mon';
                    default: return '1day';
                }
            case 'gate':
                switch (interval) {
                    case '30m': return '30m';
                    case '1h': return '1h';
                    case '4h': return '4h';
                    case '1d': return '1d';
                    case '3d': return '3d';
                    case '1w': return '1w';
                    default: return '1d';
                }
            case 'mexc':
                if (interval === '3d' || interval === '1w') {
                    return '1d';
                } else if(interval === '1h') {
                    return '30m';
                }
                return interval;
            case 'bybit':
                switch (interval) {
                    case '1h': return '60';
                    case '4h': return '240';
                    case '1d': return 'D';
                    case '1w': return 'W';
                    case '1M': return 'M';
                    default: return 'D';
                }
            default: return '1d';
        }
    }

    getExchangePairUrl(exchangeId, pair) {
        const [base, quote] = pair.split('/');
        switch (exchangeId.toLowerCase()) {
            case 'binance':
                return `https://www.binance.com/en/trade/${base}_${quote}?type=spot`;
            case 'okx':
                return `https://www.okx.com/trade-spot/${base}-${quote}`;
            case 'huobi':
                return `https://www.huobi.com/en-us/exchange/${base.toLowerCase()}_${quote.toLowerCase()}`;
            case 'gate':
                return `https://www.gate.io/trade/${base}_${quote}`;
            case 'mexc':
                return `https://www.mexc.com/exchange/${base}_${quote}`;
            case 'bybit':
                return `https://www.bybit.com/trade/spot/${base}/${quote}`;
            default:
                return `#`;
        }
    }

    calculateSMA(data, period) {
        if (data.length < period) {
            return 'N/A';
        }
        const sum = data.slice(-period).reduce((acc, candle) => acc + candle.close, 0);
        return (sum / period).toFixed(2);
    }

    populateExchangeIntervalOptions(exchangeId) {
        const intervalSelect = this.exchangeCandleIntervalSelects[exchangeId];
        if (!intervalSelect) return;

        const supportedIntervals = this.exchangeSupportedIntervals[exchangeId];
        intervalSelect.innerHTML = '';

        const intervalLabels = {
            '30m': '30 phút',
            '1h': '1 giờ',
            '4h': '4 giờ',
            '1d': '1 ngày',
            '3d': '3 ngày',
            '1w': '1 tuần',
            '1M': '1 tháng'
        };

        if (supportedIntervals) {
            supportedIntervals.forEach(interval => {
                const option = document.createElement('option');
                option.value = interval;
                option.textContent = intervalLabels[interval] || interval;
                intervalSelect.appendChild(option);
            });
        }

        if (intervalSelect.options.length > 0 && intervalSelect.value === '') {
            intervalSelect.value = intervalSelect.options[0].value;
        }
    }

    highlightTimeLabel(index, highlight) {
        const timeLabels = document.querySelectorAll('.time-label');
        timeLabels.forEach((label, labelIndex) => {
            if (index === -1) {
                label.classList.remove('highlighted');
            } else if (labelIndex === index && highlight) {
                label.classList.add('highlighted');
            } else {
                label.classList.remove('highlighted');
            }
        });
    }

    async checkProxyConnection() {
        try {
            const response = await fetch(`${this.corsProxyBaseUrl}/health`);
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Proxy server connection OK:', data);
                this.showToast('Proxy server connected successfully', 'success');
            } else {
                console.warn('⚠️ Proxy server health check failed:', response.status);
                this.showToast('Proxy server connection issue', 'warning');
            }
        } catch (error) {
            console.error('❌ Proxy server connection failed:', error);
            this.showToast('Cannot connect to proxy server', 'error');
        }
    }

    updateDisplayState(results, errorMessage = null) {
        this.initialContent.classList.add('hidden');
        this.resultsTable.classList.add('hidden');
        this.resultsTitle.classList.add('hidden');
        this.errorMessageContainer.classList.add('hidden');
        this.resultsArea.style.justifyContent = 'flex-start';

        if (errorMessage) {
            this.loading.classList.add('hidden');
            this.progressContainer.classList.add('hidden');
            this.resultsTitle.classList.remove('hidden');
            this.errorMessageContainer.classList.remove('hidden');
            this.errorMessageDetail.textContent = errorMessage;
        } else if (results && results.length > 0) {
            this.populateResultsTable(results);
            this.resultsTable.classList.remove('hidden');
            this.resultsTitle.classList.remove('hidden');
            this.errorMessageContainer.classList.add('hidden');
        } else {
            this.loading.classList.add('hidden');
            this.progressContainer.classList.add('hidden');
            this.initialContent.classList.remove('hidden');
            this.resultsArea.style.justifyContent = 'center';
        }
    }
}

// Khởi tạo ứng dụng khi trang tải xong
document.addEventListener('DOMContentLoaded', () => {
    const app = new USDTTradingPortable();
    app.setupEventListeners();

    document.querySelectorAll('.exchange-checkbox').forEach(checkbox => {
        if (checkbox.checked) {
            const event = { target: checkbox };
            app.handleExchangeChange(event);
        }
    });
});