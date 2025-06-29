// pages/api/get-nutrition.js
import axios from 'axios';

export default async function handler(req, res) {
  console.log('Incoming request to /api/get-nutrition');
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { ingredients } = req.body;

  if (!ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ message: 'Ingredients array is required' });
  }
  
  try {
    
    const results = await Promise.all(
      ingredients.map(async (ingredient) => {
        try {
          console.log('Querying ingredient:', ingredient);

          const response = await axios.get('https://api.calorieninjas.com/v1/nutrition', {
            params: { query: `${ingredient.amount} ${ingredient.unit} ${ingredient.name}` },
            headers: { 'X-Api-Key': process.env.CALORIE_NINJAS_API_KEY }
          });
          console.log('CalorieNinjas API response:', response.data);

          const item = response.data.items?.[0];
          if (!item) throw new Error('No data');

          return {
            ...ingredient,
            calories: Math.round(item.calories || 0),
            nutrients: {
              protein: Math.round(item.protein_g || 0),
              fat: Math.round(item.fat_total_g || 0),
              carbs: Math.round(item.carbohydrates_total_g || 0),
              fiber: Math.round(item.fiber_g || 0),
              sugar: Math.round(item.sugar_g || 0),
              sodium: Math.round(item.sodium_mg || 0),
            },
            success: true,
            source: 'CalorieNinjas'
          };
        } catch (err) {
          return {
            ...ingredient,
            calories: 0,
            nutrients: { protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 0 },
            success: false,
            source: 'Unavailable'
          };
        }
      })
    );

    const totals = results.reduce(
      (acc, item) => {
        acc.calories += item.calories;
        acc.protein += item.nutrients.protein;
        acc.fat += item.nutrients.fat;
        acc.carbs += item.nutrients.carbs;
        acc.fiber += item.nutrients.fiber;
        acc.sugar += item.nutrients.sugar;
        acc.sodium += item.nutrients.sodium;
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 0 }
    );

    res.status(200).json({
      ingredients: results,
      totalCalories: totals.calories,
      totalNutrients: {
        protein: totals.protein,
        fat: totals.fat,
        carbs: totals.carbs,
        fiber: totals.fiber,
        sugar: totals.sugar,
        sodium: totals.sodium
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch nutrition', error: error.message });
  }
}
