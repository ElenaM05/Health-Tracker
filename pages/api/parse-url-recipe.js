// pages/api/parse-url-recipe.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { JSDOM } from 'jsdom';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({ message: 'Invalid URL format' });
  }

  try {
    console.log('Fetching recipe from URL:', url);
    
    // Step 1: Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    // Step 2: Extract complete recipe data including nutrition if available
    let recipeData = await extractCompleteRecipeData(html, url);
    
    if (!recipeData) {
      throw new Error('Could not extract recipe data from the provided URL');
    }

    // Step 3: Create recipe card text for existing parse functionality
    const recipeCardText = createRecipeCardText(recipeData);

    // Step 4: Check if we already have nutrition data
    if (recipeData.nutrition && recipeData.nutrition.calories) {
      // Return with existing nutrition data - no API calls needed
      const formattedResults = formatExistingNutrition(recipeData);
      
      res.status(200).json({
        success: true,
        hasExistingNutrition: true,
        recipe: {
          name: recipeData.name || '',
          description: recipeData.description || '',
          servings: recipeData.servings || 4,
          cookingTime: recipeData.cookingTime || null,
          prepTime: recipeData.prepTime || null,
          totalTime: recipeData.totalTime || null,
          difficulty: estimateDifficulty(recipeData),
          ingredients: recipeData.ingredients || [],
          instructions: recipeData.instructions || [],
          originalUrl: url,
          extractionMethod: recipeData.extractionMethod || 'unknown',
          recipeText: recipeCardText
        },
        nutritionResults: formattedResults
      });
    } else {
      // No existing nutrition data - return recipe for processing with existing API
      res.status(200).json({
        success: true,
        hasExistingNutrition: false,
        recipe: {
          name: recipeData.name || '',
          description: recipeData.description || '',
          servings: recipeData.servings || 4,
          cookingTime: recipeData.cookingTime || null,
          prepTime: recipeData.prepTime || null,
          totalTime: recipeData.totalTime || null,
          difficulty: estimateDifficulty(recipeData),
          ingredients: recipeData.ingredients || [],
          instructions: recipeData.instructions || [],
          originalUrl: url,
          extractionMethod: recipeData.extractionMethod || 'unknown',
          recipeText: recipeCardText
        }
      });
    }

  } catch (error) {
    console.error('Error parsing recipe from URL:', error);
    res.status(500).json({ 
      message: 'Failed to parse recipe from URL', 
      error: error.message 
    });
  }
}

async function extractCompleteRecipeData(html, url) {
  try {
    // Step 1: Try structured data first (JSON-LD)
    let recipeData = extractStructuredRecipeData(html);
    
    // Step 2: Try microdata if no structured data
    if (!recipeData) {
      recipeData = extractMicrodataRecipe(html);
    }
    
    // Step 3: Use AI extraction as fallback
    if (!recipeData) {
      recipeData = await extractRecipeWithAI(html, url);
    }

    return recipeData;
  } catch (error) {
    console.error('Error extracting recipe data:', error);
    return null;
  }
}

function extractStructuredRecipeData(html) {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        const recipe = findRecipeInJsonLd(data);
        
        if (recipe) {
          // Extract nutrition data if available
          const nutrition = extractNutritionFromJsonLd(recipe);
          
          return {
            name: recipe.name,
            description: recipe.description,
            servings: parseServings(recipe.recipeYield || recipe.yield),
            cookingTime: parseDuration(recipe.cookTime),
            prepTime: parseDuration(recipe.prepTime),
            totalTime: parseDuration(recipe.totalTime),
            ingredients: Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [],
            instructions: parseInstructions(recipe.recipeInstructions),
            nutrition: nutrition,
            extractionMethod: 'json-ld'
          };
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON-LD:', parseError);
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting structured data:', error);
    return null;
  }
}

function extractNutritionFromJsonLd(recipe) {
  if (!recipe.nutrition) return null;
  
  const nutrition = recipe.nutrition;
  
  // Handle both single nutrition object and array
  const nutritionData = Array.isArray(nutrition) ? nutrition[0] : nutrition;
  
  if (!nutritionData) return null;
  
  return {
    calories: parseFloat(nutritionData.calories) || null,
    protein: parseFloat(nutritionData.proteinContent) || null,
    carbs: parseFloat(nutritionData.carbohydrateContent) || null,
    fat: parseFloat(nutritionData.fatContent) || null,
    fiber: parseFloat(nutritionData.fiberContent) || null,
    sugar: parseFloat(nutritionData.sugarContent) || null,
    sodium: parseFloat(nutritionData.sodiumContent) || null,
    servingSize: nutritionData.servingSize || null
  };
}

