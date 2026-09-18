import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import crypto from "crypto";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for Cryptomus payment
  app.post("/api/payment/cryptomus", async (req, res) => {
    const { amount, currency, orderId } = req.body;
    const apiKey = process.env.CRYPTOMUS_API_KEY;
    const merchantId = "84743948-54e5-4b49-8561-a6fcaec119d4";

    if (!apiKey) {
      return res.status(500).json({ error: "API Key not configured" });
    }

    try {
      const payload = {
        amount: amount.toString(),
        currency: currency,
        order_id: orderId,
      };

      // Cryptomus signature calculation: md5(base64(json_payload) + api_key)
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const sign = crypto.createHash('md5').update(base64Payload + apiKey).digest('hex');

      const response = await axios.post("https://api.cryptomus.com/v1/payment", payload, {
        headers: {
          'merchant': merchantId,
          'sign': sign,
          'Content-Type': 'application/json'
        }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Cryptomus payment error:", error.response?.data || error.message);
      res.status(500).json({ error: "Payment initiation failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
