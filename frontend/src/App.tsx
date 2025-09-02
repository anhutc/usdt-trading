import { useState } from 'react';
import axios from 'axios';
import './App.css'; // Assuming you have an App.css for basic styling

interface PairData {
  'Sàn giao dịch': string;
  'Cặp usdt': string;
  'Giá hiện tại': number;
  'Giá cao nhất': number;
  'Giá thấp nhất': number;
  'Link Sàn': string;
}

function App() {
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const [maxResults, setMaxResults] = useState<number>(0);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [filteredPairs, setFilteredPairs] = useState<PairData[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  // Doji & Volume filter parameters
  const [numDojiCandles, setNumDojiCandles] = useState<number>(6);
  const [dojiTimeframe, setDojiTimeframe] = useState<string>('3d');
  const [dojiBodyPercentage, setDojiBodyPercentage] = useState<number>(15.0);
  const [avgVolumeCandles, setAvgVolumeCandles] = useState<number>(20);
  const [dojiCalculationMethod, setDojiCalculationMethod] = useState<string>('Theo biên độ nến');

  const exchanges = ['binance', 'okx', 'huobi', 'gate', 'mexc', 'bybit'];
  const dojiTimeframeOptions = {
    '1 phút': '1m', '5 phút': '5m', '15 phút': '15m', '30 phút': '30m',
    '1 giờ': '1h', '4 giờ': '4h', '1 ngày': '1d', '3 ngày': '3d', '1 tuần': '1w'
  };
  const dojiCalculationMethods = ['Theo biên độ nến', 'Theo giá mở'];

  const fetchPairsAndFilter = async () => {
    setIsFiltering(true);
    setFilteredPairs([]);
    setStatusMessage('Đang tìm kiếm... Vui lòng chờ.');
    setProgress(0);

    let allFilteredPairs: PairData[] = [];

    try {
      for (let i = 0; i < selectedExchanges.length; i++) {
        const exchangeName = selectedExchanges[i];
        setStatusMessage(`Đang tải dữ liệu sàn: ${exchangeName.charAt(0).toUpperCase() + exchangeName.slice(1)}...`);
        setProgress((i / selectedExchanges.length) * 0.5); // 50% for fetching initial pairs

        // Call the /api endpoint to get all USDT pairs for the exchange
        const pairsResponse = await axios.get(`/api?exchange=${exchangeName}`);
        const allPairs = pairsResponse.data.pairs;

        let processedPairsCount = 0;
        for (const pair of allPairs) {
          if (maxResults > 0 && allFilteredPairs.length >= maxResults) {
            break; // Stop if max results reached
          }

          // Call the /api/filter_pairs endpoint for each pair
          const filterResponse = await axios.get('/api/filter_pairs', {
            params: {
              exchange: exchangeName,
              pair: pair,
              num_doji_candles: numDojiCandles,
              doji_candle_timeframe: dojiTimeframe,
              doji_body_percentage: dojiBodyPercentage,
              avg_volume_candles: avgVolumeCandles,
              doji_calculation_method: dojiCalculationMethod
            }
          });

          if (filterResponse.data.is_doji_volume_match) {
            // Fetch ticker data for the matched pair
            const tickerResponse = await axios.get('/api/get_ticker', {
              params: {
                exchange: exchangeName,
                pair: pair
              }
            });
            const tickerData = tickerResponse.data;

            allFilteredPairs.push({
              'Sàn giao dịch': exchangeName.charAt(0).toUpperCase() + exchangeName.slice(1),
              'Cặp usdt': pair,
              'Giá hiện tại': tickerData.current_price,
              'Giá cao nhất': tickerData.high_price,
              'Giá thấp nhất': tickerData.low_price,
              'Link Sàn': getExchangeTradeUrl(exchangeName, pair) // We'll implement this function later
            });
            setFilteredPairs([...allFilteredPairs]); // Update UI with new results
          }
          processedPairsCount++;
          setProgress(0.5 + (processedPairsCount / allPairs.length) * 0.5); // Remaining 50% for filtering
        }
        if (maxResults > 0 && allFilteredPairs.length >= maxResults) {
          break; // Stop if max results reached across exchanges
        }
      }
      setStatusMessage('Hoàn thành!');
    } catch (error) {
      console.error('Error during filtering:', error);
      setStatusMessage('Đã xảy ra lỗi trong quá trình tìm kiếm.');
    } finally {
      setIsFiltering(false);
      setProgress(1);
    }
  };

  const getExchangeTradeUrl = (exchangeName: string, pair: string) => {
    const [base, quote] = pair.split('/');
    const symbolForUrl = `${base}_${quote}`;

    switch (exchangeName.toLowerCase()) {
      case 'binance':
        return `https://www.binance.com/en/trade/${symbolForUrl}`;
      case 'okx':
        return `https://www.okx.com/trade-spot/${base}-${quote}`;
      case 'huobi':
        return `https://www.huobi.com/en-us/exchange/${base.toLowerCase()}${quote.toLowerCase()}`;
      case 'gate':
        return `https://www.gate.io/trade/${symbolForUrl}`;
      case 'mexc':
        return `https://www.mexc.com/exchange/${symbolForUrl}`;
      case 'bybit':
        return `https://www.bybit.com/trade/spot/${base}/${quote}`;
      default:
        return '#';
    }
  };

  return (
    <div className="container">
      <h1>Giao Dịch USDT</h1>

      <div className="sidebar">
        <h3>Giới hạn kết quả</h3>
        <input
          type="number"
          value={maxResults}
          onChange={(e) => setMaxResults(Number(e.target.value))}
          disabled={isFiltering}
        />

        <h3>Sàn giao dịch</h3>
        {exchanges.map((exchange) => (
          <label key={exchange}>
            <input
              type="checkbox"
              checked={selectedExchanges.includes(exchange)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedExchanges([...selectedExchanges, exchange]);
                } else {
                  setSelectedExchanges(selectedExchanges.filter((eName) => eName !== exchange));
                }
              }}
              disabled={isFiltering}
            />
            {exchange.charAt(0).toUpperCase() + exchange.slice(1)}
          </label>
        ))}

        <h3>Tùy chỉnh Doji & Volume</h3>
        <div>
          <label>Số nến gần nhất để kiểm tra Doji:</label>
          <input
            type="number"
            value={numDojiCandles}
            onChange={(e) => setNumDojiCandles(Number(e.target.value))}
            disabled={isFiltering}
          />
        </div>
        <div>
          <label>Khung thời gian nến Doji:</label>
          <select
            value={dojiTimeframe}
            onChange={(e) => setDojiTimeframe(e.target.value)}
            disabled={isFiltering}
          >
            {Object.entries(dojiTimeframeOptions).map(([label, value]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Cách tính tỷ lệ thân nến Doji:</label>
          <select
            value={dojiCalculationMethod}
            onChange={(e) => setDojiCalculationMethod(e.target.value)}
            disabled={isFiltering}
          >
            {dojiCalculationMethods.map((method) => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Tỷ lệ thân nến Doji tối đa (%):</label>
          <input
            type="range"
            min="1.0"
            max="50.0"
            step="0.01"
            value={dojiBodyPercentage}
            onChange={(e) => setDojiBodyPercentage(Number(e.target.value))}
            disabled={isFiltering}
          />
          <span>{dojiBodyPercentage.toFixed(2)}%</span>
        </div>
        <div>
          <label>Số nến tính Volume trung bình:</label>
          <input
            type="number"
            value={avgVolumeCandles}
            onChange={(e) => setAvgVolumeCandles(Number(e.target.value))}
            disabled={isFiltering}
          />
        </div>

        <button onClick={fetchPairsAndFilter} disabled={isFiltering || selectedExchanges.length === 0}>
          Tìm kiếm cặp usdt phù hợp
        </button>
      </div>

      <div className="main-content">
        {isFiltering && (
          <div className="status-area">
            <p>{statusMessage}</p>
            <progress value={progress} max="1"></progress>
          </div>
        )}

        {!isFiltering && filteredPairs.length > 0 && (
          <>
            <h2>Đã tìm thấy {filteredPairs.length} cặp USDT</h2>
            <table>
              <thead>
                <tr>
                  <th>Sàn giao dịch</th>
                  <th>Cặp usdt</th>
                  <th>Giá hiện tại</th>
                  <th>Giá cao nhất</th>
                  <th>Giá thấp nhất</th>
                  <th>Link Sàn</th>
                </tr>
              </thead>
              <tbody>
                {filteredPairs.map((pair, index) => (
                  <tr key={index}>
                    <td>{pair['Sàn giao dịch']}</td>
                    <td>{pair['Cặp usdt']}</td>
                    <td>{pair['Giá hiện tại']?.toFixed(4)}</td>
                    <td>{pair['Giá cao nhất']?.toFixed(4)}</td>
                    <td>{pair['Giá thấp nhất']?.toFixed(4)}</td>
                    <td><a href={pair['Link Sàn']} target="_blank" rel="noopener noreferrer">Xem trực tiếp</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {!isFiltering && filteredPairs.length === 0 && statusMessage && (
            <p>{statusMessage}</p>
        )}
      </div>
    </div>
  );
}

export default App;