function extractMicrodataRecipe(html) {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    const recipeElement = document.querySelector('[itemtype*="Recipe"]');
    
    if (recipeElement) {
      // Extract nutrition data from microdata
      const nutrition = extractNutritionFromMicrodata(recipeElement);
      
      return {
        name: getItemprop(recipeElement, 'name'),
        description: getItemprop(recipeElement, 'description'),
        servings: parseServings(getItemprop(recipeElement, 'recipeYield')),
        cookingTime: parseDuration(getItemprop(recipeElement, 'cookTime')),
        prepTime: parseDuration(getItemprop(recipeElement, 'prepTime')),
        totalTime: parseDuration(getItemprop(recipeElement, 'totalTime')),
        ingredients: getItempropList(recipeElement, 'recipeIngredient'),
        instructions: getItempropList(recipeElement, 'recipeInstructions'),
        nutrition: nutrition,
        extractionMethod: 'microdata'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting microdata:', error);
    return null;
  }
}

function extractNutritionFromMicrodata(element) {
  const nutritionElement = element.querySelector('[itemtype*="NutritionInformation"]');
  
  if (!nutritionElement) return null;
  
  return {
    calories: parseFloat(getItemprop(nutritionElement, 'calories')) || null,
    protein: parseFloat(getItemprop(nutritionElement, 'proteinContent')) || null,
    carbs: parseFloat(getItemprop(nutritionElement, 'carbohydrateContent')) || null,
    fat: parseFloat(getItemprop(nutritionElement, 'fatContent')) || null,
    fiber: parseFloat(getItemprop(nutritionElement, 'fiberContent')) || null,
    sugar: parseFloat(getItemprop(nutritionElement, 'sugarContent')) || null,
    sodium: parseFloat(getItemprop(nutritionElement, 'sodiumContent')) || null,
    servingSize: getItemprop(nutritionElement, 'servingSize') || null
  };
}

async function extractRecipeWithAI(html, url) {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Remove unwanted elements
    const unwanted = document.querySelectorAll('script, style, nav, footer, header, aside, .advertisement, .ads');
    unwanted.forEach(el => el.remove());
    
    const cleanText = document.body.textContent
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000);
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Extract complete recipe information from this webpage content. The URL is: ${url}

IMPORTANT: Return ONLY a JSON object with these exact fields:
{
  "name": "recipe title",
  "description": "brief description",
  "servings": number,
  "cookingTime": minutes as number or null,
  "prepTime": minutes as number or null,
  "totalTime": minutes as number or null,
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...],
  "nutrition": {
    "calories": number or null,
    "protein": number or null,
    "carbs": number or null,
    "fat": number or null,
    "fiber": number or null,
    "sugar": number or null,
    "sodium": number or null,
    "servingSize": "text or null"
  }
}

Look carefully for any nutrition information, calories per serving, or nutritional facts on the page. If nutrition info is found, include it in the nutrition object. If not found, set nutrition values to null.

Webpage content:
${cleanText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const recipeData = JSON.parse(jsonMatch[0]);
      return {
        ...recipeData,
        extractionMethod: 'ai'
      };
    }
    
    return null;
  } catch (error) {
    console.error('AI extraction failed:', error);
    return null;
  }
}

function createRecipeCardText(recipeData) {
  const lines = [];
  
  // Title
  if (recipeData.name) {
    lines.push(recipeData.name);
    lines.push('');
  }
  
  // Description
  if (recipeData.description) {
    lines.push(recipeData.description);
    lines.push('');
  }
  
  // Recipe info
  const info = [];
  if (recipeData.servings) info.push(`Serves: ${recipeData.servings}`);
  if (recipeData.prepTime) info.push(`Prep: ${recipeData.prepTime} min`);
  if (recipeData.cookingTime) info.push(`Cook: ${recipeData.cookingTime} min`);
  if (recipeData.totalTime) info.push(`Total: ${recipeData.totalTime} min`);
  
  if (info.length > 0) {
    lines.push(info.join(' | '));
    lines.push('');
  }
  
  // Ingredients
  if (recipeData.ingredients && recipeData.ingredients.length > 0) {
    lines.push('Ingredients:');
    recipeData.ingredients.forEach(ingredient => {
      lines.push(`* ${ingredient}`);
    });
    lines.push('');
  }
  
  // Instructions
  if (recipeData.instructions && recipeData.instructions.length > 0) {
    lines.push('Instructions:');
    recipeData.instructions.forEach((instruction, index) => {
      lines.push(`${index + 1}. ${instruction}`);
    });
  }
  
  return lines.join('\n');
}

