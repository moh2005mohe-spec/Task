import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for Cryptomus payment
  app.post("/api/payment/cryptomus", async (req, res) => {
    const { amount, currency, orderId } = req.body;
    const apiKey = process.env.CRYPTOMUS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API Key not configured" });
    }

    try {
      // Basic Cryptomus payment request structure
      const response = await axios.post("https://api.cryptomus.com/v1/payment", {
        amount: amount.toString(),
        currency: currency,
        order_id: orderId,
      }, {
        headers: {
          'merchant': 'YOUR_MERCHANT_ID', // User needs to provide this or it needs to be in env
          'sign': 'YOUR_SIGNATURE', // Signature needs to be calculated
          'Content-Type': 'application/json'
        }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
