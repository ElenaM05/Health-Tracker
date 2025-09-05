
//MealPlanner.js
import { useState, useEffect } from 'react';
import { 
  Calendar, ChefHat, Target, TrendingUp, 
  Plus, List, Eye, Settings, Trash2,
  Loader2, AlertCircle, CheckCircle, X,
  BarChart3, PieChart, Utensils, Coffee, Sandwich, Soup
} from 'lucide-react';

export default function MealPlanner({ currentView: externalView, onViewChange }) {
  // Use external view if provided, otherwise use internal navigation
  const hasExternalNav = externalView !== undefined;
  const [internalView, setInternalView] = useState('generate');
  const currentView = hasExternalNav ? externalView : internalView;
  
  // Generation form state
  const [generationForm, setGenerationForm] = useState({
    targetCalories: 2000,
    days: 7,
    preferences: {
      dietType: 'balanced',
      avoidIngredients: [],
      preferredMealTypes: []
    }
  });
  
  // Loading and status states
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [generationSuccess, setGenerationSuccess] = useState(false);
  
  // Meal plans list state
  const [mealPlans, setMealPlans] = useState([]);
  const [mealPlansLoading, setMealPlansLoading] = useState(false);
  const [mealPlansError, setMealPlansError] = useState('');
  
  // Selected meal plan state
  const [selectedMealPlan, setSelectedMealPlan] = useState(null);
  const [viewingPlan, setViewingPlan] = useState(false);

  // Load meal plans when switching to plans view
  useEffect(() => {
    if (currentView === 'plans') {
      loadMealPlans();
    }
  }, [currentView]);

  const loadMealPlans = async () => {
    setMealPlansLoading(true);
    setMealPlansError('');
    
    try {
      console.log('Fetching meal plans from /api/get-meal-plans');
      const response = await fetch('/api/get-meal-plans?include_meals=true');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        // If API fails, use mock data for development
        console.log('API failed, using mock data');
        const mockPlans = [
          {
            id: 1,
            name: "Healthy Week Plan",
            start_date: "2025-09-06",
            end_date: "2025-09-12",
            target_calories: 2000,
            total_days: 7,
            created_at: "2025-09-06T10:00:00Z",
            days: [
              {
                day: 1,
                date: "2025-09-06",
                totalCalories: 1980,
                totalProtein: 120,
                totalCarbs: 200,
                totalFat: 65,
                meals: [
                  {
                    meal_type: "breakfast",
                    recipe_name: "Oatmeal with Berries",
                    calories: 350,
                    protein: 12,
                    carbs: 65,
                    fat: 8,
                    servings: 1
                  },
                  {
                    meal_type: "lunch", 
                    recipe_name: "Grilled Chicken Salad",
                    calories: 520,
                    protein: 45,
                    carbs: 25,
                    fat: 22,
                    servings: 1
                  },
                  {
                    meal_type: "dinner",
                    recipe_name: "Salmon with Quinoa",
                    calories: 680,
                    protein: 40,
                    carbs: 55,
                    fat: 25,
                    servings: 1
                  },
                  {
                    meal_type: "snack",
                    recipe_name: "Greek Yogurt with Nuts",
                    calories: 430,
                    protein: 23,
                    carbs: 55,
                    fat: 10,
                    servings: 1
                  }
                ]
              }
            ]
          },
          {
            id: 2,
            name: "High Protein Focus",
            start_date: "2025-09-13",
            end_date: "2025-09-19",
            target_calories: 2200,
            total_days: 7,
            created_at: "2025-09-05T15:30:00Z",
            days: []
          }
        ];
        setMealPlans(mockPlans);
        return;
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      setMealPlans(data.mealPlans || []);
    } catch (error) {
      console.error('Error loading meal plans:', error);
      setMealPlansError(`Error: ${error.message}`);
    } finally {
      setMealPlansLoading(false);
    }
  };

  const handleGenerateMealPlan = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setGenerationError('');
    setGenerationSuccess(false);

    try {
      const response = await fetch('/api/generate-meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetCalories: generationForm.targetCalories,
          days: generationForm.days,
          preferences: generationForm.preferences
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate meal plan');
      }

      const data = await response.json();
      setGenerationSuccess(true);
      
      // Route to plans view after generation
      if (!hasExternalNav) {
        // Internal navigation - switch views directly
        setInternalView('plans');
      } else if (onViewChange) {
        // External navigation - use callback
        
        setTimeout(() => {
          onViewChange('plans');
        }, 1500); // 500ms delay
      }
      
      // Reset viewing state to show plans list
      setViewingPlan(false);
      setSelectedMealPlan(null);
      
      // Load the updated plans list (which will include the new plan)
      loadMealPlans();

    } catch (error) {
      setGenerationError(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const getMealIcon = (mealType) => {
    switch (mealType?.toLowerCase()) {
      case 'breakfast': return <Coffee size={16} className="text-orange-500" />;
      case 'lunch': return <Sandwich size={16} className="text-blue-500" />;
      case 'dinner': return <Soup size={16} className="text-purple-500" />;
      case 'snack': 
      case 'snacks': return <Utensils size={16} className="text-green-500" />;
      default: return <Utensils size={16} className="text-gray-500" />;
    }
  };

  const formatMealType = (type) => {
    return type?.charAt(0).toUpperCase() + type?.slice(1) || 'Unknown';
  };

  // Internal Navigation component (only shown when no external navigation)
  const Navigation = () => !hasExternalNav && (
    <nav className="bg-white/95 border-b border-emerald-200 shadow-sm sticky top-0 z-40 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            🥗 Meal Planner
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setInternalView('generate')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentView === 'generate'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Plus size={18} />
              Generate Plan
            </button>
            <button
              onClick={() => setInternalView('plans')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentView === 'plans'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <List size={18} />
              My Plans
            </button>
            <button
              onClick={() => setInternalView('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentView === 'analytics'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <BarChart3 size={18} />
              Analytics
            </button>
          </div>
        </div>
      </div>
    </nav>
  );

  // Generation View
  const GenerationView = () => (
    <div className="w-full max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent mb-4">
          Generate Meal Plan
        </h1>
        <p className="text-lg md:text-xl text-emerald-900 max-w-xl mx-auto">
          Create personalized meal plans based on your calorie goals and recipe collection.
        </p>
      </div>

      <div className="bg-white/90 border border-emerald-300 rounded-2xl shadow-lg p-8">
        {/* Target Calories */}
        <div className="mb-6">
          <label className="block text-lg font-semibold text-emerald-700 mb-3">
            <Target size={20} className="inline mr-2" />
            Daily Calorie Target
          </label>
          <div className="relative">
            <input
              type="number"
              value={generationForm.targetCalories}
              onChange={(e) => setGenerationForm(prev => ({
                ...prev,
                targetCalories: parseInt(e.target.value) || 2000
              }))}
              min="1200"
              max="4000"
              step="50"
              className="w-full p-4 border-2 border-emerald-200 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 transition-all duration-200 bg-emerald-50 text-lg font-semibold"
            />
            <span className="absolute right-4 top-4 text-emerald-600 font-medium">calories</span>
          </div>
          <div className="mt-2 flex gap-2">
            {[1500, 2000, 2500, 3000].map(cal => (
              <button
                key={cal}
                type="button"
                onClick={() => setGenerationForm(prev => ({ ...prev, targetCalories: cal }))}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                  generationForm.targetCalories === cal
                    ? 'bg-emerald-500 text-white'
                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                }`}
              >
                {cal}
              </button>
            ))}
          </div>
        </div>

        {/* Number of Days */}
        <div className="mb-6">
          <label className="block text-lg font-semibold text-emerald-700 mb-3">
            <Calendar size={20} className="inline mr-2" />
            Plan Duration
          </label>
          <select
            value={generationForm.days}
            onChange={(e) => setGenerationForm(prev => ({
              ...prev,
              days: parseInt(e.target.value)
            }))}
            className="w-full p-4 border-2 border-emerald-200 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 transition-all duration-200 bg-emerald-50 text-lg"
          >
            <option value={3}>3 Days</option>
            <option value={5}>5 Days (Weekdays)</option>
            <option value={7}>7 Days (1 Week)</option>
          </select>
        </div>

        {/* Diet Preferences */}
        <div className="mb-6">
          <label className="block text-lg font-semibold text-emerald-700 mb-3">
            <Settings size={20} className="inline mr-2" />
            Diet Preferences
          </label>
          <select
            value={generationForm.preferences.dietType}
            onChange={(e) => setGenerationForm(prev => ({
              ...prev,
              preferences: { ...prev.preferences, dietType: e.target.value }
            }))}
            className="w-full p-4 border-2 border-emerald-200 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 transition-all duration-200 bg-emerald-50"
          >
            <option value="balanced">Balanced Diet</option>
            <option value="high-protein">High Protein</option>
            <option value="low-carb">Low Carb</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="keto">Ketogenic</option>
            <option value="mediterranean">Mediterranean</option>
          </select>
        </div>

        {/* Status Messages */}
        {generationError && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
            <div className="flex items-center">
              <AlertCircle size={20} className="text-red-500 mr-2" />
              <p className="text-red-700 font-medium">{generationError}</p>
            </div>
          </div>
        )}

        {generationSuccess && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-xl">
            <div className="flex items-center">
              <CheckCircle size={20} className="text-green-500 mr-2" />
              <p className="text-green-700 font-medium">
                Meal plan generated successfully! Redirecting to your plans...
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleGenerateMealPlan}
          disabled={generating}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:from-emerald-600 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
        >
          {generating ? (
            <div className="flex items-center justify-center">
              <Loader2 className="animate-spin h-6 w-6 mr-3" />
              Generating Your Meal Plan...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <ChefHat className="h-6 w-6 mr-3" />
              Generate Meal Plan
            </div>
          )}
        </button>
      </div>

      {/* Quick Tips */}
      <div className="mt-8 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-emerald-800 mb-3 flex items-center">
          <TrendingUp size={20} className="mr-2" />
          Tips for Better Meal Plans
        </h3>
        <ul className="space-y-2 text-emerald-700">
          <li>• Make sure you have at least 10-15 saved recipes for variety</li>
          <li>• Include recipes with different cooking times for flexibility</li>
          <li>• Mix easy, medium, and complex recipes for balanced planning</li>
          <li>• Your meal plans will automatically balance macronutrients</li>
        </ul>
      </div>
    </div>
  );

  // Plans List View
  const PlansListView = () => (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      {!viewingPlan ? (
        <>
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent mb-4">
              My Meal Plans
            </h1>
            <p className="text-lg md:text-xl text-emerald-900">
              View and manage all your generated meal plans
            </p>
          </div>

          {mealPlansLoading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-emerald-500 mr-3" />
              <span className="text-emerald-700">Loading meal plans...</span>
            </div>
          )}

          {mealPlansError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-xl">
              <p className="text-red-700 font-medium">Error: {mealPlansError}</p>
            </div>
          )}

          {!mealPlansLoading && !mealPlansError && mealPlans.length === 0 && (
            <div className="text-center py-12">
              <div className="mb-4">
                <Calendar size={64} className="mx-auto text-emerald-300" />
              </div>
              <h3 className="text-xl font-semibold text-emerald-700 mb-2">No meal plans yet</h3>
              <p className="text-emerald-600 mb-6">Generate your first personalized meal plan!</p>
              <button
                onClick={() => hasExternalNav ? onViewChange('generate') : setInternalView('generate')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all duration-200"
              >
                <Plus size={20} />
                Generate Your First Plan
              </button>
            </div>
          )}

          {!mealPlansLoading && mealPlans.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mealPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white/90 border border-emerald-200 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {plan.name}
                    </h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>📅 {plan.start_date} to {plan.end_date}</div>
                      <div>🎯 {plan.target_calories} calories/day</div>
                      <div>📊 {plan.total_days} days total</div>
                    </div>
                  </div>

                  {/* Plan Summary */}
                  <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-emerald-800">Avg Calories</div>
                        <div className="text-emerald-600 font-bold">
                          {plan.days?.length > 0 
                            ? Math.round(plan.days.reduce((sum, day) => sum + day.totalCalories, 0) / plan.days.length)
                            : plan.target_calories
                          }
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-emerald-800">Days Left</div>
                        <div className="text-emerald-600 font-bold">
                          {Math.max(0, Math.ceil((new Date(plan.end_date) - new Date()) / (1000 * 60 * 60 * 24)))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedMealPlan(plan);
                        setViewingPlan(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all duration-200 text-sm"
                    >
                      <Eye size={14} />
                      View Plan
                    </button>
                    <button
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all duration-200 text-sm"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    Created: {new Date(plan.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <PlanDetailView />
      )}
    </div>
  );

  // Plan Detail View
  const PlanDetailView = () => (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{selectedMealPlan?.name}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
            <span>🎯 {selectedMealPlan?.target_calories} cal/day</span>
            <span>📅 {selectedMealPlan?.total_days} days</span>
            <span>📍 {selectedMealPlan?.start_date} - {selectedMealPlan?.end_date}</span>
          </div>
        </div>
        <button
          onClick={() => setViewingPlan(false)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200"
        >
          <X size={16} />
          Back to Plans
        </button>
      </div>

      {/* Daily Meal Plans */}
      <div className="space-y-6">
        {selectedMealPlan?.days?.map((day) => (
          <div
            key={day.day}
            className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  Day {day.day} - {new Date(day.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </h3>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-600">{day.totalCalories} cal</div>
                <div className="text-sm text-gray-600">
                  P: {day.totalProtein}g | C: {day.totalCarbs}g | F: {day.totalFat}g
                </div>
              </div>
            </div>

            {/* Meals Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {day.meals?.map((meal, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50 border border-gray-100 rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    {getMealIcon(meal.meal_type)}
                    <span className="font-semibold text-gray-800">
                      {formatMealType(meal.meal_type)}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                      {meal.recipe_name}
                    </h4>
                    {meal.servings && meal.servings !== 1 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {meal.servings} serving{meal.servings > 1 ? 's' : ''}
                      </p>
                    )}
                    {meal.is_simple_food && (
                      <p className="text-xs text-blue-600 mt-1">Simple food</p>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="font-semibold text-gray-800">{meal.calories} cal</div>
                    <div>P: {meal.protein}g</div>
                    <div>C: {meal.carbs}g</div>
                    <div>F: {meal.fat}g</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Analytics View
  const AnalyticsView = () => (
    <div className="w-full max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent mb-4">
          Nutrition Analytics
        </h1>
        <p className="text-lg md:text-xl text-emerald-900">
          Track your meal planning progress and nutrition trends
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/90 border border-emerald-200 rounded-2xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-emerald-600 mb-2">{mealPlans.length}</div>
          <div className="text-emerald-700 font-medium">Total Meal Plans</div>
        </div>
        <div className="bg-white/90 border border-emerald-200 rounded-2xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-emerald-600 mb-2">
            {mealPlans.reduce((sum, plan) => sum + (plan.total_days || 0), 0)}
          </div>
          <div className="text-emerald-700 font-medium">Days Planned</div>
        </div>
        <div className="bg-white/90 border border-emerald-200 rounded-2xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-emerald-600 mb-2">
            {mealPlans.length > 0 
              ? Math.round(mealPlans.reduce((sum, plan) => sum + plan.target_calories, 0) / mealPlans.length)
              : 0
            }
          </div>
          <div className="text-emerald-700 font-medium">Avg Daily Calories</div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-8 text-center">
        <PieChart size={48} className="mx-auto text-emerald-400 mb-4" />
        <h3 className="text-xl font-semibold text-emerald-800 mb-2">
          Advanced Analytics Coming Soon
        </h3>
        <p className="text-emerald-700">
          Detailed nutrition tracking, progress charts, and meal pattern analysis will be available soon.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-100 via-emerald-200 to-teal-300">
      <Navigation />
      
      <main>
        {currentView === 'generate' && <GenerationView />}
        {currentView === 'plans' && <PlansListView />}
        {currentView === 'analytics' && <AnalyticsView />}
      </main>

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

