import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { recipe } = req.body;

  if (!recipe) {
    return res.status(400).json({ message: 'Recipe text is required' });
  }

  try {
    // Step 1: Use Gemini to extract and clean ingredients
    const extractedIngredients = await extractIngredientsWithGemini(recipe);
    //('Extracted ingredients:', extractedIngredients);

    // Step 2: Get nutritional data from Calorie Ninjas for each ingredient
    const ingredientsWithNutrition = await addNutritionalData(extractedIngredients);

    res.status(200).json({ 
      ingredients: ingredientsWithNutrition,
      totalIngredients: ingredientsWithNutrition.length
    });

  } catch (error) {
    console.error('Error parsing recipe:', error);
    
    // Enhanced fallback with manual extraction
    try {
      console.log('Attempting manual extraction fallback...');
      const fallbackIngredients = extractIngredientsManually(recipe);
      const fallbackWithNutrition = await addNutritionalData(fallbackIngredients);
      
      res.status(200).json({ 
        ingredients: fallbackWithNutrition,
        totalIngredients: fallbackWithNutrition.length,
        fallback: true,
        message: 'Used manual extraction due to AI parsing failure'
      });
    } catch (fallbackError) {
      console.error('Fallback extraction also failed:', fallbackError);
      res.status(500).json({ 
        message: 'Error parsing recipe with both AI and manual methods', 
        error: error.message,
        fallbackError: fallbackError.message
      });
    }
  }
}

