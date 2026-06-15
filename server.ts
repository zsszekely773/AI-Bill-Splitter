import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Apply high limits for base64 photo payloads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Initialize Google GenAI client lazily (so we don't crash at startup if key is missing)
let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please add it via Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// REST Endpoint to parse a receipt photo
app.post("/api/analyze-receipt", async (req, res): Promise<any> => {
  try {
    const { image, mimeType } = req.body;
    if (!image || !mimeType) {
      return res.status(400).json({ error: "Missing image data or mimeType in request body." });
    }

    const ai = getAiClient();

    // Prepare content parts
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: image,
      },
    };

    const textPart = {
      text: "Analyze this receipt image and extract the items, the individual unit price of each item (this means the price of a single unit of that item, NOT the multiplied row subtotal if quantity is > 1), quantity, tax, tip, service charge, and total. If you see multiple discounts or adjustments, deduct them from the item price, or list them as separate items with negative prices. Ensure every item name is descriptive and exact.",
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              description: "The list of standard items purchased on the receipt.",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Descriptive name of the food or item." },
                  price: { type: Type.NUMBER, description: "The individual unit price of a single unit of this item (not the total price for the row/quantity)." },
                  quantity: { type: Type.INTEGER, description: "Quantity of this item." },
                },
                required: ["name", "price"],
              },
            },
            tax: { type: Type.NUMBER, description: "Sales tax amount if found, otherwise 0." },
            tip: { type: Type.NUMBER, description: "Tip/gratuity amount if found, otherwise 0." },
            serviceCharge: { type: Type.NUMBER, description: "Service charge or other fees if found, otherwise 0." },
            total: { type: Type.NUMBER, description: "The Grand Total of the receipt if found." },
          },
          required: ["items"],
        },
      },
    });

    const textResult = response.text;
    if (!textResult) {
      return res.status(500).json({ error: "Failed to parse receipt: Gemini returned empty response." });
    }

    const parsedData = JSON.parse(textResult.trim());
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Error analyzing receipt:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred while analyzing the receipt.",
    });
  }
});

// Setup Vite Dev server or Serve static files
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Bill Splitter Server] running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
});
