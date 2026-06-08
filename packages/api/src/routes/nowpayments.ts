import { Router } from 'express';

export const nowpaymentsRouter = Router();

nowpaymentsRouter.get('/merchant-coins', async (req, res) => {
  try {
    const apiKey = process.env.NOWPAYMENTS_API_KEY;

    if (!apiKey || apiKey.trim() === "") {
       return res.status(500).json({ error: "NOWPAYMENTS_API_KEY is not configured." });
    }

    const response = await fetch("https://api.nowpayments.io/v1/merchant/coins", {
      method: "GET",
      headers: {
        "x-api-key": apiKey
      }
    });

    if (response.ok) {
      const data: any = await response.json();
      const enabledCoins = data.selectedCurrencies || data.currencies || [];
      
      if (enabledCoins.length > 0) {
        let liveRates: Record<string, number> = {};
        try {
          const ratesRes = await fetch("https://api.coinbase.com/v2/exchange-rates?currency=USD");
          if (ratesRes.ok) {
            const ratesData = await ratesRes.json();
            const rates = ratesData.data?.rates || {};
            Object.entries(rates).forEach(([coin, rateVal]) => {
              const parsed = parseFloat(rateVal as string);
              if (parsed > 0) {
                liveRates[coin.toUpperCase()] = 1 / parsed;
              }
            });
          }
        } catch (e) {
          console.error("Coinbase rates fetch error:", e);
        }

        const mappedCoins = enabledCoins.map((coinCode: string) => {
          const upperCode = coinCode.toUpperCase().replace(/trc20|erc20|bep20/i, "");
          const coinPrice = liveRates[upperCode] || 1.00;
          
          return {
            code: upperCode,
            name: upperCode,
            priceUSD: coinPrice,
            color: "text-cyan-400",
            icon: "¤",
            apr: "2.50%"
          };
        });

        const uniqueCoins = mappedCoins.filter((coin, index, self) => 
          index === self.findIndex((c: any) => c.code === coin.code)
        );

        return res.json({ success: true, coins: uniqueCoins });
      } else {
        return res.json({ success: true, coins: [] });
      }
    } else {
       return res.status(response.status).json({ error: "Failed to fetch coins from NOWPayments API" });
    }
  } catch (err: any) {
    console.error("GET merchant coins error:", err);
    res.status(500).json({ error: err.message });
  }
});

nowpaymentsRouter.post('/create-payment', async (req, res) => {
  try {
    const { userId, amount, currency, paymentCurrency } = req.body;
    if (!userId || !amount || !currency || !paymentCurrency) {
      return res.status(400).json({ error: "Missing required details. Please check amount, currency, and payment method currency." });
    }

    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
        return res.status(500).json({ error: "NOWPAYMENTS_API_KEY is not configured." });
    }

    const response = await fetch("https://api.nowpayments.io/v1/payment", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        price_amount: Number(amount),
        price_currency: "usd",
        pay_amount: null,
        pay_currency: paymentCurrency.toLowerCase(),
        ipn_callback_url: "https://example.com/api/nowpayments/ipn",
        order_id: `${userId}_${Date.now()}`,
        order_description: `Deposit ${amount} USD worth of ${currency} via CEXPRO Gateway`
      })
    });

    const data: any = await response.json();
    if (response.ok) {
      return res.json({
        success: true,
        payment_id: data.payment_id,
        invoice_url: `https://nowpayments.io/payment?id=${data.payment_id}`,
        pay_address: data.pay_address,
        pay_amount: data.pay_amount,
        pay_currency: data.pay_currency,
        price_amount: data.price_amount,
        price_currency: data.price_currency,
        status: data.payment_status || "waiting"
      });
    } else {
      console.error("NOWPayments API error:", data);
      return res.status(400).json({ error: "Failed to create invoice with NOWPayments: " + (data.message || "Unknown error") });
    }

  } catch (error: any) {
    console.error("Payment Gateway Proxy Error:", error);
    res.status(500).json({ error: "Internal Gateway error: " + error.message });
  }
});
