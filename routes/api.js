'use strict';

const https = require('https');

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(function (req, res) {
      const { stock, like } = req.query;

      // Check if stock parameter is provided
      if (!stock) {
        return res.status(400).json({ error: 'Missing stock parameter' });
      }

      // Helper function to fetch stock price from proxy
      const getStockPrice = (symbol, callback) => {
        const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`;
        https.get(url, (response) => {
          let data = '';

          response.on('data', (chunk) => {
            data += chunk;
          });

          response.on('end', () => {
            try {
              const jsonData = JSON.parse(data);
              console.log(`API response for ${symbol}:`, jsonData); // Debug logging
              callback(null, jsonData);
            } catch (error) {
              callback(error, null);
            }
          });
        }).on('error', (error) => {
          callback(error, null);
        });
      };

      // Process request for one or two stocks
      if (Array.isArray(stock)) {
        const [stock1, stock2] = stock;

        getStockPrice(stock1, (error1, data1) => {
          if (error1) {
            console.error(`Error fetching ${stock1}:`, error1);
            return res.status(500).json({ error: 'Unable to fetch stock data' });
          }

          getStockPrice(stock2, (error2, data2) => {
            if (error2) {
              console.error(`Error fetching ${stock2}:`, error2);
              return res.status(500).json({ error: 'Unable to fetch stock data' });
            }

            // Determine if the like parameter is set
            const isLike = like === 'true';
            const likes1 = isLike ? (data1.likes || 0) + 1 : data1.likes || 0;
            const likes2 = isLike ? (data2.likes || 0) + 1 : data2.likes || 0;

            // Compute relative likes
            const rel_likes1 = likes1 - likes2;
            const rel_likes2 = likes2 - likes1;

            const response = {
              stockData: [
                {
                  stock: stock1,
                  price: data1.latestPrice, // Map latestPrice to price
                  rel_likes: rel_likes1
                },
                {
                  stock: stock2,
                  price: data2.latestPrice, // Map latestPrice to price
                  rel_likes: rel_likes2
                }
              ]
            };
            res.json(response);
          });
        });

      } else {
        // Fetch price for a single stock
        getStockPrice(stock, (error, data) => {
          if (error) {
            console.error(`Error fetching ${stock}:`, error);
            return res.status(500).json({ error: 'Unable to fetch stock data' });
          }

          // Determine if the like parameter is set
          const isLike = like === 'true';
          const response = {
            stockData: {
              stock,
              price: data.latestPrice, // Map latestPrice to price
              likes: isLike ? (data.likes || 0) + 1 : data.likes || 0
            }
          };
          res.json(response);
        });
      }
    });
};
