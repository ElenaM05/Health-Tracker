// pages/api/generate-meal-plan.js
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const {
      targetCalories = 1500,
      days = 7,
      preferences = {},
      user_id = null
    } = req.body;

    console.log('Generating meal plan for', targetCalories, 'calories per day for', days, 'days');

    // Step 1: Fetch all available recipes
    const recipes = await fetchAvailableRecipes(user_id);
    
    if (recipes.length === 0) {
      return res.status(400).json({ 
        message: 'No recipes available. Please add some recipes first.',
        recipes: recipes.length 
      });
    }

    console.log('Found', recipes.length, 'recipes to work with');

    // Step 2: Generate meal plan using AI
    const mealPlan = await generateMealPlanWithAI(recipes, targetCalories, days, preferences);

    // Step 3: Save the meal plan to database
    const savedMealPlan = await saveMealPlan(mealPlan, user_id);

    res.status(200).json({
      success: true,
      mealPlan: savedMealPlan,
      summary: calculateMealPlanSummary(savedMealPlan)
    });

  } catch (error) {
    console.error('Error generating meal plan:', error);
    res.status(500).json({ 
      message: 'Failed to generate meal plan', 
      error: error.message 
    });
  }
}

async function fetchAvailableRecipes(user_id) {
  try {
    let query = supabase
      .from('recipes')
      .select(`
        id,
        name,
        description,
        servings,
        cooking_time,
        difficulty,
        total_calories,
        total_protein,
        total_carbs,
        total_fat,
        total_fiber,
        recipe_ingredients (
          id,
          name,
          amount,
          unit,
          calories,
          protein,
          carbs,
          fat
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by user if specified, otherwise get public recipes
    if (user_id) {
      query = query.eq('user_id', user_id);
    } else {
      query = query.is('user_id', null);
    }

    const { data: recipes, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch recipes: ${error.message}`);
    }

    // Calculate calories per serving for each recipe
    return recipes.map(recipe => ({
      ...recipe,
      caloriesPerServing: Math.round((recipe.total_calories || 0) / (recipe.servings || 1)),
      proteinPerServing: Math.round((recipe.total_protein || 0) / (recipe.servings || 1)),
      carbsPerServing: Math.round((recipe.total_carbs || 0) / (recipe.servings || 1)),
      fatPerServing: Math.round((recipe.total_fat || 0) / (recipe.servings || 1))
    }));

  } catch (error) {
    console.error('Error fetching recipes:', error);
    throw error;
  }
}

async function generateMealPlanWithAI(recipes, targetCalories, days, preferences) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Prepare recipe data for AI
    const recipeData = recipes.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      caloriesPerServing: recipe.caloriesPerServing,
      proteinPerServing: recipe.proteinPerServing,
      carbsPerServing: recipe.carbsPerServing,
      fatPerServing: recipe.fatPerServing,
      servings: recipe.servings,
      cookingTime: recipe.cooking_time,
      difficulty: recipe.difficulty,
      totalCalories: recipe.total_calories
    }));

    const prompt = `You are a meal planning expert. Create a comprehensive ${days}-day meal plan targeting ${targetCalories} calories per day.

AVAILABLE RECIPES (${recipeData.length} recipes available):
${JSON.stringify(recipeData, null, 2)}

STRICT REQUIREMENTS - CALORIE TARGET: ${targetCalories} CALORIES PER DAY:
1. Generate meal plans for ALL ${days} days - no skipping or incomplete days
2. Target EXACTLY ${targetCalories} calories per day (±50 calories tolerance)
3. Include breakfast, lunch, dinner, and snacks for EVERY day
4. Distribute ${targetCalories} calories roughly: 
   - Breakfast: ${Math.round(targetCalories * 0.25)} calories (25%)
   - Lunch: ${Math.round(targetCalories * 0.30)} calories (30%) 
   - Dinner: ${Math.round(targetCalories * 0.35)} calories (35%)
   - Snacks: ${Math.round(targetCalories * 0.10)} calories (10%)
5. MAXIMIZE recipe variety - with only ${recipeData.length} recipes available, use smart strategies:
   - Vary serving sizes (0.5, 0.75, 1.0, 1.25, 1.5, 2.0 servings)
   - Combine recipes creatively across meals
   - Use recipes multiple times across different days but in different meal slots
   - Pair recipes with simple foods to reach exact calorie targets
6. Consider cooking time and difficulty for practical daily planning
7. Fill calorie gaps with appropriate simple snacks (apple ~80 cal, handful almonds ~160 cal, Greek yogurt ~100 cal, banana ~105 cal, etc.)

PREFERENCES TO FOLLOW:
${JSON.stringify(preferences, null, 2)}

CALORIE BALANCING STRATEGY:
- If recipes don't perfectly match calorie targets, adjust serving sizes intelligently
- Add complementary simple foods to reach exact daily targets
- Prioritize protein requirements while meeting calorie goals
- Ensure no day is missing or incomplete

RESPONSE FORMAT - Return ONLY a valid JSON object with this exact structure:
{
  "targetCalories": ${targetCalories},
  "totalDays": ${days},
  "availableRecipes": ${recipeData.length},
  "days": [
    {
      "day": 1,
      "date": "2024-01-01",
      "meals": [
        {
          "type": "breakfast",
          "recipe_id": "recipe-id-or-null-for-simple-foods",
          "recipe_name": "Recipe Name or Simple Food Name",
          "servings": 1.0,
          "calories": 375,
          "protein": 15,
          "carbs": 45,
          "fat": 12,
          "isSimpleFood": false,
          "notes": "Optional cooking notes or combinations"
        },
        {
          "type": "lunch",
          "recipe_id": "another-recipe-id",
          "recipe_name": "Another Recipe",
          "servings": 1.25,
          "calories": 450,
          "protein": 25,
          "carbs": 55,
          "fat": 15,
          "isSimpleFood": false
        },
        {
          "type": "dinner",
          "recipe_id": "dinner-recipe-id",
          "recipe_name": "Dinner Recipe",
          "servings": 1.0,
          "calories": 525,
          "protein": 30,
          "carbs": 60,
          "fat": 18,
          "isSimpleFood": false
        },
        {
          "type": "snack",
          "recipe_id": null,
          "recipe_name": "Greek Yogurt with Berries",
          "servings": 1.0,
          "calories": 150,
          "protein": 10,
          "carbs": 20,
          "fat": 2,
          "isSimpleFood": true
        }
      ],
      "totalCalories": ${targetCalories},
      "totalProtein": 80,
      "totalCarbs": 180,
      "totalFat": 47,
      "calorieVariance": 0
    }
  ]
}

CRITICAL INSTRUCTIONS - MUST ACHIEVE ${targetCalories} CALORIES PER DAY:
1. Generate exactly ${days} complete day objects in the days array
2. Each day must have 4 meals (breakfast, lunch, dinner, snack)
3. Each day's totalCalories must be within ±50 calories of ${targetCalories} - NOT 1500 OR ANY OTHER VALUE
4. Use all available ${recipeData.length} recipes creatively across the ${days} days
5. Calculate accurate totals for each day based on ${targetCalories} target
6. No incomplete days or missing meal plans
7. Ensure JSON is valid and complete

CALORIE VALIDATION: Every single day must total approximately ${targetCalories} calories. If you generate meal plans totaling 1500 calories when ${targetCalories} is 2000, you have failed the requirements.

Double-check: Your response must include ${days} days, each with complete meal information totaling close to ${targetCalories} calories (NOT 1500 or any other number).`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI did not return valid JSON meal plan');
    }

    const mealPlan = JSON.parse(jsonMatch[0]);

    // Add dates starting from today
    const today = new Date();
    mealPlan.days.forEach((day, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      day.date = date.toISOString().split('T')[0];
      day.day = index + 1;
    });

    return mealPlan;

  } catch (error) {
    console.error('AI meal plan generation failed:', error);
    throw new Error(`Failed to generate meal plan: ${error.message}`);
  }
}

