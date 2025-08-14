/*import { useState } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [recipe, setRecipe] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipe.trim()) return;

    setLoading(true);
    setError('');
    setResults(null);
    
    try {
      // Step 1: Parse recipe with AI
      const parseResponse = await fetch('/api/parse-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipe }),
      });

      if (!parseResponse.ok) {
        throw new Error('Failed to parse recipe');
      }

      const { ingredients } = await parseResponse.json();

      // Step 2: Get nutrition data
      const nutritionResponse = await fetch('/api/get-nutrition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients }),
      });

      if (!nutritionResponse.ok) {
        throw new Error('Failed to get nutrition data');
      }

      const nutritionData = await nutritionResponse.json();
      setResults(nutritionData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  const saveToSupabase = async () => {
  if (!results || !recipe.trim()) return;
  
  const { data, error } = await supabase
    .from('recipes') // replace with your table name
    .insert([
      {
        recipe_text: recipe,
        results: results, // saves the nutrition data as JSON
      }
    ]);

  if (error) {
    console.error('Error saving to Supabase:', error.message);
  } else {
    console.log('Saved to Supabase:', data);
    alert('Recipe saved!');
  }
};

    return (
    <>
      <Head>
        <title>Calorie Calculator</title>
        <meta name="description" content="Calculate calories in your recipes using AI and nutritional databases" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mint-100 via-mint-200 to-mint-300">
        <div className="w-full max-w-2xl mx-auto px-4 py-10 flex flex-col items-center">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-mint-600 to-green-500 bg-clip-text text-transparent mb-4">
              🥗 Calorie Calculator
            </h1>
            <p className="text-lg md:text-xl text-mint-900 max-w-xl mx-auto">
              Paste your recipe and we will fetch accurate nutritional data.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="w-full bg-white/90 border border-mint-300 rounded-2xl shadow-lg p-8 mb-8 flex flex-col items-center"
          >
            <div className="mb-6 w-full">
              <label
                htmlFor="recipe"
                className="block text-lg font-semibold text-mint-700 mb-3 text-center"
              >
                Enter Your Recipe
              </label>
              <textarea
                id="recipe"
                value={recipe}
                onChange={(e) => setRecipe(e.target.value)}
                className="w-full h-40 p-4 border-2 border-mint-200 rounded-xl focus:border-mint-400 focus:ring-2 focus:ring-mint-200 transition-all duration-200 resize-none bg-mint-50"
                placeholder="Paste your recipe here..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !recipe.trim()}
              className="w-full bg-gradient-to-r from-mint-500 to-green-400 text-white py-3 px-8 rounded-xl font-semibold text-lg hover:from-mint-600 hover:to-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Analyzing Recipe...
                </div>
              ) : (
                'Calculate Calories'
              )}
            </button>
          </form>

          {error && (
            <div className="w-full bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-xl text-center">
              <p className="text-red-700 font-medium">Error: {error}</p>
            </div>
          )}

          {results && (
  <div className="w-full bg-white/90 border border-earthy-200 rounded-2xl shadow-lg p-6 md:p-10 animate-slide-up flex flex-col items-center">
    <h2 className="text-2xl md:text-3xl font-bold text-earthy-800 mb-8 text-center">
      Nutritional Breakdown
    </h2>

    <div className="w-full flex flex-col items-center">
      <div className="w-full bg-gradient-to-r from-earthy-200 to-earthy-300 rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-center gap-4 mb-8 shadow">
        <div className="flex flex-col items-center justify-center md:mr-8 mb-4 md:mb-0">
          <span className="text-lg font-bold text-earthy-900">Total Calories</span>
          <span className="text-4xl font-extrabold text-earthy-900">{results.totalCalories}</span>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
            <span className="font-semibold">Protein:</span>
            <div>{results.totalNutrients.protein}g</div>
          </div>
          <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
            <span className="font-semibold">Fat:</span>
            <div>{results.totalNutrients.fat}g</div>
          </div>
          <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
            <span className="font-semibold">Carbs:</span>
            <div>{results.totalNutrients.carbs}g</div>
          </div>
          <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
            <span className="font-semibold">Fiber:</span>
            <div>{results.totalNutrients.fiber}g</div>
          </div>
          <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
            <span className="font-semibold">Sugar:</span>
            <div>{results.totalNutrients.sugar}g</div>
          </div>
          <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
            <span className="font-semibold">Sodium:</span>
            <div>{results.totalNutrients.sodium}mg</div>
          </div>
        </div>
      </div>
    </div>

    <div className="space-y-4 w-full">
      <h3 className="text-lg font-semibold text-earthy-800 mb-4 text-center">Ingredients</h3>
      {results.ingredients.map((ingredient, index) => (
        <div
          key={index}
          className="flex flex-col md:flex-row md:justify-between md:items-center bg-earthy-50 border border-earthy-200 p-4 rounded-lg hover:bg-earthy-100 transition-colors duration-200"
        >
          <div>
            <h4 className="font-semibold text-earthy-900 capitalize">{ingredient.name}</h4>
            <p className="text-sm text-earthy-700 mb-2">{ingredient.original}</p>
            {ingredient.nutrients && (
              <div className="flex flex-wrap gap-3 text-xs text-earthy-700">
                <span>Protein: {ingredient.nutrients.protein}g</span>
                <span>Fat: {ingredient.nutrients.fat}g</span>
                <span>Carbs: {ingredient.nutrients.carbs}g</span>
                <span>Fiber: {ingredient.nutrients.fiber}g</span>
                <span>Sugar: {ingredient.nutrients.sugar}g</span>
                <span>Sodium: {ingredient.nutrients.sodium}mg</span>
              </div>
            )}
          </div>
          <div className="text-right mt-2 md:mt-0 min-w-[80px]">
            <span className="text-xl font-bold text-earthy-700">
              {ingredient.calories ?? '—'}
            </span>
            <p className="text-sm text-earthy-700">calories</p>
            {ingredient.estimated && (
              <p className="text-xs text-orange-500 mt-1">*estimated</p>
            )}
          </div>
        </div>
      ))}
    </div>

    <div className="mt-8 p-4 bg-earthy-100 rounded-lg w-full text-center">
      <p className="text-sm text-earthy-800">
        <strong>Note:</strong> Nutritional data is provided by CalorieNinjas API.
        Items marked as "estimated" use fallback calculations when specific data isn't available.
      </p>
    </div>
    <button
  onClick={saveToSupabase}
  className="mt-6 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition"
>
  Save to Database
</button>

  </div>
)}
        </div>
      </div>
    </>
  );
}
*/
import { useState } from 'react';
import Head from 'next/head';
import { Save, Clock, Users, ChefHat, X, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function Home() {
  const [recipe, setRecipe] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Save recipe modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null, 'saving', 'success', 'error'
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  
  // Recipe metadata form state
  const [recipeData, setRecipeData] = useState({
    name: '',
    description: '',
    servings: 4,
    cooking_time: null,
    difficulty: 'medium'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipe.trim()) return;

    setLoading(true);
    setError('');
    setResults(null);
    
    try {
      // Step 1: Parse recipe with AI
      const parseResponse = await fetch('/api/parse-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipe }),
      });

      if (!parseResponse.ok) {
        throw new Error('Failed to parse recipe');
      }

      const { ingredients } = await parseResponse.json();

      // Step 2: Get nutrition data
      const nutritionResponse = await fetch('/api/get-nutrition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients }),
      });

      if (!nutritionResponse.ok) {
        throw new Error('Failed to get nutrition data');
      }

      const nutritionData = await nutritionResponse.json();
      setResults(nutritionData);
      
      // Auto-extract recipe name from text if possible
      const lines = recipe.split('\n');
      const titleLine = lines.find(line => 
        !line.toLowerCase().includes('ingredients') && 
        !line.toLowerCase().includes('method') &&
        !line.toLowerCase().includes('instructions') &&
        !line.startsWith('*') && 
        line.trim().length > 0 &&
        line.trim().length < 100
      );
      if (titleLine) {
        setRecipeData(prev => ({ ...prev, name: titleLine.trim() }));
      }
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Save recipe to database
  const handleSaveRecipe = async () => {
    setSaveStatus('saving');
    setSaveErrorMessage('');
    
    try {
      // Convert results format to match expected API format
      const ingredientsFormatted = results.ingredients.map(ingredient => ({
        name: ingredient.name,
        amount: ingredient.amount || 100,
        unit: 'g',
        original: ingredient.original,
        originalAmount: ingredient.originalAmount || ingredient.amount || 100,
        originalUnit: ingredient.originalUnit || 'g',
        nutrition: ingredient.nutrients ? {
          calories: ingredient.calories || 0,
          protein: ingredient.nutrients.protein || 0,
          carbs: ingredient.nutrients.carbs || 0,
          fat: ingredient.nutrients.fat || 0,
          fiber: ingredient.nutrients.fiber || 0,
          sugar: ingredient.nutrients.sugar || 0,
          sodium: ingredient.nutrients.sodium || 0
        } : null
      }));

      const recipePayload = {
        ...recipeData,
        original_text: recipe,
        total_calories: results.totalCalories || 0,
        total_protein: results.totalNutrients.protein || 0,
        total_carbs: results.totalNutrients.carbs || 0,
        total_fat: results.totalNutrients.fat || 0,
        total_fiber: results.totalNutrients.fiber || 0,
        ingredients: ingredientsFormatted
      };

      const response = await fetch('/api/save-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipePayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save recipe');
      }

      const result = await response.json();
      setSaveStatus('success');
      
      // Reset form after successful save
      setTimeout(() => {
        setShowSaveModal(false);
        setSaveStatus(null);
        setRecipeData({
          name: '',
          description: '',
          servings: 4,
          cooking_time: null,
          difficulty: 'medium'
        });
      }, 2000);

    } catch (error) {
      console.error('Error saving recipe:', error);
      setSaveStatus('error');
      setSaveErrorMessage(error.message || 'Failed to save recipe');
    }
  };

  return (
    <>
      <Head>
        <title>Calorie Calculator</title>
        <meta name="description" content="Calculate calories in your recipes using AI and nutritional databases" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mint-100 via-mint-200 to-mint-300">
        <div className="w-full max-w-2xl mx-auto px-4 py-10 flex flex-col items-center">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-mint-600 to-green-500 bg-clip-text text-transparent mb-4">
              🥗 Calorie Calculator
            </h1>
            <p className="text-lg md:text-xl text-mint-900 max-w-xl mx-auto">
              Paste your recipe and we will fetch accurate nutritional data.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="w-full bg-white/90 border border-mint-300 rounded-2xl shadow-lg p-8 mb-8 flex flex-col items-center"
          >
            <div className="mb-6 w-full">
              <label
                htmlFor="recipe"
                className="block text-lg font-semibold text-mint-700 mb-3 text-center"
              >
                Enter Your Recipe
              </label>
              <textarea
                id="recipe"
                value={recipe}
                onChange={(e) => setRecipe(e.target.value)}
                className="w-full h-40 p-4 border-2 border-mint-200 rounded-xl focus:border-mint-400 focus:ring-2 focus:ring-mint-200 transition-all duration-200 resize-none bg-mint-50"
                placeholder="Paste your recipe here..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !recipe.trim()}
              className="w-full bg-gradient-to-r from-mint-500 to-green-400 text-white py-3 px-8 rounded-xl font-semibold text-lg hover:from-mint-600 hover:to-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Analyzing Recipe...
                </div>
              ) : (
                'Calculate Calories'
              )}
            </button>
          </form>

          {error && (
            <div className="w-full bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-xl text-center">
              <p className="text-red-700 font-medium">Error: {error}</p>
            </div>
          )}

          {results && (
            <div className="w-full bg-white/90 border border-earthy-200 rounded-2xl shadow-lg p-6 md:p-10 animate-slide-up flex flex-col items-center">
              <div className="w-full flex justify-between items-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-earthy-800">
                  Nutritional Breakdown
                </h2>
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200"
                >
                  <Save size={16} />
                  Save Recipe
                </button>
              </div>

              <div className="w-full flex flex-col items-center">
                <div className="w-full bg-gradient-to-r from-earthy-200 to-earthy-300 rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-center gap-4 mb-8 shadow">
                  <div className="flex flex-col items-center justify-center md:mr-8 mb-4 md:mb-0">
                    <span className="text-lg font-bold text-earthy-900">Total Calories</span>
                    <span className="text-4xl font-extrabold text-earthy-900">{results.totalCalories}</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                    <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
                      <span className="font-semibold">Protein:</span>
                      <div>{results.totalNutrients.protein}g</div>
                    </div>
                    <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
                      <span className="font-semibold">Fat:</span>
                      <div>{results.totalNutrients.fat}g</div>
                    </div>
                    <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
                      <span className="font-semibold">Carbs:</span>
                      <div>{results.totalNutrients.carbs}g</div>
                    </div>
                    <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
                      <span className="font-semibold">Fiber:</span>
                      <div>{results.totalNutrients.fiber}g</div>
                    </div>
                    <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
                      <span className="font-semibold">Sugar:</span>
                      <div>{results.totalNutrients.sugar}g</div>
                    </div>
                    <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
                      <span className="font-semibold">Sodium:</span>
                      <div>{results.totalNutrients.sodium}mg</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 w-full">
                <h3 className="text-lg font-semibold text-earthy-800 mb-4 text-center">Ingredients</h3>
                {results.ingredients.map((ingredient, index) => (
                  <div
                    key={index}
                    className="flex flex-col md:flex-row md:justify-between md:items-center bg-earthy-50 border border-earthy-200 p-4 rounded-lg hover:bg-earthy-100 transition-colors duration-200"
                  >
                    <div>
                      <h4 className="font-semibold text-earthy-900 capitalize">{ingredient.name}</h4>
                      <p className="text-sm text-earthy-700 mb-2">{ingredient.original}</p>
                      {ingredient.nutrients && (
                        <div className="flex flex-wrap gap-3 text-xs text-earthy-700">
                          <span>Protein: {ingredient.nutrients.protein}g</span>
                          <span>Fat: {ingredient.nutrients.fat}g</span>
                          <span>Carbs: {ingredient.nutrients.carbs}g</span>
                          <span>Fiber: {ingredient.nutrients.fiber}g</span>
                          <span>Sugar: {ingredient.nutrients.sugar}g</span>
                          <span>Sodium: {ingredient.nutrients.sodium}mg</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right mt-2 md:mt-0 min-w-[80px]">
                      <span className="text-xl font-bold text-earthy-700">
                        {ingredient.calories ?? '—'}
                      </span>
                      <p className="text-sm text-earthy-700">calories</p>
                      {ingredient.estimated && (
                        <p className="text-xs text-orange-500 mt-1">*estimated</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-earthy-100 rounded-lg w-full text-center">
                <p className="text-sm text-earthy-800">
                  <strong>Note:</strong> Nutritional data is provided by CalorieNinjas API.
                  Items marked as "estimated" use fallback calculations when specific data isn't available.
                </p>
              </div>
            </div>
          )}

          {/* Save Recipe Modal */}
          {showSaveModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="flex justify-between items-center p-6 border-b">
                  <h3 className="text-lg font-semibold">Save Recipe</h3>
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Recipe Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipe Name *
                    </label>
                    <input
                      type="text"
                      value={recipeData.name}
                      onChange={(e) => setRecipeData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter recipe name"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={recipeData.description}
                      onChange={(e) => setRecipeData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description (optional)"
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>

                  {/* Servings and Cooking Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Users size={16} className="inline mr-1" />
                        Servings
                      </label>
                      <input
                        type="number"
                        value={recipeData.servings}
                        onChange={(e) => setRecipeData(prev => ({ ...prev, servings: parseInt(e.target.value) || 1 }))}
                        min="1"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Clock size={16} className="inline mr-1" />
                        Time (min)
                      </label>
                      <input
                        type="number"
                        value={recipeData.cooking_time || ''}
                        onChange={(e) => setRecipeData(prev => ({ ...prev, cooking_time: e.target.value ? parseInt(e.target.value) : null }))}
                        placeholder="Optional"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <ChefHat size={16} className="inline mr-1" />
                      Difficulty
                    </label>
                    <select
                      value={recipeData.difficulty}
                      onChange={(e) => setRecipeData(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  {/* Status Messages */}
                  {saveStatus === 'error' && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
                      <AlertCircle size={16} />
                      <span className="text-sm">{saveErrorMessage}</span>
                    </div>
                  )}

                  {saveStatus === 'success' && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
                      <Check size={16} />
                      <span className="text-sm">Recipe saved successfully!</span>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    disabled={saveStatus === 'saving'}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRecipe}
                    disabled={!recipeData.name.trim() || saveStatus === 'saving'}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save Recipe
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
