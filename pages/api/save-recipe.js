import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for server-side operations
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const {
      name,
      description,
      servings,
      cooking_time,
      difficulty,
      original_text,
      total_calories,
      total_protein,
      total_carbs,
      total_fat,
      total_fiber,
      ingredients,
      user_id = null // Optional user authentication
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Recipe name is required' });
    }

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ message: 'At least one ingredient is required' });
    }

    // Start a Supabase transaction-like operation
    const recipeId = crypto.randomUUID();

    // 1. Insert the main recipe record
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        id: recipeId,
        name: name.trim(),
        description: description?.trim() || null,
        original_text: original_text || '',
        servings: parseInt(servings) || 1,
        cooking_time: cooking_time ? parseInt(cooking_time) : null,
        difficulty: difficulty || 'medium',
        total_calories: parseFloat(total_calories) || 0,
        total_protein: parseFloat(total_protein) || 0,
        total_carbs: parseFloat(total_carbs) || 0,
        total_fat: parseFloat(total_fat) || 0,
        total_fiber: parseFloat(total_fiber) || 0,
        user_id: user_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (recipeError) {
      console.error('Error inserting recipe:', recipeError);
      return res.status(500).json({ 
        message: 'Failed to save recipe',
        error: recipeError.message 
      });
    }

    // 2. Insert all ingredients
    const ingredientsData = ingredients.map(ingredient => ({
      id: crypto.randomUUID(),
      recipe_id: recipeId,
      name: ingredient.name?.trim() || '',
      amount: parseFloat(ingredient.amount) || 0,
      unit: ingredient.unit || 'g',
      original_text: ingredient.original || '',
      original_amount: parseFloat(ingredient.originalAmount) || 0,
      original_unit: ingredient.originalUnit || '',
      calories: ingredient.nutrition?.calories || 0,
      protein: ingredient.nutrition?.protein || 0,
      carbs: ingredient.nutrition?.carbs || 0,
      fat: ingredient.nutrition?.fat || 0,
      fiber: ingredient.nutrition?.fiber || 0,
      sugar: ingredient.nutrition?.sugar || 0,
      sodium: ingredient.nutrition?.sodium || 0
    }));

    const { data: savedIngredients, error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientsData)
      .select();

    if (ingredientsError) {
      console.error('Error inserting ingredients:', ingredientsError);
      
      // Rollback: delete the recipe if ingredients failed
      await supabase.from('recipes').delete().eq('id', recipeId);
      
      return res.status(500).json({ 
        message: 'Failed to save recipe ingredients',
        error: ingredientsError.message 
      });
    }

    // 3. Return success response with saved data
    res.status(201).json({
      message: 'Recipe saved successfully',
      recipe: {
        ...recipe,
        ingredients: savedIngredients
      }
    });

  } catch (error) {
    console.error('Unexpected error saving recipe:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}

// Optional: Helper function to calculate nutrition totals
export function calculateTotalNutrition(ingredients) {
  return ingredients.reduce((total, ingredient) => {
    const nutrition = ingredient.nutrition || {};
    
    return {
      calories: total.calories + (nutrition.calories || 0),
      protein: total.protein + (nutrition.protein || 0),
      carbs: total.carbs + (nutrition.carbs || 0),
      fat: total.fat + (nutrition.fat || 0),
      fiber: total.fiber + (nutrition.fiber || 0),
      sugar: total.sugar + (nutrition.sugar || 0),
      sodium: total.sodium + (nutrition.sodium || 0)
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });
}