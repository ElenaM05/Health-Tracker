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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a recipe parsing assistant. Extract ingredients from recipes and format them as JSON. 
    For each ingredient, provide:
    - name: the ingredient name (standardized, e.g., "chicken breast" not "boneless skinless chicken breast")
    - amount: numeric value (convert fractions to decimals, e.g., 1/2 = 0.5)
    - unit: standardized unit (cup, tablespoon, teaspoon, gram, ounce, pound, piece, etc.)
    - original: the original text as written

    Return ONLY valid JSON array format. If no clear amount is specified, estimate a reasonable amount.
    Example output:
    [
      {"name": "chicken breast", "amount": 1, "unit": "pound", "original": "1 lb boneless skinless chicken breast"},
      {"name": "rice", "amount": 2, "unit": "cup", "original": "2 cups jasmine rice"}
    ]

    Parse this recipe and extract ingredients:

    ${recipe}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response to extract just the JSON
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    const parsedIngredients = JSON.parse(jsonMatch[0]);
    res.status(200).json({ ingredients: parsedIngredients });
  } catch (error) {
    console.error('Error parsing recipe:', error);
    
    // Fallback: simple regex parsing
    try {
      const fallbackIngredients = parseRecipeWithRegex(recipe);
      res.status(200).json({ 
        ingredients: fallbackIngredients,
        fallback: true 
      });
    } catch (fallbackError) {
      res.status(500).json({ 
        message: 'Error parsing recipe', 
        error: error.message 
      });
    }
  }
}

// Fallback regex-based parsing
function parseRecipeWithRegex(recipeText) {
  const lines = recipeText.split('\n').filter(line => line.trim());
  const ingredients = [];
  
  // Enhanced regex to match various ingredient patterns
  const patterns = [
    /^[\s\-\*\•]*(\d+(?:\/\d+)?(?:\.\d+)?)\s*([a-zA-Z]+)?\s*(.+?)(?:\s*\(.*\))?$/,
    /^[\s\-\*\•]*(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(.+?)$/,
    /^[\s\-\*\•]*([a-zA-Z\s]+)(?:\s*-\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+))?$/
  ];
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;
    
    for (const pattern of patterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        let [, amount, unit, ingredient] = match;
        
        // Handle fractions
        if (amount && amount.includes('/')) {
          const [num, den] = amount.split('/');
          amount = parseFloat(num) / parseFloat(den);
        } else {
          amount = parseFloat(amount) || 1;
        }
        
        // Clean up ingredient name
        ingredient = ingredient ? ingredient.trim().toLowerCase() : '';
        unit = unit ? unit.toLowerCase() : 'piece';
        
        if (ingredient) {
          ingredients.push({
            name: ingredient,
            amount: amount,
            unit: unit,
            original: trimmedLine
          });
          break;
        }
      }
    }
  });
  
  return ingredients;
}