// pages/api/get-meal-plans.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { user_id, limit = 10, offset = 0, include_meals = true } = req.query;

    // Build query for meal plans
    let query = supabase
      .from('meal_plans')
      .select(`
        id,
        name,
        target_calories,
        start_date,
        end_date,
        total_days,
        user_id,
        created_at
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Filter by user_id if provided
    if (user_id) {
      query = query.eq('user_id', user_id);
    } else {
      query = query.is('user_id', null);
    }

    const { data: mealPlans, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch meal plans: ${error.message}`);
    }

    // If include_meals is true, fetch meals for each plan
    if (include_meals === 'true' && mealPlans.length > 0) {
      const mealPlanIds = mealPlans.map(plan => plan.id);
      
      const { data: meals, error: mealsError } = await supabase
        .from('meal_plan_meals')
        .select(`
          id,
          meal_plan_id,
          day_number,
          date,
          meal_type,
          recipe_id,
          recipe_name,
          servings,
          calories,
          protein,
          carbs,
          fat,
          is_simple_food,
          recipes (
            id,
            name,
            description,
            servings,
            cooking_time,
            difficulty
          )
        `)
        .in('meal_plan_id', mealPlanIds)
        .order('day_number')
        .order('meal_type');

      if (mealsError) {
        console.error('Error fetching meals:', mealsError);
        // Continue without meals data rather than failing completely
      }

      // Group meals by meal plan and day
      const formattedMealPlans = mealPlans.map(plan => {
        const planMeals = meals?.filter(meal => meal.meal_plan_id === plan.id) || [];
        
        // Group meals by day
        const dayGroups = {};
        planMeals.forEach(meal => {
          if (!dayGroups[meal.day_number]) {
            dayGroups[meal.day_number] = {
              day: meal.day_number,
              date: meal.date,
              meals: []
            };
          }
          dayGroups[meal.day_number].meals.push(meal);
        });

        // Calculate daily totals
        const days = Object.values(dayGroups).map(day => ({
          ...day,
          totalCalories: day.meals.reduce((sum, meal) => sum + (meal.calories || 0), 0),
          totalProtein: day.meals.reduce((sum, meal) => sum + (meal.protein || 0), 0),
          totalCarbs: day.meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0),
          totalFat: day.meals.reduce((sum, meal) => sum + (meal.fat || 0), 0)
        }));

        return {
          ...plan,
          days: days.sort((a, b) => a.day - b.day)
        };
      });

      res.status(200).json({
        mealPlans: formattedMealPlans,
        count: formattedMealPlans.length,
        hasMore: formattedMealPlans.length === parseInt(limit)
      });
    } else {
      res.status(200).json({
        mealPlans,
        count: mealPlans.length,
        hasMore: mealPlans.length === parseInt(limit)
      });
    }

  } catch (error) {
    console.error('Error fetching meal plans:', error);
    res.status(500).json({ 
      message: 'Failed to fetch meal plans', 
      error: error.message 
    });
  }
}