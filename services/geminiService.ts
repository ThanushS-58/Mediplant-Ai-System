import { GoogleGenAI, Type } from "@google/genai";
import { PlantInfo } from "../types";

// Per guidelines, the API key must be obtained from the environment variable.
// The execution environment is responsible for making this available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const plantInfoSchema = {
  type: Type.OBJECT,
  properties: {
    plantName: {
      type: Type.STRING,
      description: "The most common English name of the plant."
    },
    scientificName: {
      type: Type.STRING,
      description: "The scientific (botanical) name of the plant, e.g., 'Curcuma longa'."
    },
    commonNames: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of other common names for the plant in English."
    },
    confidenceScore: {
      type: Type.NUMBER,
      description: "A score from 0 to 1 indicating the model's confidence in the identification."
    },
    description: {
      type: Type.STRING,
      description: "A brief, one-paragraph botanical description of the plant."
    },
    medicinalUses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          partUsed: { type: Type.STRING, description: "The part of the plant used (e.g., Leaf, Root, Flower)." },
          uses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific medicinal applications for this part." }
        },
        required: ["partUsed", "uses"]
      },
      description: "A list of traditional medicinal uses, categorized by the plant part."
    },
    preparationMethods: {
        type: Type.ARRAY,
        items: {type: Type.STRING},
        description: "Common methods of preparing the plant for medicinal use (e.g., 'Decoction', 'Poultice', 'Infusion')."
    },
    culturalSignificance: {
      type: Type.STRING,
      description: "Brief notes on the plant's cultural or spiritual significance, if any."
    },
    warnings: {
      type: Type.STRING,
      description: "Crucial warnings about toxicity, dosage, or contraindications. State 'None known' if there are no common warnings."
    }
  },
  required: ["plantName", "scientificName", "commonNames", "confidenceScore", "description", "medicinalUses", "preparationMethods", "culturalSignificance", "warnings"]
};

export const identifyPlant = async (base64Image: string, mimeType: string, language: string): Promise<PlantInfo> => {
  try {
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };
    
    const prompt = `You are an expert ethnobotanist. Identify the medicinal plant in this image. Provide its scientific name, common names, a confidence score for your identification, a botanical description, its traditional medicinal uses, preparation methods, any cultural significance, and important warnings. Respond in the language with this code: ${language}. If you cannot identify a plant, provide a low confidence score and explain that the image is unclear or not a plant.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: plantInfoSchema,
      },
    });

    const jsonText = response.text.trim();
    const plantData = JSON.parse(jsonText);

    // Basic validation to ensure the parsed object matches the schema
    if (plantData && typeof plantData.plantName === 'string') {
        return plantData as PlantInfo;
    } else {
        throw new Error("Invalid data structure received from API.");
    }

  } catch (error) {
    console.error("Error identifying plant:", error);
    if (error instanceof Error) {
        // Provide a clearer, more user-friendly error message for the common API key configuration issue.
        if (error.message.includes("API_KEY_INVALID") || error.message.includes("API key not valid")) {
            throw new Error("The API key is invalid or missing. Please ensure it is configured correctly in your environment.");
        }
        // For other errors, re-throw the original error so its message is displayed in the UI.
        throw error;
    }
    // Fallback for cases where the caught object is not an Error instance.
    throw new Error("An unknown error occurred during plant identification.");
  }
};