function formatExistingNutrition(recipeData) {
  if (!recipeData.nutrition) return null;
  
  const nutrition = recipeData.nutrition;
  const servings = recipeData.servings || 1;
  
  // Calculate total nutrition (assuming the provided nutrition is per serving)
  const totalCalories = (nutrition.calories || 0) * servings;
  const totalProtein = (nutrition.protein || 0) * servings;
  const totalCarbs = (nutrition.carbs || 0) * servings;
  const totalFat = (nutrition.fat || 0) * servings;
  const totalFiber = (nutrition.fiber || 0) * servings;
  const totalSugar = (nutrition.sugar || 0) * servings;
  const totalSodium = (nutrition.sodium || 0) * servings;
  
  return {
    totalCalories: Math.round(totalCalories),
    totalNutrients: {
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
      fiber: Math.round(totalFiber * 10) / 10,
      sugar: Math.round(totalSugar * 10) / 10,
      sodium: Math.round(totalSodium)
    },
    ingredients: (recipeData.ingredients || []).map(ingredient => ({
      name: ingredient.toLowerCase(),
      original: ingredient,
      calories: '—', // We don't have per-ingredient breakdown
      nutrients: null,
      estimated: false,
      fromSite: true
    })),
    perServing: {
      calories: Math.round(nutrition.calories || 0),
      protein: Math.round((nutrition.protein || 0) * 10) / 10,
      carbs: Math.round((nutrition.carbs || 0) * 10) / 10,
      fat: Math.round((nutrition.fat || 0) * 10) / 10,
      fiber: Math.round((nutrition.fiber || 0) * 10) / 10,
      sugar: Math.round((nutrition.sugar || 0) * 10) / 10,
      sodium: Math.round(nutrition.sodium || 0)
    }
  };
}

// Helper functions (reused from existing code)
function findRecipeInJsonLd(data) {
  if (data['@type'] === 'Recipe') {
    return data;
  }
  
  if (Array.isArray(data)) {
    for (const item of data) {
      const recipe = findRecipeInJsonLd(item);
      if (recipe) return recipe;
    }
  }
  
  if (typeof data === 'object' && data !== null) {
    for (const value of Object.values(data)) {
      if (typeof value === 'object') {
        const recipe = findRecipeInJsonLd(value);
        if (recipe) return recipe;
      }
    }
  }
  
  return null;
}

function getItemprop(element, prop) {
  const item = element.querySelector(`[itemprop="${prop}"]`);
  return item ? item.textContent.trim() : null;
}

function getItempropList(element, prop) {
  const items = element.querySelectorAll(`[itemprop="${prop}"]`);
  return Array.from(items).map(item => item.textContent.trim());
}

function parseServings(servingsStr) {
  if (!servingsStr) return 4;
  const match = String(servingsStr).match(/\d+/);
  return match ? parseInt(match[0]) : 4;
}

function parseDuration(durationStr) {
  if (!durationStr) return null;
  
  if (typeof durationStr === 'string' && durationStr.startsWith('PT')) {
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) {
      const hours = parseInt(match[1] || '0');
      const minutes = parseInt(match[2] || '0');
      return hours * 60 + minutes;
    }
  }
  
  const timeStr = String(durationStr).toLowerCase();
  let totalMinutes = 0;
  
  const hourMatch = timeStr.match(/(\d+)\s*h(?:our)?s?/);
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1]) * 60;
  }
  
  const minuteMatch = timeStr.match(/(\d+)\s*m(?:in)?(?:ute)?s?/);
  if (minuteMatch) {
    totalMinutes += parseInt(minuteMatch[1]);
  }
  
  return totalMinutes > 0 ? totalMinutes : null;
}

function parseInstructions(instructions) {
  if (!instructions) return [];
  
  if (Array.isArray(instructions)) {
    return instructions.map(inst => {
      if (typeof inst === 'string') return inst;
      if (inst.text) return inst.text;
      return String(inst);
    });
  }
  
  if (typeof instructions === 'string') {
    return instructions.split('\n').filter(line => line.trim());
  }
  
  return [];
}

function estimateDifficulty(recipeData) {
  const instructionCount = recipeData.instructions?.length || 0;
  const ingredientCount = recipeData.ingredients?.length || 0;
  const totalTime = recipeData.totalTime || recipeData.cookingTime || 0;
  
  if (instructionCount <= 3 && ingredientCount <= 5 && totalTime <= 30) {
    return 'easy';
  } else if (instructionCount > 8 || ingredientCount > 12 || totalTime > 90) {
    return 'hard';
  }
  
  return 'medium';
}