async function extractIngredientsWithGemini(recipe) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `You are a recipe ingredient extraction assistant. Extract ONLY the ingredients from this recipe and format them as clean, standardized text.

IMPORTANT RULES:
1. Extract only ingredients from the ingredients section, ignore method/instructions
2. Keep measurements as written (don't convert yet)
3. Remove formatting like ** or bullet points
4. Remove extra descriptions in parentheses unless essential
5. Keep the format: "amount unit ingredient"
6. Convert fractions to decimals (1/2 = 0.5)
7. For whole items like "1 onion", "2 cloves garlic", keep them as is - don't convert to grams yet
8. For "to taste" items, keep the "to taste" notation

Example input: "* **Heavy cream** – 200 ml"
Example output: "200 ml heavy cream"

Example input: "* 1 large onion"
Example output: "1 large onion"

Example input: "* Salt to taste"
Example output: "salt to taste"

Return ONLY a JSON array of strings, one per ingredient. No explanations or additional text.

Recipe text:
${recipe}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    //console.log('Gemini raw response:', text);
    
    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in Gemini response');
    }
    
    const ingredientStrings = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(ingredientStrings) || ingredientStrings.length === 0) {
      throw new Error('Gemini returned empty or invalid ingredient array');
    }
    
    // Parse each ingredient string into structured data, filtering out null values
    return ingredientStrings
      .map(ingredientStr => parseIngredientString(ingredientStr))
      .filter(ingredient => ingredient !== null); // Remove ignored ingredients
    
  } catch (error) {
    console.error('Gemini extraction failed:', error);
    throw error; // Re-throw to trigger fallback in main handler
  }
}

function parseIngredientString(ingredientStr) {
  if (!ingredientStr || typeof ingredientStr !== 'string') {
    return {
      name: 'unknown ingredient',
      amount: 100,
      unit: 'g',
      original: ingredientStr || '',
      originalAmount: 1,
      originalUnit: 'piece',
      skipNutrition: false
    };
  }

  // Check if this is a "to taste" ingredient - return null to ignore completely
  if (ingredientStr.toLowerCase().includes('to taste') || 
      ingredientStr.toLowerCase().includes('as needed') ||
      ingredientStr.toLowerCase().includes('for seasoning') ||
      ingredientStr.toLowerCase().includes('pinch of') ||
      ingredientStr.toLowerCase().includes('dash of')) {
    return null; // Completely ignore this ingredient
  }

  // Parse whole items using AI conversion
  const wholeItemResult = parseWholeItems(ingredientStr);
  if (wholeItemResult) {
    return wholeItemResult;
  }

  // Parse strings like "200ml heavy cream", "80g sugar", "2tsp gelatin powder"
  const patterns = [
    // "200ml heavy cream", "80g sugar"
    /^(\d+(?:\.\d+)?)\s*(ml|g|kg|tsp|tbsp|teaspoon|tablespoon|cup|cups|oz|lb|lbs)\s+(.+)$/i,
    // "200 ml heavy cream" (with space)
    /^(\d+(?:\.\d+)?)\s+(ml|g|kg|tsp|tbsp|teaspoon|tablespoon|cup|cups|oz|lb|lbs)\s+(.+)$/i,
    // "2 teaspoons vanilla extract"
    /^(\d+(?:\.\d+)?)\s+(teaspoons|tablespoons)\s+(.+)$/i,
    // Handle fractions like "1/2 cup flour"
    /^(\d+\/\d+|\d+\s+\d+\/\d+)\s+(ml|g|kg|tsp|tbsp|teaspoon|tablespoon|cup|cups|oz|lb|lbs)\s+(.+)$/i
  ];
  
  for (const pattern of patterns) {
    const match = ingredientStr.match(pattern);
    if (match) {
      const [, amountStr, unit, ingredient] = match;
      
      // Convert fractions to decimals
      let amount;
      if (amountStr.includes('/')) {
        amount = evaluateFraction(amountStr);
      } else {
        amount = parseFloat(amountStr);
      }
      
      if (isNaN(amount)) {
        amount = 1;
      }
      
      const convertedAmount = convertToGrams(amount, unit.toLowerCase(), ingredient.toLowerCase());
      
      return {
        name: ingredient.trim().toLowerCase(),
        amount: Math.round(convertedAmount),
        unit: 'g',
        original: ingredientStr,
        originalAmount: amount,
        originalUnit: unit.toLowerCase(),
        skipNutrition: false
      };
    }
  }
  
  // If no pattern matches, return with estimated amount
  return {
    name: ingredientStr.toLowerCase().trim(),
    amount: 100, // default estimate
    unit: 'g',
    original: ingredientStr,
    originalAmount: 1,
    originalUnit: 'piece',
    skipNutrition: false
  };
}

function parseWholeItems(ingredientStr) {
  // Define common whole item conversions with AI-like intelligence
  const wholeItemPatterns = [
    // Onions
    { pattern: /(\d+(?:\.\d+)?)\s*(small|medium|large)?\s*onions?/i, 
      converter: (amount, size) => {
        const sizes = { small: 80, medium: 150, large: 220 };
        return amount * (sizes[size?.toLowerCase()] || sizes.medium);
      }
    },
    // Garlic cloves
    { pattern: /(\d+(?:\.\d+)?)\s*cloves?\s*(?:of\s*)?garlic/i,
      converter: (amount) => amount * 3 // 1 clove ≈ 3g
    },
    // Tomatoes
    { pattern: /(\d+(?:\.\d+)?)\s*(small|medium|large)?\s*tomatoes?/i,
      converter: (amount, size) => {
        const sizes = { small: 100, medium: 180, large: 250 };
        return amount * (sizes[size?.toLowerCase()] || sizes.medium);
      }
    },
    // Carrots
    { pattern: /(\d+(?:\.\d+)?)\s*(small|medium|large)?\s*carrots?/i,
      converter: (amount, size) => {
        const sizes = { small: 50, medium: 80, large: 120 };
        return amount * (sizes[size?.toLowerCase()] || sizes.medium);
      }
    },
    // Potatoes
    { pattern: /(\d+(?:\.\d+)?)\s*(small|medium|large)?\s*potatoes?/i,
      converter: (amount, size) => {
        const sizes = { small: 150, medium: 200, large: 300 };
        return amount * (sizes[size?.toLowerCase()] || sizes.medium);
      }
    },
    // Bell peppers
    { pattern: /(\d+(?:\.\d+)?)\s*(small|medium|large)?\s*(?:bell\s*)?peppers?/i,
      converter: (amount, size) => {
        const sizes = { small: 100, medium: 150, large: 200 };
        return amount * (sizes[size?.toLowerCase()] || sizes.medium);
      }
    },
    // Eggs
    { pattern: /(\d+(?:\.\d+)?)\s*eggs?/i,
      converter: (amount) => amount * 50 // 1 egg ≈ 50g
    },
    // Lemons/Limes
    { pattern: /(\d+(?:\.\d+)?)\s*(lemons?|limes?)/i,
      converter: (amount) => amount * 60 // 1 lemon ≈ 60g
    },
    // Bananas
    { pattern: /(\d+(?:\.\d+)?)\s*(small|medium|large)?\s*bananas?/i,
      converter: (amount, size) => {
        const sizes = { small: 80, medium: 120, large: 160 };
        return amount * (sizes[size?.toLowerCase()] || sizes.medium);
      }
    },
    // Apples
    { pattern: /(\d+(?:\.\d+)?)\s*(small|medium|large)?\s*apples?/i,
      converter: (amount, size) => {
        const sizes = { small: 130, medium: 180, large: 230 };
        return amount * (sizes[size?.toLowerCase()] || sizes.medium);
      }
    }
  ];

  for (const { pattern, converter } of wholeItemPatterns) {
    const match = ingredientStr.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      const size = match[2];
      const convertedAmount = Math.round(converter(amount, size));
      
      return {
        name: extractIngredientName(ingredientStr),
        amount: convertedAmount,
        unit: 'g',
        original: ingredientStr,
        originalAmount: amount,
        originalUnit: 'piece',
        skipNutrition: false,
        convertedFromWhole: true
      };
    }
  }

  return null;
}

function extractIngredientName(ingredientStr) {
  // Clean up the ingredient name by removing quantities and common descriptors
  return ingredientStr
    .toLowerCase()
    .replace(/\d+(?:\.\d+)?/g, '') // Remove numbers
    .replace(/\b(small|medium|large|cloves?|of)\b/g, '') // Remove size descriptors
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

function evaluateFraction(fractionStr) {
  // Handle mixed numbers like "1 1/2"
  if (fractionStr.includes(' ')) {
    const parts = fractionStr.split(' ');
    const whole = parseFloat(parts[0]);
    const fraction = parts[1];
    const [num, den] = fraction.split('/').map(parseFloat);
    return whole + (num / den);
  }
  
  // Handle simple fractions like "1/2"
  const [num, den] = fractionStr.split('/').map(parseFloat);
  return num / den;
}

function convertToGrams(amount, unit, ingredient) {
  const conversions = {
    'g': 1,
    'gram': 1, 'grams': 1,
    'kg': 1000,
    'ml': 1, // approximate for most liquids
    'l': 1000, 'liter': 1000, 'liters': 1000,
    'cup': getIngredientCupWeight(ingredient),
    'cups': getIngredientCupWeight(ingredient),
    'tbsp': 15, 'tablespoon': 15, 'tablespoons': 15,
    'tsp': 5, 'teaspoon': 5, 'teaspoons': 5,
    'oz': 28, 'ounce': 28, 'ounces': 28,
    'lb': 454, 'lbs': 454, 'pound': 454, 'pounds': 454
  };
  
  return amount * (conversions[unit] || 50);
}

function getIngredientCupWeight(ingredient) {
  const cupWeights = {
    'flour': 120,
    'sugar': 200,
    'brown sugar': 220,
    'butter': 230,
    'rice': 200,
    'milk': 240,
    'coconut milk': 240,
    'cream': 240,
    'heavy cream': 240,
    'water': 240,
    'oil': 220,
    'olive oil': 220,
    'vegetable oil': 220,
    'oats': 80,
    'coconut': 80,
    'breadcrumbs': 60,
    'cheese': 120,
    'yogurt': 240,
    'spinach': 30,  // Fresh spinach is very light - 1 cup ≈ 30g
    'lettuce': 35,
    'kale': 16,     // Chopped kale is even lighter
    'arugula': 20,
    'basil': 6,     // Fresh herbs are very light
    'parsley': 15,
    'cilantro': 16
  };
  
  for (const [key, weight] of Object.entries(cupWeights)) {
    if (ingredient.includes(key)) {
      return weight;
    }
  }
  
  return 240; // default cup weight
}

async function addNutritionalData(ingredients) {
  if (!ingredients || ingredients.length === 0) {
    return [];
  }

  const results = [];
  
  for (const ingredient of ingredients) {
    try {
      // Query Calorie Ninjas with the gram amount
      const nutritionQuery = `${ingredient.amount}g ${ingredient.name}`;
      //('Querying Calorie Ninjas:', nutritionQuery);
      
      const nutrition = await getCalorieNinjasData(nutritionQuery);
      
      results.push({
        ...ingredient,
        nutrition: nutrition
      });
      
      // Rate limiting - wait 200ms between requests
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`Error getting nutrition for ${ingredient.name}:`, error);
      results.push({
        ...ingredient,
        nutrition: null,
        nutritionError: error.message
      });
    }
  }
  
  return results;
}

async function getCalorieNinjasData(query) {
  if (!process.env.CALORIE_NINJAS_API_KEY) {
    throw new Error('CALORIE_NINJAS_API_KEY environment variable is not set');
  }

  try {
    const response = await fetch(`https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': process.env.CALORIE_NINJAS_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`Calorie Ninjas API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        calories: Math.round((item.calories || 0) * 10) / 10,
        protein: Math.round((item.protein_g || 0) * 10) / 10,
        carbs: Math.round((item.carbohydrates_total_g || 0) * 10) / 10,
        fat: Math.round((item.fat_total_g || 0) * 10) / 10,
        fiber: Math.round((item.fiber_g || 0) * 10) / 10,
        sugar: Math.round((item.sugar_g || 0) * 10) / 10,
        sodium: Math.round(item.sodium_mg || 0),
        potassium: Math.round(item.potassium_mg || 0),
        cholesterol: Math.round(item.cholesterol_mg || 0)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Calorie Ninjas API error:', error);
    throw error;
  }
}