async function saveMealPlan(mealPlan, user_id) {
  try {
    const mealPlanId = crypto.randomUUID();
    
    // Save main meal plan record
    const { data: savedPlan, error: planError } = await supabase
      .from('meal_plans')
      .insert({
        id: mealPlanId,
        user_id: user_id,
        name: `${mealPlan.days.length}-Day Meal Plan`,
        target_calories: mealPlan.targetCalories,
        start_date: mealPlan.days[0]?.date,
        end_date: mealPlan.days[mealPlan.days.length - 1]?.date,
        total_days: mealPlan.days.length,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (planError) {
      throw new Error(`Failed to save meal plan: ${planError.message}`);
    }

    // Save individual meals
    const meals = [];
    for (const day of mealPlan.days) {
      for (const meal of day.meals) {
        meals.push({
          id: crypto.randomUUID(),
          meal_plan_id: mealPlanId,
          day_number: day.day,
          date: day.date,
          meal_type: meal.type,
          recipe_id: meal.recipe_id,
          recipe_name: meal.recipe_name,
          servings: meal.servings,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          is_simple_food: meal.isSimpleFood || false
        });
      }
    }

    const { data: savedMeals, error: mealsError } = await supabase
      .from('meal_plan_meals')
      .insert(meals)
      .select();

    if (mealsError) {
      // Rollback: delete the meal plan if meals failed
      await supabase.from('meal_plans').delete().eq('id', mealPlanId);
      throw new Error(`Failed to save meals: ${mealsError.message}`);
    }

    // Return the complete meal plan with meals
    return {
      ...savedPlan,
      days: mealPlan.days.map(day => ({
        ...day,
        meals: savedMeals.filter(meal => meal.day_number === day.day)
      }))
    };

  } catch (error) {
    console.error('Error saving meal plan:', error);
    throw error;
  }
}

function calculateMealPlanSummary(mealPlan) {
  const totalDays = mealPlan.total_days || 0;
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  if (mealPlan.days) {
    mealPlan.days.forEach(day => {
      if (day.meals) {
        day.meals.forEach(meal => {
          totalCalories += meal.calories || 0;
          totalProtein += meal.protein || 0;
          totalCarbs += meal.carbs || 0;
          totalFat += meal.fat || 0;
        });
      }
    });
  }

  return {
    totalDays,
    averageCaloriesPerDay: totalDays > 0 ? Math.round(totalCalories / totalDays) : 0,
    averageProteinPerDay: totalDays > 0 ? Math.round(totalProtein / totalDays) : 0,
    averageCarbsPerDay: totalDays > 0 ? Math.round(totalCarbs / totalDays) : 0,
    averageFatPerDay: totalDays > 0 ? Math.round(totalFat / totalDays) : 0,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat
  };
}