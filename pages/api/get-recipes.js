// pages/api/get-recipes.js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for server-side operations
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { user_id, limit = 50, offset = 0 } = req.query;

    // Build query
    let query = supabase
      .from('recipes')
      .select(`
        id,
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
        user_id,
        created_at,
        recipe_ingredients (
          id,
          name,
          amount,
          unit,
          original_text,
          original_amount,
          original_unit,
          calories,
          protein,
          carbs,
          fat,
          fiber,
          sugar,
          sodium
        )
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Filter by user_id if provided (for authenticated users)
    if (user_id) {
      query = query.eq('user_id', user_id);
    } else {
      // If no user_id provided, get public recipes or recipes without user_id
      query = query.is('user_id', null);
    }

    const { data: recipes, error } = await query;

    if (error) {
      console.error('Error fetching recipes:', error);
      return res.status(500).json({ 
        message: 'Failed to fetch recipes',
        error: error.message 
      });
    }

    // Transform the data to match the expected format
    const formattedRecipes = recipes.map(recipe => ({
      ...recipe,
      ingredients: recipe.recipe_ingredients || []
    }));

    res.status(200).json({
      recipes: formattedRecipes,
      count: formattedRecipes.length,
      hasMore: formattedRecipes.length === parseInt(limit)
    });

  } catch (error) {
    console.error('Unexpected error fetching recipes:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}