// Fallback manual extraction if Gemini fails
function extractIngredientsManually(recipe) {
  if (!recipe || typeof recipe !== 'string') {
    throw new Error('Invalid recipe input for manual extraction');
  }

  const lines = recipe.split('\n');
  const ingredients = [];
  
  let inIngredientsSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed) continue;
    
    // Detect start of ingredients section
    if (trimmed.toLowerCase().includes('ingredients')) {
      inIngredientsSection = true;
      continue;
    }
    
    // Detect end of ingredients section (method/instructions)
    if (trimmed.toLowerCase().includes('method') || 
        trimmed.toLowerCase().includes('instructions') ||
        trimmed.toLowerCase().includes('directions') ||
        trimmed.toLowerCase().includes('preparation')) {
      inIngredientsSection = false;
      continue;
    }
    
    // Extract ingredients (looking for lines that start with bullets or have ingredient patterns)
    if (inIngredientsSection && (trimmed.startsWith('*') || trimmed.startsWith('-') || trimmed.startsWith('•'))) {
      // Clean up the line
      let cleaned = trimmed
        .replace(/^[\*\-\•]+\s*/, '') // Remove bullets
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold formatting
        .replace(/–/g, '-') // Normalize dashes
        .trim();
      
      if (cleaned) {
        const parsed = parseIngredientString(cleaned);
        if (parsed !== null) { // Only add non-ignored ingredients
          ingredients.push(parsed);
        }
      }
    }
  }
  
  if (ingredients.length === 0) {
    throw new Error('No ingredients found in manual extraction');
  }
  
  return ingredients;
}