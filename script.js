// USDT Trading - Phiên bản Portable
// Không cần cài đặt - chạy trên mọi trình duyệt

class USDTTradingPortable {
    constructor() {
        // Initialize DOM elements directly in the constructor
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

        // Chart info elements
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

        // Progress elements
        this.progressDetails = document.getElementById('progressDetails');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressStatus = document.getElementById('progressStatus');
        this.progressFill = document.getElementById('progressFill');

        // Progress tracking
        this.totalTasks = 0;
        this.completedTasks = 0;
        this.satisfiedResultsCount = 0;
        this.progressItems = new Map();

        // Define supported intervals for each exchange
        this.exchangeSupportedIntervals = {
            'binance': ['1h', '4h', '1d', '3d', '1w', '1M'],
            'okx': ['1h', '4h', '1d', '1w', '1M'],
            'huobi': ['1h', '4h', '1d', '1w', '1M'],
            'gate': ['1h', '4h', '1d', '3d', '1w', '1M'],
            'mexc': ['1h', '4h', '1d', '3d', '1w', '1M'],
            'bybit': ['1h', '4h', '1d', '1w', '1M']
        };

        // Store references to the new per-exchange candle interval selects
        this.exchangeCandleIntervalSelects = {};
        ['binance', 'okx', 'huobi', 'gate', 'mexc', 'bybit'].forEach(exchangeId => {
            this.exchangeCandleIntervalSelects[exchangeId] = document.getElementById(`${exchangeId}CandleInterval`);
            this.populateExchangeIntervalOptions(exchangeId);
        });
        
        // Initial display state: show initial content
        this.updateDisplayState([], null); 
        
        this.selectedRow = null;
    }

    setupEventListeners() {
        // Nút quét
        this.scanButton.addEventListener('click', () => this.startScan());

        // Checkbox sàn giao dịch
        document.querySelectorAll('.exchange-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.handleExchangeChange(e));
        });

        // Event listeners for per-exchange candle interval selects
        document.querySelectorAll('.candle-interval-select').forEach(select => {
            select.addEventListener('change', () => this.showToast('Khoảng thời gian nến đã cập nhật', 'info'));
        });

        // Radio button điều kiện nến
        document.querySelectorAll('input[name="candleCondition"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.handleConditionChange(e));
        });

        // Input fields
        document.querySelectorAll('.input-field').forEach(input => {
            input.addEventListener('input', () => this.showToast('Cài đặt đã cập nhật', 'info')); // Thay thế updateStatusBar
        });

        // Close chart modal
        this.closeChart.addEventListener('click', () => this.closeChartModal());
        
        // Close modal when clicking outside
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
                // console.log(`[DEBUG] Exchange ${exchangeId} checked. Interval select disabled: ${intervalSelect.disabled}`);
                // ensure dropdown has options, default to first if none selected
                if (intervalSelect.value === "" && intervalSelect.options.length > 0) {
                        intervalSelect.value = intervalSelect.options[0].value;
                }
            }
        } else {
            exchangeItem.classList.remove('selected');
            exchangeItem.style.background = '#3a3a3a';
            if (intervalSelect) {
                intervalSelect.disabled = true;
                // console.log(`[DEBUG] Exchange ${exchangeId} unchecked. Interval select disabled: ${intervalSelect.disabled}`);
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
        // this.updateCandleIntervalOptions(); // REMOVED
    }

    handleConditionChange(event) {
        const radio = event.target;
        const conditionValue = document.getElementById('conditionValue');
        
        if (radio.value === 'body') {
            conditionValue.value = '15';
            conditionValue.placeholder = '15';
            this.showToast('Đã chọn điều kiện: Thân nến < 15% (|Giá đóng - Giá mở| / (Giá trần - Giá sàn))', 'info'); // Thay thế updateStatusBar
        } else {
            conditionValue.value = '20';
            conditionValue.placeholder = '20';
            this.showToast('Đã chọn điều kiện: Thay đổi giá < 20% (|Giá đóng - Giá mở| / Giá mở)', 'info'); // Thay thế updateStatusBar
        }
    }

    disableFilterControls() {
        document.querySelectorAll('.exchange-checkbox').forEach(cb => cb.disabled = true);
        document.querySelectorAll('input[name="candleCondition"]').forEach(radio => radio.disabled = true);
        document.querySelectorAll('.input-field').forEach(input => input.disabled = true);
        document.querySelectorAll('.exclusion-checkbox').forEach(cb => cb.disabled = true);
        document.querySelectorAll('.candle-interval-select').forEach(select => select.disabled = true); // Disable all per-exchange interval selects
        // Disable global input fields
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
        // Enable only the per-exchange interval selects corresponding to checked exchanges
        document.querySelectorAll('.exchange-checkbox:checked').forEach(cb => {
            const exchangeId = cb.id;
            const intervalSelect = this.exchangeCandleIntervalSelects[exchangeId];
            if (intervalSelect) {
                intervalSelect.disabled = false;
            }
        });
        // Enable global input fields
        document.getElementById('numberOfCandles').disabled = false;
        document.getElementById('volumePeriods').disabled = false;
        document.getElementById('maxResults').disabled = false;
        document.getElementById('conditionValue').disabled = false;
    }

    updateScanButton() {
        if (this.scanning) {
            this.scanButton.textContent = 'Đang quét...';
            this.scanButton.classList.add('scanning');
            this.scanButton.disabled = true;
        } else {
            this.scanButton.textContent = 'Bắt đầu quét';
            this.scanButton.classList.remove('scanning');
            this.scanButton.disabled = false;
        }
    }

    clearResults() {
        while (this.resultsBody.firstChild) {
            this.resultsBody.removeChild(this.resultsBody.firstChild);
        }
        this.resultsTable.classList.add('hidden');
        this.resultsTitle.classList.add('hidden'); // Hide results title after clearing results
        this.selectedRow = null;
    }

    clearProgress() {
        this.totalTasks = 0;
        this.completedTasks = 0;
        this.satisfiedResultsCount = 0; // Reset satisfied results count
        this.progressItems = new Map();
        this.progressContainer.style.width = '0%';
        // this.progressText.textContent = '0/0 (0%)';
        this.progressDetails.innerHTML = '';
        this.progressStatus.textContent = '';
    }

    async startScan() {
        this.scanning = true;
        this.updateScanButton();
        this.clearResults();
        this.clearProgress();
        this.disableFilterControls(); // Vô hiệu hóa điều khiển
        // this.updateDisplayState([], null); // Centralized: Ensure a clean display state at the start of scan

        try {
            // Log thời gian bắt đầu scan
            const startTime = new Date().toISOString();
            
            const filters = this.getFilters();
            if (filters.exchanges.length === 0) {
                this.showToast('Vui lòng chọn ít nhất một sàn giao dịch để bắt đầu quét.', 'error');
                this.hideLoading();
                this.updateDisplayState([], null); // Centralized: Show initial content if no exchanges selected
                return;
            }

            this.showToast('Bắt đầu quét thị trường...', 'info');
            
            this.showLoading();
            const results = await this.fetchRealDataFromExchanges(filters);
            this.hideLoading();
            if (results.length > 0) {
                this.updateDisplayState(results); // Centralized: Show results if found
                this.showToast(`Tìm thấy ${results.length} cặp thỏa mãn điều kiện!`, 'success');
            } else {
                // If no results are found, show the specific toast and update display for no results
                this.showToast('Không tìm thấy kết quả nào thỏa mãn điều kiện.', 'info');
                this.updateDisplayState([], 'Không tìm thấy kết quả nào thỏa mãn điều kiện.'); // Centralized: Show error message for no results
            }
        } catch (error) {
            this.hideLoading();
            if (error.message === 'Limit reached, stopping scan') {
                this.showToast('Đã đạt giới hạn kết quả, dừng quét.', 'success');
                if (results.length > 0) {
                    this.updateDisplayState(results, null); // Centralized: Show existing results
                } else {
                    this.updateDisplayState([], 'Đã đạt giới hạn kết quả, nhưng không tìm thấy cặp nào thỏa mãn trước đó.'); // Centralized: Show error message for no results
                }
            } else if (error.message.includes('Không thể kết nối API')) {
                this.showToast(error.message, 'error');
                this.updateDisplayState([], error.message); // Centralized: Show API connection error
            } else {
                console.error('Lỗi quét:', error);
                this.showToast('Quét thất bại: ' + error.message, 'error');
                this.updateDisplayState([], 'Quét thất bại: ' + error.message); // Centralized: Show general error message
            }
        } finally {
            this.scanning = false;
            this.enableFilterControls();
            this.updateScanButton(); // Ensure button state is updated
        }
    }

    getFilters() {
        const selectedCondition = document.querySelector('input[name="candleCondition"]:checked').value;
        
        const selectedExchangesWithIntervals = Array.from(document.querySelectorAll('.exchange-checkbox:checked')).map(cb => {
            const exchangeId = cb.id;
            const intervalSelect = this.exchangeCandleIntervalSelects[exchangeId];
            return {
                id: exchangeId,
                interval: intervalSelect ? intervalSelect.value : '1d' // Default to 1d if no select found
            };
        });

        return {
            exchanges: selectedExchangesWithIntervals,
            excludeLeveraged: document.getElementById('excludeLeveraged').checked,
            excludeFutures: document.getElementById('excludeFutures').checked,
            numberOfCandles: parseInt(document.getElementById('numberOfCandles').value) || 6, // Global number of candles
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
        // const maxResults = 1; // Giới hạn số lượng cặp thỏa mãn (đã chuyển sang lấy từ filters)
        
        console.log('🔍 Bắt đầu quét với điều kiện:', filters);
        
        // Lấy tất cả cặp USDT từ từng sàn
        for (const exchangeObj of filters.exchanges) { // Iterate over objects now
            const exchangeId = exchangeObj.id;
            const selectedInterval = exchangeObj.interval;
            try {
                this.showToast(`Đang lấy danh sách cặp từ ${exchanges.find(name => name.toLowerCase() === exchangeId)}...`, 'info');
                console.log(`\n📡 Đang lấy danh sách cặp từ sàn: ${exchangeId}`);
                
                // Lấy tất cả cặp USDT từ sàn
                const allPairs = await this.getAllUSDTPairs(exchangeId);
                console.log(`  📊 Tìm thấy ${allPairs.length} cặp USDT trên ${exchangeId}`);
                
                if (allPairs.length === 0) {
                    console.log(`  ⚠️ Không tìm thấy cặp USDT nào trên ${exchangeId}`);
                    continue;
                }
                
                // Khởi tạo tiến trình cho tất cả cặp
                this.initializeProgress([exchangeId], allPairs);
                
                // Quét từng cặp
                for (const pair of allPairs) {
                    const progressKey = `${exchangeId}-${pair}`;
                    
                    try {
                        // Cập nhật trạng thái: Đang xử lý
                        this.updateProgressItem(progressKey, 'processing');
                        console.log(`  📊 Đang xử lý cặp: ${pair}`);
                        
                        const exchangeData = await this.fetchExchangeData(exchangeId, pair, filters);
                        
                        if (exchangeData && exchangeData.candles.length > 0) {
                            hasRealData = true;
                            console.log(`  ✅ Nhận được ${exchangeData.candles.length} nến 3D từ ${exchangeId} cho ${pair}`);
                            
                            // Kiểm tra điều kiện với dữ liệu thực
                            console.log(`  🔍 Kiểm tra điều kiện nến...`);
                            const candleConditionMet = this.checkCandleCondition(exchangeData.candles, filters.selectedCondition, filters.conditionValue);
                            
                            console.log(`  🔍 Kiểm tra điều kiện volume...`);
                            const volumeConditionMet = this.checkVolumeCondition(exchangeData.volumes);
                            
                            console.log(`  📋 Kết quả kiểm tra: Nến=${candleConditionMet}, Volume=${volumeConditionMet}`);
                            
                            if (candleConditionMet && volumeConditionMet) {
                                const lastCandle = exchangeData.candles[exchangeData.candles.length - 1];
                                const change24h = ((lastCandle.close - lastCandle.open) / lastCandle.open * 100).toFixed(3);
                                
                                console.log(`  🎯 Cặp ${pair} thỏa mãn cả hai điều kiện!`);
                                
                                this.satisfiedResultsCount++; // Increment here
                                
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
                                
                                // Kiểm tra nếu đã đạt đến giới hạn kết quả (nếu giới hạn khác 0)
                                if (filters.maxResults !== 0 && results.length >= filters.maxResults) {
                                    console.log(`🎯 Đã đạt đến giới hạn ${filters.maxResults} cặp thỏa mãn điều kiện. Dừng quét.`);
                                    // Cập nhật trạng thái cho các task còn lại là "skipped"
                                    for (let i = allPairs.indexOf(pair) + 1; i < allPairs.length; i++) {
                                        this.updateProgressItem(`${exchangeId}-${allPairs[i]}`, 'skipped');
                                        this.completeTask(); // Hoàn thành task đã bỏ qua
                                    }
                                    throw new Error('Limit reached, stopping scan'); // Dừng quét toàn bộ
                                }
                                
                                // Cập nhật trạng thái: Thành công (thỏa mãn điều kiện)
                                this.updateProgressItem(progressKey, 'satisfied_success');
                            } else {
                                console.log(`  ❌ Cặp ${pair} không thỏa mãn điều kiện`);
                                // Cập nhật trạng thái: Thành công (không thỏa mãn điều kiện)
                                this.updateProgressItem(progressKey, 'unsatisfied_success');
                            }
                        } else {
                            console.log(`  ⚠️ Không nhận được dữ liệu nến từ ${exchangeId} cho ${pair}`);
                            // Cập nhật trạng thái: Lỗi
                            this.updateProgressItem(progressKey, 'error', 'Không có dữ liệu');
                        }
                        
                        // Hoàn thành task
                        this.completeTask();
                        
                        // Delay nhỏ để tránh rate limiting
                        await this.delay(100);
                        
                    } catch (pairError) {
                        if (pairError.message === 'Limit reached, stopping scan') {
                            console.log('Quá trình quét dừng lại do đã đạt giới hạn kết quả.');
                            throw pairError; // Re-throw to stop outer loops
                        }
                        console.error(`  ❌ Lỗi lấy dữ liệu cặp ${pair} từ ${exchangeId}:`, pairError);
                        // Cập nhật trạng thái: Lỗi
                        this.updateProgressItem(progressKey, 'error', 'Lỗi API');
                        this.completeTask();
                    }
                }
                
            } catch (exchangeError) {
                console.error(`❌ Lỗi lấy dữ liệu từ sàn ${exchangeId}:`, exchangeError);
            }
        }
        
        console.log(`\n📊 Tổng kết: Tìm thấy ${results.length} cặp thỏa mãn điều kiện`);
        
        // Nếu không có dữ liệu thực, sử dụng dữ liệu mẫu
        if (!hasRealData) {
            // this.showToast('Không thể kết nối API, sử dụng dữ liệu mẫu...', 'info'); // Thay thế updateStatusBar
            // console.log('🔄 Chuyển sang sử dụng dữ liệu mẫu...'); // Xóa dòng này
            // return this.generateMockResults(filters);
            throw new Error('Không thể kết nối API hoặc lấy dữ liệu thực. Vui lòng kiểm tra kết nối internet hoặc trạng thái API.');
        }
        
        return results;
    }

    async fetchExchangeData(exchangeId, pair, filters) {
        try {
            const symbol = this.convertPairToSymbol(pair, exchangeId);
            // const candleCount = parseInt(filters.candleCount) || 6; // Đã loại bỏ, thay bằng candleInterval
            const limit = filters.numberOfCandles; // Use global number of candles
            const volumePeriods = parseInt(filters.volumePeriods) || 20;
            const exchangeInterval = this.getExchangeInterval(exchangeId, filters.exchanges.find(e => e.id === exchangeId).interval); // Get specific interval for this exchange
            
            let candles = [];
            let volumes = [];
            
            switch (exchangeId) {
                case 'binance':
                    const binanceData = await this.fetchBinanceData(symbol, exchangeInterval, limit);
                    candles = binanceData.candles;
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
                    const mexcData = await this.fetchMEXCData(symbol, exchangeInterval, limit);
                    candles = mexcData.candles;
                    volumes = mexcData.volumes;
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
            
            // Tạo dữ liệu volume mẫu nếu không có dữ liệu thực
            if (volumes.length === 0) {
                volumes = this.generateVolumeDataForPair(volumePeriods);
            }
            
            return { candles, volumes };
            
        } catch (error) {
            console.error(`Lỗi lấy dữ liệu từ ${exchangeId}:`, error);
            return null;
        }
    }

    // Lấy tất cả cặp USDT từ mỗi sàn
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

    // Binance - Lấy tất cả cặp USDT
    async getBinanceUSDTPairs() {
        const fallbackPairs = [
            'BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'DOT/USDT', 'LINK/USDT', 
            'UNI/USDT', 'LTC/USDT', 'BCH/USDT', 'XRP/USDT', 'SOL/USDT',
            'MATIC/USDT', 'AVAX/USDT', 'ATOM/USDT', 'NEAR/USDT', 'FTM/USDT'
        ];
        
        const data = await this.fetchWithFallback('https://api.binance.com/api/v3/exchangeInfo'); // Xóa fallbackValue
        
        if (data && data.symbols && data.symbols.length > 0) {
            return data.symbols
                .filter(symbol => symbol.quoteAsset === 'USDT' && symbol.status === 'TRADING')
                .map(symbol => symbol.baseAsset + '/USDT');
        }
        
        console.log('Sử dụng danh sách cặp mẫu cho Binance');
        return fallbackPairs;
    }

    // OKX - Lấy tất cả cặp USDT
    async getOKXUSDTPairs() {
        const fallbackPairs = [
            'BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'DOT/USDT', 'LINK/USDT', 
            'UNI/USDT', 'LTC/USDT', 'BCH/USDT', 'XRP/USDT', 'SOL/USDT',
            'MATIC/USDT', 'AVAX/USDT', 'ATOM/USDT', 'NEAR/USDT', 'FTM/USDT'
        ];
        
        const data = await this.fetchWithFallback('https://www.okx.com/api/v5/public/instruments?instType=SPOT'); // Xóa fallbackValue
        
        if (data && data.data && data.data.length > 0) {
            return data.data
                .filter(instrument => instrument.quoteCcy === 'USDT' && instrument.state === 'live')
                .map(instrument => instrument.baseCcy + '/USDT');
        }
        
        console.log('Sử dụng danh sách cặp mẫu cho OKX');
        return fallbackPairs;
    }

    // Huobi - Lấy tất cả cặp USDT
    async getHuobiUSDTPairs() {
        const fallbackPairs = [
            'BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'DOT/USDT', 'LINK/USDT', 
            'UNI/USDT', 'LTC/USDT', 'BCH/USDT', 'XRP/USDT', 'SOL/USDT',
            'MATIC/USDT', 'AVAX/USDT', 'ATOM/USDT', 'NEAR/USDT', 'FTM/USDT'
        ];
        
        const data = await this.fetchWithFallback('https://api.huobi.pro/v1/common/symbols'); 
        console.log('[DEBUG] Huobi raw symbols data:', data);
        
        if (data && data.data && data.data.length > 0) {
            const filtered = data.data
                .filter(symbol => {
                    // Log symbol properties for debugging
                    // console.log(`[DEBUG] Huobi Symbol: ${symbol.symbol}, Quote: ${symbol.quoteCurrency}, State: ${symbol.state}`);
                    return symbol['quote-currency'] && symbol['quote-currency'].toLowerCase() === 'usdt' && 
                           symbol.state && symbol.state.toLowerCase() === 'online';
                });
            console.log('[DEBUG] Huobi filtered symbols:', filtered);
            
            const mapped = filtered.map(symbol => {
                const baseCurrency = symbol['base-currency'].toUpperCase(); // Use bracket notation for 'base-currency'
                const quoteCurrency = symbol['quote-currency'].toUpperCase();
                return `${baseCurrency}/${quoteCurrency}`;
            });
            console.log('[DEBUG] Huobi mapped pairs:', mapped);
            return mapped;
        }
        
        console.log('[DEBUG] Huobi: Không có dữ liệu cặp từ API, sử dụng dữ liệu mẫu.');
        return fallbackPairs; // Return fallback for now
    }

    // Gate - Lấy tất cả cặp USDT
    async getGateUSDTPairs() {
        const fallbackPairs = [
            'BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'DOT/USDT', 'LINK/USDT', 
            'UNI/USDT', 'LTC/USDT', 'BCH/USDT', 'XRP/USDT', 'SOL/USDT',
            'MATIC/USDT', 'AVAX/USDT', 'ATOM/USDT', 'NEAR/USDT', 'FTM/USDT'
        ];
        
        const data = await this.fetchWithFallback('https://api.gateio.ws/api/v4/spot/currency_pairs', 'gate'); // Xóa fallbackValue
        
        if (data && data.length > 0) {
            return data
                .filter(pair => pair.quote === 'USDT' && pair.trade_status === 'tradable')
                .map(pair => pair.base + '/USDT');
        }
        
        console.log('Sử dụng danh sách cặp mẫu cho Gate');
        return fallbackPairs;
    }

    // MEXC - Lấy tất cả cặp USDT
    async getMEXCUSDTPairs() {
        try {
            const data = await this.fetchWithFallback('https://api.mexc.com/api/v3/exchangeInfo', 'mexc');
            if (!data) {
                this.showToast('❌ Lỗi lấy danh sách cặp từ mexc: Không có dữ liệu', 'error');
                throw new Error('Không thể lấy dữ liệu từ MEXC');
            }
            if (data && data.data && data.data.length > 0) {
                return data.data
                    .filter(market => market.quoteCurrency === 'USDT' && market.status === 1)
                    .map(market => market.baseCurrency + '/USDT');
            }
        } catch (error) {
            console.error(`Lỗi lấy dữ liệu từ MEXC:`, error);
            this.showToast(`Lỗi kết nối API.`, 'error'); // Thay thế updateStatusBar
            throw error;
        }
    }

    // Bybit - Lấy tất cả cặp USDT
    async getBybitUSDTPairs() {
        const fallbackPairs = [
            'BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'DOT/USDT', 'LINK/USDT', 
            'UNI/USDT', 'LTC/USDT', 'BCH/USDT', 'XRP/USDT', 'SOL/USDT',
            'MATIC/USDT', 'AVAX/USDT', 'ATOM/USDT', 'NEAR/USDT', 'FTM/USDT'
        ];
        
        const data = await this.fetchWithFallback('https://api.bybit.com/v5/market/instruments-info?category=spot'); // Xóa fallbackValue
        
        if (data && data.result && data.result.list && data.result.list.length > 0) {
            return data.result.list
                .filter(instrument => instrument.quoteCoin === 'USDT' && instrument.status === 'Trading')
                .map(instrument => instrument.baseCoin + '/USDT');
        }
        
        console.log('Sử dụng danh sách cặp mẫu cho Bybit');
        return fallbackPairs;
    }

    convertPairToSymbol(pair, exchangeId) {
        // Chuyển đổi BTC/USDT thành format phù hợp với từng sàn
        const [base, quote] = pair.split('/');
        
        switch (exchangeId) {
            case 'binance':
                return `${base}${quote}`; // BTCUSDT
            case 'okx':
                return `${base}-${quote}`; // BTC-USDT
            case 'bybit':
                return `${base}${quote}`; // BTCUSDT (Bybit spot API often uses this or BTC-USDT)
            case 'huobi':
                return `${base.toLowerCase()}${quote.toLowerCase()}`; // btcusdt
            case 'gate':
                return `${base}_${quote}`; // BTC_USDT
            case 'mexc':
                return `${base}_${quote}`; // BTC_USDT
            default:
                return `${base}${quote}`;
        }
    }

    generateMockResults(filters) {
        const exchanges = ['Binance', 'OKX', 'Huobi', 'Gate', 'MEXC', 'Bybit'];
        
        // Chỉ tạo kết quả cho các sàn đã chọn
        const selectedExchanges = filters.exchanges;
        const results = [];
        const mockCandleLimit = filters.numberOfCandles; // Giới hạn nến mẫu dựa trên số lượng nến người dùng muốn
        
        // Tạo kết quả mẫu cho mỗi sàn đã chọn
        selectedExchanges.forEach(exchangeId => {
            const exchangeName = exchanges.find(name => name.toLowerCase() === exchangeId) || exchangeId;
            
            // Tạo một số cặp mẫu phổ biến
            const samplePairs = ['BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'DOT/USDT', 'LINK/USDT', 'UNI/USDT', 'LTC/USDT', 'BCH/USDT', 'XRP/USDT'];
            
            // Tạo 2-4 kết quả cho mỗi sàn
            const numResults = Math.floor(Math.random() * 3) + 2;
            
            for (let i = 0; i < numResults; i++) {
                const randomPair = samplePairs[Math.floor(Math.random() * samplePairs.length)];
                const candleData = this.generateCandleDataForPair(randomPair, filters.candleInterval, filters.numberOfCandles);
                const volumeData = this.generateVolumeDataForPair(candleData, filters.numberOfCandles);
                
                // Kiểm tra điều kiện nến
                const candleConditionMet = this.checkCandleCondition(candleData, filters.selectedCondition, filters.conditionValue);
                
                // Kiểm tra điều kiện khối lượng
                const volumeConditionMet = this.checkVolumeCondition(volumeData);
                
                // Chỉ thêm vào kết quả nếu thỏa mãn cả hai điều kiện
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
        const baseTimestamp = Date.now() - (limit * 24 * 60 * 60 * 1000); // Bắt đầu từ 100 ngày trước (tùy chỉnh)
        let currentOpen = Math.random() * 100 + 10000; // Giá mở ngẫu nhiên
        
        for (let i = 0; i < limit; i++) {
            const timestamp = baseTimestamp + (i * 24 * 60 * 60 * 1000);
            const open = currentOpen;
            const close = open + (Math.random() - 0.5) * open * 0.05;
            const high = Math.max(open, close) + Math.random() * open * 0.01;
            const low = Math.min(open, close) - Math.random() * open * 0.01;
            const volume = Math.random() * 1000000 + 100000;
            
            candles.push({ timestamp, open, high, low, close, volume });
            currentOpen = close; // Giá đóng của nến trước là giá mở của nến tiếp theo
        }
        return candles;
    }

    generateVolumeDataForPair(candleData, volumePeriods) {
        const volumes = [];
        let baseVolume = 1000000 + Math.random() * 5000000; // 1M-6M
        
        for (let i = 0; i < volumePeriods; i++) {
            // Simulate volume variation
            const variation = 0.3 + Math.random() * 1.4; // 0.3x to 1.7x
            const simulatedBaseVolume = Math.floor(baseVolume * variation);
            
            // Use a mock price from candleData to calculate quoteVolume
            const mockPrice = candleData && candleData[i] ? candleData[i].close : 1; // Fallback to 1 if no candle data
            const simulatedQuoteVolume = simulatedBaseVolume * mockPrice;

            volumes.push({ baseVolume: simulatedBaseVolume, quoteVolume: simulatedQuoteVolume });
            
            // Slight trend in volume
            baseVolume = baseVolume * (0.9 + Math.random() * 0.2);
        }
        
        return volumes;
    }

    // API Functions for each exchange - Sửa lại để chính xác hơn
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
            const response = await this.fetchWithFallback(
                `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${symbol}&interval=${interval}&limit=${limit}`,
                'gate'
            );

            if (response && response.length > 0) {
                const candles = response.map(kline => ({
                    timestamp: parseFloat(kline[0]) * 1000,
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
                console.log(`📊 Gate ${symbol}: Không có dữ liệu nến`);
            return { candles: [], volumes: [] };
            }
        } catch (error) {
            console.error(`Lỗi lấy dữ liệu từ Gate:`, error);
            return { candles: [], volumes: [] };
        }
    }

    async fetchMEXCData(symbol, interval, limit) {
        try {
            const [base, quote] = symbol.split('/');
            const response = await this.fetchWithFallback('mexc',
                `https://www.mexc.com/api/platform/spot/market/kline?symbol=${base}${quote}&interval=${interval}&limit=${limit}`,
                null
            );
            if (!response || !response.data || response.data.length === 0) {
                this.showToast('❌ Lỗi lấy dữ liệu từ MEXC: Không có dữ liệu', 'error');
                throw new Error('Không thể lấy dữ liệu từ MEXC');
            }
            if (response && response.data && response.data.length > 0) {
                const candles = response.data.map(kline => ({
                    timestamp: kline[0],
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
            }
        } catch (error) {
            console.error(`Lỗi lấy dữ liệu từ MEXC:`, error);
            this.showToast(`Lỗi kết nối API.`, 'error'); // Thay thế updateStatusBar
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
        // Kiểm tra từng nến trong 6 nến 3D gần nhất
        for (let i = 0; i < candleData.length; i++) {
            const candle = candleData[i];
            const open = candle.open;
            const close = candle.close;
            
            let conditionMet = false;
            
            if (selectedCondition === 'body') {
                // Điều kiện 1: Thân nến < 15%
                // Thân nến = |Giá đóng - Giá mở| / (Giá trần - Giá sàn) * 100
                const bodyPercent = Math.abs(close - open) / (candle.high - candle.low) * 100;
                conditionMet = bodyPercent < parseFloat(conditionValue);
                
                console.log(`Nến ${i + 1}: Open=${open.toFixed(5)}, Close=${close.toFixed(5)}, High=${candle.high.toFixed(5)}, Low=${candle.low.toFixed(5)}, Body%=${bodyPercent.toFixed(2)}%, Điều kiện < ${conditionValue}%: ${conditionMet}`);
            } else {
                // Điều kiện 2: Trị tuyệt đối của hiệu giá đóng/mở so với giá mở < 20%
                // Đây chính là thân nến, nên logic giống điều kiện 1
                const changePercent = Math.abs((close - open) / open * 100);
                conditionMet = changePercent < parseFloat(conditionValue);
                
                console.log(`Nến ${i + 1}: Open=${open.toFixed(5)}, Close=${close.toFixed(5)}, Thay đổi%=${changePercent.toFixed(2)}%, Điều kiện < ${conditionValue}%: ${conditionMet}`);
            }
            
            // Nếu bất kỳ nến nào thỏa mãn điều kiện, trả về true
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
        
        // Lấy khối lượng hiện tại (nến cuối cùng)
        const currentVolume = volumeData[volumeData.length - 1].baseVolume;
        
        // Tính trung bình khối lượng của các phiên trước đó (không tính phiên hiện tại)
        const previousVolumes = volumeData.slice(0, -1);
        const averageVolume = previousVolumes.reduce((sum, vol) => sum + vol.baseVolume, 0) / previousVolumes.length;
        
        // Kiểm tra: Khối lượng hiện tại > Trung bình các phiên trước
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
        this.loading.classList.remove('hidden');
        this.resultsTable.classList.add('hidden');
        this.initialContent.classList.add('hidden'); // Explicitly hide initial content when loading
        this.progressContainer.classList.remove('hidden'); // Hiển thị progressContainer
    }

    hideLoading() {
        this.loading.classList.add('hidden');
        this.progressContainer.classList.add('hidden'); // Ẩn progressContainer
    }

    showResults(results) {
        this.resultsTable.classList.remove('hidden');
        this.populateResultsTable(results);
    }

    populateResultsTable(results) {
        this.resultsBody.innerHTML = '';
        this.resultsTable.classList.remove('hidden');
        this.resultsTitle.classList.remove('hidden'); // Show results title when results are displayed
        // The display state (including initial content) is now managed by updateDisplayState
        
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
            
            // Add click event to show chart
            row.addEventListener('click', (event) => {
                // Ensure the click on the link doesn't trigger the row's chart display
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
        // Remove previous selection
        // if (this.selectedRow) {
        //     this.selectedRow.classList.remove('selected');
        // }
        
        // Select current row
        // const currentRow = this.resultsBody.querySelector(`tr[data-index="${index}"]`);
        // if (currentRow) {
        //     currentRow.classList.add('selected');
        //     this.selectedRow = currentRow;
        // }

        // Store current result data for candle clicks
        this.currentResult = result;

        // Update chart title and info
        document.getElementById('chartTitle').textContent = `${result.pair} · 3D · ${result.exchange}`;
        
        // Sử dụng dữ liệu thực tế từ kết quả quét
        const candleData = result.candleData;
        const volumeData = result.volumeData;
        
        // Lấy nến cuối cùng (hiện tại) để hiển thị thông tin OHLC
        const currentCandle = candleData[candleData.length - 1];
        
        // Lấy nến thứ hai cuối cùng để tính toán giá hiện tại (nếu có)
        const previousCandle = candleData.length > 1 ? candleData[candleData.length - 2] : null;
        const currentPrice = currentCandle ? currentCandle.close : 0;
        const openPrice = currentCandle ? currentCandle.open : 0;
        const highPrice = currentCandle ? currentCandle.high : 0;
        const lowPrice = currentCandle ? currentCandle.low : 0;
        
        // Update chart info với dữ liệu thực tế
        this.updateChartInfo(currentCandle, candleData.length - 1, result, previousCandle, candleData, volumeData);
        
        // Draw charts với dữ liệu thực tế và highlight nến cuối cùng (hiện tại)
        this.drawCandlestickChart(candleData, candleData.length - 1);
        // this.drawVolumeChart(volumeData, candleData);
        
        // Hiển thị thông tin chi tiết về các nến 3D
        // this.displayCandleDetails(candleData, candleData.length - 1); // Removed, functionality integrated into updateChartInfo
        
        // Show modal
        this.chartModal.classList.add('show');
    }

    drawGridLines(svg, chartWidth, chartStartY, chartAreaHeight, margin, minPrice, maxPrice) {
        const priceToY = (price) => {
            return chartStartY + chartAreaHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartAreaHeight;
        };
        
        // Horizontal grid lines (price levels)
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
        
        // Vertical grid lines (time levels) - REMOVED for combined chart
        // const timeLevels = 4;
        // for (let i = 0; i <= timeLevels; i++) {
        //     const x = margin + (chartWidth - 2 * margin) * (i / timeLevels);
            
        //     const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        //     line.setAttribute('x1', x);
        //     line.setAttribute('y1', margin);
        //     line.setAttribute('x2', x);
        //     line.setAttribute('y2', chartHeight - margin);
        //     line.setAttribute('stroke', '#e0e0e0');
        //     line.setAttribute('stroke-width', '1');
        //     line.setAttribute('stroke-dasharray', '5,5');
        //     svg.appendChild(line);
        // }
    }

    drawTimeLabels(svg, chartWidth, totalChartHeight, margin, candleData, startX, candleWidth, spacing, yOffset) {
        // Display dates instead of Nến 1, Nến 3, ...
        candleData.forEach((candle, index) => {
            const x = startX + index * (candleWidth + spacing) + candleWidth / 2;
            
            const date = new Date(candle.timestamp);
            const formattedDate = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

            const timeLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            timeLabel.setAttribute('x', x);
            timeLabel.setAttribute('y', yOffset);
            timeLabel.setAttribute('fill', '#ccc');
            timeLabel.setAttribute('font-size', '10px');
            timeLabel.setAttribute('text-anchor', 'middle');
            timeLabel.textContent = formattedDate;
            timeLabel.classList.add('time-label'); // Add class for styling and selection
            timeLabel.setAttribute('data-index', index); // Add data-index for linking to candles
            svg.appendChild(timeLabel);
        });
    }

    drawCandlestickChart(candleData, highlightIndex = -1) {
        const chart = document.getElementById('candlestickChart');
        chart.innerHTML = '';
        
        const reversedCandleData = [...candleData].reverse(); // Reverse the candle data

        // Create SVG for multiple candlesticks
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '500'); // Adjusted overall height
        svg.setAttribute('viewBox', '0 0 800 500'); // Adjusted viewBox
        
        // Calculate chart dimensions
        const chartWidth = 800;
        const totalChartHeight = 500; // Total height of the SVG
        const margin = 20; // Reduced horizontal margin for the entire chart
        
        const candlestickAreaHeight = 300; // Height dedicated to candlesticks
        const dateLabelAreaHeight = 50; // Increased height for date labels to create more separation
        const volumeAreaHeight = 100; // Height dedicated to volume bars
        
        // Vertical starting points for each section
        const candlestickStartY = margin; // Candlesticks start after top margin
        const dateLabelStartY = candlestickStartY + candlestickAreaHeight; // Date labels start after candlesticks
        const volumeStartY = dateLabelStartY + dateLabelAreaHeight; // Volume starts after date labels

        const candleWidth = 40; // Increased candle width
        const spacing = 15; // Adjusted spacing
        const limit = reversedCandleData.length; 
        const availableWidth = chartWidth - 2 * margin;
        const totalCandleWidth = limit * candleWidth + (limit - 1) * spacing;
        const startX = margin + (availableWidth - totalCandleWidth) / 2;
        
        // Find price range for scaling (for candlestick chart)
        let minPrice = Math.min(...reversedCandleData.map(c => c.low));
        let maxPrice = Math.max(...reversedCandleData.map(c => c.high));
        const priceRange = maxPrice - minPrice;
        const padding = priceRange * 0.1; // Add some padding for better visualization
        minPrice -= padding;
        maxPrice += padding;
        
        // Price scale function (for candlestick chart, in its designated area)
        const priceToY = (price) => {
            // Scale prices within the candlestickAreaHeight
            return candlestickStartY + candlestickAreaHeight - ((price - minPrice) / (maxPrice - minPrice)) * candlestickAreaHeight;
        };
        
        // Draw grid lines (for candlestick chart only)
        // this.drawGridLines(svg, chartWidth, candlestickStartY, candlestickAreaHeight, margin, minPrice, maxPrice);
        
        // Draw price labels (for candlestick chart only)
        // this.drawPriceLabels(svg, chartWidth, candlestickStartY, candlestickAreaHeight, margin, minPrice, maxPrice);
        
        // Draw time labels (now positioned as a separator)
        this.drawTimeLabels(svg, chartWidth, totalChartHeight, margin, reversedCandleData, startX, candleWidth, spacing, dateLabelStartY + dateLabelAreaHeight / 2);
        
        // Draw candlesticks
        reversedCandleData.forEach((candle, index) => {
            const x = startX + index * (candleWidth + spacing);
            const isGreen = candle.close > candle.open;
            const color = isGreen ? '#4CAF50' : '#f44336';
            
            // Draw candlestick body
            const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            body.setAttribute('x', x);
            body.setAttribute('y', priceToY(Math.max(candle.open, candle.close)));
            body.setAttribute('width', candleWidth);
            body.setAttribute('height', Math.abs(priceToY(candle.open) - priceToY(candle.close)) || 1); // Min height of 1px
            body.setAttribute('fill', color);
            body.setAttribute('stroke', color);
            body.setAttribute('stroke-width', '1');
            svg.appendChild(body);

            // Draw candlestick wick
            const wick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            wick.setAttribute('x1', x + candleWidth / 2);
            wick.setAttribute('y1', priceToY(candle.high));
            wick.setAttribute('x2', x + candleWidth / 2);
            wick.setAttribute('y2', priceToY(candle.low));
            wick.setAttribute('stroke', color);
            wick.setAttribute('stroke-width', '1');
            svg.appendChild(wick);

            // Add hover event listener to the candlestick body for updating chart-info
            body.addEventListener('mouseenter', () => {
                const hoveredCandle = reversedCandleData[index];
                const previousHoveredCandle = index > 0 ? reversedCandleData[index - 1] : null;
                this.updateChartInfo(hoveredCandle, index, this.currentResult, previousHoveredCandle, reversedCandleData, this.currentResult.volumeData);
                this.highlightTimeLabel(index, true);
            });

            // Add mouseleave event listener to the candlestick body for resetting chart-info
            body.addEventListener('mouseleave', () => {
                const lastCandle = reversedCandleData[reversedCandleData.length - 1];
                const previousCandle = reversedCandleData.length > 1 ? reversedCandleData[reversedCandleData.length - 2] : null;
                this.updateChartInfo(lastCandle, reversedCandleData.length - 1, this.currentResult, previousCandle, reversedCandleData, this.currentResult.volumeData);
                this.highlightTimeLabel(-1, false); // Remove highlight from all labels
            });

            // Add data-index for linking to candles (used by time labels)
            body.setAttribute('data-index', index);
        });

        // Volume Chart Integration - Start
        const reversedVolumeData = [...this.currentResult.volumeData].reverse(); // Use currentResult's volumeData
        const maxVolume = Math.max(...reversedVolumeData.map(v => v.baseVolume));

        const volumeToY = (volume) => {
            // Scale volume within the volumeAreaHeight, drawing upwards from volumeStartY + volumeAreaHeight
            return volumeStartY + volumeAreaHeight - ((volume / maxVolume) * volumeAreaHeight);
        };

        reversedVolumeData.forEach((volumeObj, index) => {
            const volume = volumeObj.baseVolume;
            const x = startX + index * (candleWidth + spacing);
            const height = (volume / maxVolume) * volumeAreaHeight;
            const y = volumeStartY + volumeAreaHeight - height; // Position relative to the bottom of the volume area, drawing upwards

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
                text.setAttribute('y', y - 5); // Position label above the bar
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('font-size', '10');
                text.setAttribute('fill', '#666');
                text.textContent = (volume / 1000).toFixed(0) + 'K';
                svg.appendChild(text);
            }

            // Add hover event listener to the volume bar for updating chart-info
            bar.addEventListener('mouseenter', () => {
                const hoveredCandle = reversedCandleData[index];
                const previousHoveredCandle = index > 0 ? reversedCandleData[index - 1] : null;
                this.updateChartInfo(hoveredCandle, index, this.currentResult, previousHoveredCandle, reversedCandleData, this.currentResult.volumeData);
                this.highlightTimeLabel(index, true);
            });

            // Add mouseleave event listener to the volume bar for resetting chart-info
            bar.addEventListener('mouseleave', () => {
                const lastCandle = reversedCandleData[reversedCandleData.length - 1];
                const previousCandle = reversedCandleData.length > 1 ? reversedCandleData[reversedCandleData.length - 2] : null;
                this.updateChartInfo(lastCandle, reversedCandleData.length - 1, this.currentResult, previousCandle, reversedCandleData, this.currentResult.volumeData);
                this.highlightTimeLabel(-1, false); // Remove highlight from all labels
            });

            // Add data-index for linking to bars (used by time labels)
            bar.setAttribute('data-index', index);
        });
        // Volume Chart Integration - End

        // Add mouseenter/mouseleave to time labels for highlighting
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
                this.highlightTimeLabel(-1, false); // Remove highlight from all labels
            });
        });

        chart.appendChild(svg);
    }

    // drawVolumeChart(volumeData, candleData) {
    //     // This function will be removed after integration
    // }

    closeChartModal() {
        this.chartModal.classList.remove('show');
        
        // Remove row selection
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

        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Hide and remove toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    // Progress Management Methods
    initializeProgress(exchanges, pairs) {
        this.progressDetails.innerHTML = ''; // Xóa nội dung cũ
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
                statusMessageSpan.classList.add('status-message', 'status-processing'); // Mặc định là processing
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
        
        if (percentage === 100) {
            statusMessage = `Quét hoàn thành: ${this.completedTasks}/${this.totalTasks} cặp (${percentage}%)`;
        } else if (this.totalTasks > 0 && this.completedTasks < this.totalTasks) {
            statusMessage = `Đang quét: ${this.completedTasks}/${this.totalTasks} cặp (${percentage}%)`;
        } else {
            statusMessage = `Tiến trình: ${this.completedTasks}/${this.totalTasks} cặp (${percentage}%)`; // Initial state or no tasks
        }

        // Add satisfied results count to the status message if available
        if (this.satisfiedResultsCount !== undefined) {
            statusMessage += `, Thỏa mãn: ${this.satisfiedResultsCount}`;
        }
        
        this.progressStatus.textContent = statusMessage;
    }
    
    completeTask() {
        this.completedTasks++;
        this.updateProgress();
    }

    displayCandleDetails(candleData, highlightIndex) {
        const candleDetails = document.getElementById('candleDetails');
        
        let html = '<h4>Chi tiết các nến 3D</h4>';
        html += '<table class="candle-table">';
        html += '<thead><tr>';
        html += '<th>Nến</th>';
        html += '<th>Thời gian</th>';
        html += '<th>Giá mở</th>';
        html += '<th>Giá cao</th>';
        html += '<th>Giá thấp</th>';
        html += '<th>Giá đóng</th>';
        html += '<th>Thân nến (%)</th>';
        html += '<th>Thay đổi (%)</th>';
        html += '<th>Khối lượng</th>';
        html += '</tr></thead><tbody>';
        
        const timeLabels = ['3D trước', '2D trước', '1D trước', 'Hiện tại'];
        
        candleData.forEach((candle, index) => {
            const isHighlighted = index === highlightIndex;
            const rowClass = isHighlighted ? 'highlighted' : '';
            const timeLabel = timeLabels[index] || `Nến ${index + 1}`;
            
            // Cập nhật công thức thân nến theo điều kiện mới
            const selectedCondition = document.querySelector('input[name="candleCondition"]:checked').value;
            let bodyPercent;
            if (selectedCondition === 'body') {
                // Thân nến = |Giá đóng - Giá mở| / (Giá trần - Giá sàn) * 100
                bodyPercent = Math.abs(candle.close - candle.open) / (candle.high - candle.low) * 100;
            } else {
                // Thân nến = |Giá đóng - Giá mở| / Giá mở * 100
                bodyPercent = Math.abs(candle.close - candle.open) / candle.open * 100;
            }
            
            const changePercent = ((candle.close - candle.open) / candle.open * 100);
            const changeColor = changePercent > 0 ? '#4CAF50' : '#f44336';
            const changeSign = changePercent > 0 ? '+' : '';
            
            html += `<tr class="${rowClass}" data-index="${index}" style="cursor: pointer;">`;
            html += `<td>${index + 1}</td>`;
            html += `<td>${timeLabel}</td>`;
            html += `<td>${candle.open.toFixed(5)}</td>`;
            html += `<td>${candle.high.toFixed(5)}</td>`;
            html += `<td>${candle.low.toFixed(5)}</td>`;
            html += `<td>${candle.close.toFixed(5)}</td>`;
            html += `<td>${bodyPercent.toFixed(2)}%</td>`;
            html += `<td style="color: ${changeColor}">${changeSign}${changePercent.toFixed(2)}%</td>`;
            html += `<td>${candle.volume ? candle.volume.toLocaleString() : 'N/A'}</td>`;
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        candleDetails.innerHTML = html;
        
        // Add click events to table rows
        const rows = candleDetails.querySelectorAll('tbody tr');
        rows.forEach((row, index) => {
            row.addEventListener('click', () => {
                this.onCandleClick(index, candleData);
            });
            
            row.addEventListener('mouseenter', () => {
                if (index !== highlightIndex) {
                    row.style.backgroundColor = '#4a4a4a';
                }
            });
            
            row.addEventListener('mouseleave', () => {
                if (index !== highlightIndex) {
                    row.style.backgroundColor = '';
                }
            });
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Thêm delay giữa các API calls để tránh rate limiting
    async fetchWithRateLimit(url, fallbackData = null, delayMs = 100) {
        // Thêm delay trước khi gọi API
        await this.delay(delayMs);
        return await this.fetchWithFallback(url, fallbackData);
    }

    // Phương thức để log chi tiết về việc fetch data
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

    // Phương thức để kiểm tra tính nhất quán của dữ liệu
    checkDataConsistency(exchange, symbol, candles) {
        if (!candles || candles.length === 0) {
            console.warn(`⚠️ ${exchange} ${symbol}: Không có dữ liệu candles`);
            return false;
        }

        // Kiểm tra tính hợp lệ của dữ liệu
        for (let i = 0; i < candles.length; i++) {
            const candle = candles[i];
            if (!candle.open || !candle.high || !candle.low || !candle.close || !candle.volume) {
                console.error(`❌ ${exchange} ${symbol}: Candle ${i} có dữ liệu không hợp lệ:`, candle);
                return false;
            }
            
            // Kiểm tra logic giá
            if (candle.high < candle.low || candle.high < candle.open || candle.high < candle.close ||
                candle.low > candle.open || candle.low > candle.close) {
                console.error(`❌ ${exchange} ${symbol}: Candle ${i} có giá không hợp lệ:`, candle);
                return false;
            }
        }

        console.log(`✅ ${exchange} ${symbol}: Dữ liệu hợp lệ (${candles.length} candles)`);
        return true;
    }

    // Helper method để gọi API với fallback
    async fetchWithFallback(url, exchangeId = null) { // Xóa fallbackData
        let finalUrl = url;
        // Apply CORS proxy for specific exchanges if needed

        try {
            // Thử gọi API trực tiếp trước
            const response = await fetch(finalUrl);
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ API call thành công: ${finalUrl}`);
                if (exchangeId === 'gate' || exchangeId === 'mexc') {
                    console.log(`[DEBUG] Raw data from ${exchangeId} (via proxy):`, data);
                }
                return data;
            } else {
                console.warn(`⚠️ API call thất bại với status ${response.status}: ${finalUrl}`);
                this.showToast(`API call thất bại (${response.status}).`, 'error'); // Thay thế updateStatusBar
            }
        } catch (error) {
            console.error(`❌ Lỗi fetch từ ${finalUrl}:`, error);
            this.showToast(`Lỗi kết nối API.`, 'error'); // Thay thế updateStatusBar
        }
        
        // Nếu không thành công, trả về null
        console.log(`🔄 Không thể lấy dữ liệu từ: ${finalUrl}`);
        return null;
    }

    onCandleClick(candleIndex, candleData) {
    }

    updateChartInfo(currentCandle, hoverIndex, result, previousCandle, candleData, volumeData) {
        const [baseAsset, quoteAsset] = result.pair.split('/');
        
        // Prices
        const currentPrice = currentCandle.close;
        const open = currentCandle.open;
        const high = currentCandle.high;
        const low = currentCandle.low;
        const close = currentCandle.close;

        // Date for the hovered candle
        const candleDate = new Date(currentCandle.timestamp);
        const formattedDate = candleDate.toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

        // Change & Amplitude
        const changeValue = (close - open).toFixed(2);
        const changePercent = ((close - open) / open * 100).toFixed(2);
        const changeColor = changePercent > 0 ? '#4CAF50' : '#f44336';
        const changeSign = changePercent > 0 ? '+' : '';
        
        const amplitudePercent = ((high - low) / low * 100).toFixed(2);

        // SMA calculations - use data up to hoverIndex
        const candlesForSMA = candleData.slice(0, hoverIndex + 1);
        const sma7 = this.calculateSMA(candlesForSMA, 7);
        const sma25 = this.calculateSMA(candlesForSMA, 25);
        const sma99 = this.calculateSMA(candlesForSMA, 99);

        // Volume - use volume at hoverIndex
        const currentVolume = volumeData[hoverIndex];
        
        document.getElementById('chartTitle').textContent = `${result.pair} · ${formattedDate} · ${result.exchange}`;

        this.chartCurrentPrice.textContent = currentPrice.toFixed(2);
        this.chartCurrentPrice.style.color = currentPrice >= open ? '#4CAF50' : '#f44336'; // Color based on current price vs open

        this.chartOpen.textContent = open.toFixed(2);
        this.chartHigh.textContent = high.toFixed(2);
        this.chartHigh.style.color = '#4CAF50'; // Green for high

        this.chartLow.textContent = low.toFixed(2);
        this.chartLow.style.color = '#f44336'; // Red for low
        
        this.chartClose.textContent = close.toFixed(2);

        this.chartChange.textContent = `${changeSign}${changeValue} (${changeSign}${changePercent}%)`;
        this.chartChange.style.color = changeColor;

        this.chartRange.textContent = `${amplitudePercent}%`;
        this.chartRange.style.color = '#ffd700'; // Yellow for amplitude

        this.chartSma7.textContent = `${sma7}`;
        this.chartSma7.style.color = '#ffd700'; // Yellow for SMA

        this.chartSma25.textContent = `${sma25}`;
        this.chartSma25.style.color = '#FF69B4'; // Pink for SMA 25

        this.chartSma99.textContent = `${sma99}`;
        this.chartSma99.style.color = '#9370DB'; // Purple for SMA 99

        this.chartBaseAsset.textContent = baseAsset;
        this.chartVolumeBase.textContent = currentVolume.baseVolume.toLocaleString('en-US', { maximumFractionDigits: 0 });
        
        this.chartVolumeQuote.textContent = currentVolume.quoteVolume.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }

    getExchangeInterval(exchangeId, interval) {
        // The interval passed here is already the standardized one from the dropdown
        // Now, convert it to the exchange-specific API format.
        switch (exchangeId) {
            case 'binance':
                // Binance uses the same standardized keys as its API intervals
                return interval; 
            case 'okx':
                switch (interval) {
                    case '1h': return '1H';
                    case '4h': return '4H';
                    case '1d': return '1D';
                    case '1w': return '1W';
                    case '1M': return '1M';
                    default: return '1D'; // Fallback
                }
            case 'huobi':
                switch (interval) {
                    case '1h': return '60min';
                    case '4h': return '4hour';
                    case '1d': return '1day';
                    case '3d': return '3day';
                    case '1w': return '1week';
                    case '1M': return '1mon';
                    default: return '1day'; // Fallback
                }
            case 'gate':
                switch (interval) {
                    case '1h': return '60m';
                    case '4h': return '4h';
                    case '1d': return '1d';
                    case '3d': return '3d';
                    case '1w': return '7d';
                    case '1M': return '30d';
                    default: return '1d'; // Fallback
                }
            case 'mexc':
                switch (interval) {
                    case '1h': return 'Min60';
                    case '4h': return 'Min240';
                    case '1d': return 'Day1';
                    case '3d': return 'Day3';
                    case '1w': return 'Week1';
                    case '1M': return 'Mon1';
                    default: return 'Day1'; // Fallback
                }
            case 'bybit':
                switch (interval) {
                    case '1h': return '60';
                    case '4h': return '240';
                    case '1d': return 'D';
                    case '1w': return 'W';
                    case '1M': return 'M';
                    default: return 'D'; // Fallback
                }
            default: return '1d'; // Fallback for unsupported exchanges
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
                return `#`; // Fallback for unsupported exchanges
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
        intervalSelect.innerHTML = ''; // Clear existing options

        const intervalLabels = {
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
                option.textContent = intervalLabels[interval] || interval; // Fallback to raw interval if no label
                intervalSelect.appendChild(option);
            });
        }

        // Set a default if no option is selected (e.g., first option)
        if (intervalSelect.options.length > 0 && intervalSelect.value === '') {
            intervalSelect.value = intervalSelect.options[0].value;
        }
    }

    highlightTimeLabel(index, highlight) {
        const timeLabels = document.querySelectorAll('.time-label');
        timeLabels.forEach((label, labelIndex) => {
            if (index === -1) { // Remove all highlights
                label.classList.remove('highlighted');
            } else if (labelIndex === index && highlight) {
                label.classList.add('highlighted');
            } else {
                label.classList.remove('highlighted');
            }
        });
    }

    // New central method to manage display state
    updateDisplayState(results, errorMessage = null) {
        // Hide all potential display elements first for a clean slate
        this.initialContent.classList.add('hidden');
        this.resultsTable.classList.add('hidden');
        this.resultsTitle.classList.add('hidden');
        this.errorMessageContainer.classList.add('hidden');
        
        // Default alignment for resultsArea
        this.resultsArea.style.justifyContent = 'flex-start';

        // Then, based on the error or results, show the appropriate elements
        if (errorMessage) {
            this.resultsTitle.classList.remove('hidden'); // Always show title on error
            this.errorMessageContainer.classList.remove('hidden');
            this.errorMessageDetail.textContent = errorMessage;
        } else if (results && results.length > 0) {
            this.populateResultsTable(results); // Ensure table is populated before showing
            this.resultsTable.classList.remove('hidden');
            this.resultsTitle.classList.remove('hidden');
            this.errorMessageContainer.classList.add('hidden'); // Ensure error message is hidden when showing results
        } else {
            // No error and no results, show initial content
            this.initialContent.classList.remove('hidden');
            this.resultsArea.style.justifyContent = 'center'; // Center initial content
        }
    }
}

// Khởi tạo ứng dụng khi trang tải xong
document.addEventListener('DOMContentLoaded', () => {
    const app = new USDTTradingPortable();
    app.setupEventListeners();

    // Initial check for already checked exchanges on page load
    document.querySelectorAll('.exchange-checkbox').forEach(checkbox => {
        if (checkbox.checked) {
            // Simulate a change event to correctly enable the interval select
            const event = { target: checkbox };
            app.handleExchangeChange(event);
        }
    });
});