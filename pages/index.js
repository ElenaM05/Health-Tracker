import { useState, useEffect } from 'react';
import { Save, Clock, Users, ChefHat, X, Check, AlertCircle, Loader2, Plus, List, Eye, Calculator, Link, Edit3, Globe } from 'lucide-react';

export default function RecipeApp() {
  // Navigation state
  const [currentView, setCurrentView] = useState('input');
  
  // Input method state
  const [inputMethod, setInputMethod] = useState('manual'); // 'manual' or 'url'
  
  // Recipe input form state
  const [recipe, setRecipe] = useState('');
  const [recipeUrl, setRecipeUrl] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Saved recipes state
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipesError, setRecipesError] = useState('');
  
  // Save recipe modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  
  // Recipe metadata form state
  const [recipeData, setRecipeData] = useState({
    name: '',
    description: '',
    servings: 4,
    cooking_time: null,
    difficulty: 'medium'
  });

  // Load saved recipes when switching to recipes view
  useEffect(() => {
    if (currentView === 'recipes') {
      loadSavedRecipes();
    }
  }, [currentView]);

  const loadSavedRecipes = async () => {
    setRecipesLoading(true);
    setRecipesError('');
    
    try {
      const response = await fetch('/api/get-recipes');
      if (!response.ok) {
        throw new Error('Failed to load recipes');
      }
      const data = await response.json();
      setSavedRecipes(data.recipes || []);
    } catch (error) {
      setRecipesError(error.message);
    } finally {
      setRecipesLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!recipe.trim()) return;

    setLoading(true);
    setError('');
    setResults(null);
    
    try {
      // Parse the recipe to extract ingredients
      const parseResponse = await fetch('/api/parse-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe }),
      });

      if (!parseResponse.ok) {
        throw new Error('Failed to parse recipe');
      }

      const parseData = await parseResponse.json();
      
      // Get nutrition data
      const nutritionResponse = await fetch('/api/get-nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: parseData.ingredients }),
      });

      if (!nutritionResponse.ok) {
        throw new Error('Failed to get nutrition data');
      }

      const nutritionData = await nutritionResponse.json();
      
      // Format results
      const formattedResults = {
        totalCalories: nutritionData.totalCalories || 0,
        totalNutrients: {
          protein: nutritionData.totalNutrients?.protein || 0,
          carbs: nutritionData.totalNutrients?.carbs || 0,
          fat: nutritionData.totalNutrients?.fat || 0,
          fiber: nutritionData.totalNutrients?.fiber || 0,
          sugar: nutritionData.totalNutrients?.sugar || 0,
          sodium: nutritionData.totalNutrients?.sodium || 0
        },
        ingredients: nutritionData.ingredients.map(ingredient => ({
          name: ingredient.name,
          original: ingredient.original,
          calories: ingredient.nutrition ? Math.round(ingredient.nutrition.calories) : 0,
          nutrients: ingredient.nutrition ? {
            protein: Math.round((ingredient.nutrition.protein || 0) * 10) / 10,
            fat: Math.round((ingredient.nutrition.fat || 0) * 10) / 10,
            carbs: Math.round((ingredient.nutrition.carbs || 0) * 10) / 10,
            fiber: Math.round((ingredient.nutrition.fiber || 0) * 10) / 10,
            sugar: Math.round((ingredient.nutrition.sugar || 0) * 10) / 10,
            sodium: Math.round(ingredient.nutrition.sodium || 0)
          } : null,
          estimated: !ingredient.nutrition
        })),
        source: 'api-calculated'
      };

      setResults(formattedResults);
      
      // Auto-extract recipe name
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

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!recipeUrl.trim()) return;

    setLoading(true);
    setError('');
    setResults(null);
    
    try {
      // Parse recipe from URL - this now includes nutrition detection
      const parseResponse = await fetch('/api/parse-url-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: recipeUrl.trim() }),
      });

      if (!parseResponse.ok) {
        throw new Error('Failed to parse recipe from URL');
      }

      const parseData = await parseResponse.json();
      const urlRecipe = parseData.recipe;
      
      // Set recipe metadata from URL extraction
      setRecipeData(prev => ({
        ...prev,
        name: urlRecipe.name || '',
        description: urlRecipe.description || '',
        servings: urlRecipe.servings || 4,
        cooking_time: urlRecipe.cookingTime || urlRecipe.totalTime || null,
        difficulty: urlRecipe.difficulty || 'medium'
      }));

      // Set the recipe text for potential manual editing
      setRecipe(urlRecipe.recipeText || '');

      // Check if nutrition data was already found on the site
      if (parseData.hasExistingNutrition && parseData.nutritionResults) {
        // Use the nutrition data from the website
        const formattedResults = {
          ...parseData.nutritionResults,
          source: 'website-extracted',
          siteNutrition: true
        };
        setResults(formattedResults);
      } else {
        // No nutrition data found - need to calculate it
        if (urlRecipe.ingredients && urlRecipe.ingredients.length > 0) {
          // Parse ingredients and get nutrition
          const parseIngredientResponse = await fetch('/api/parse-recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipe: urlRecipe.recipeText }),
          });

          if (!parseIngredientResponse.ok) {
            throw new Error('Failed to parse ingredients');
          }

          const ingredientData = await parseIngredientResponse.json();
          
          // Get nutrition data
          const nutritionResponse = await fetch('/api/get-nutrition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredients: ingredientData.ingredients }),
          });

          if (!nutritionResponse.ok) {
            throw new Error('Failed to get nutrition data');
          }

          const nutritionData = await nutritionResponse.json();
          
          // Format results
          const formattedResults = {
            totalCalories: nutritionData.totalCalories || 0,
            totalNutrients: {
              protein: nutritionData.totalNutrients?.protein || 0,
              carbs: nutritionData.totalNutrients?.carbs || 0,
              fat: nutritionData.totalNutrients?.fat || 0,
              fiber: nutritionData.totalNutrients?.fiber || 0,
              sugar: nutritionData.totalNutrients?.sugar || 0,
              sodium: nutritionData.totalNutrients?.sodium || 0
            },
            ingredients: nutritionData.ingredients.map(ingredient => ({
              name: ingredient.name,
              original: ingredient.original,
              calories: ingredient.nutrition ? Math.round(ingredient.nutrition.calories) : 0,
              nutrients: ingredient.nutrition ? {
                protein: Math.round((ingredient.nutrition.protein || 0) * 10) / 10,
                fat: Math.round((ingredient.nutrition.fat || 0) * 10) / 10,
                carbs: Math.round((ingredient.nutrition.carbs || 0) * 10) / 10,
                fiber: Math.round((ingredient.nutrition.fiber || 0) * 10) / 10,
                sugar: Math.round((ingredient.nutrition.sugar || 0) * 10) / 10,
                sodium: Math.round(ingredient.nutrition.sodium || 0)
              } : null,
              estimated: !ingredient.nutrition
            })),
            source: 'api-calculated'
          };

          setResults(formattedResults);
        } else {
          throw new Error('No ingredients found in the recipe URL');
        }
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
      const ingredientsFormatted = results.ingredients.map(ingredient => ({
        name: ingredient.name,
        amount: 100,
        unit: 'g',
        original: ingredient.original,
        originalAmount: 100,
        originalUnit: 'g',
        nutrition: ingredient.nutrients
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipePayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save recipe');
      }

      setSaveStatus('success');
      
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
        if (currentView === 'recipes') {
          loadSavedRecipes();
        }
      }, 2000);

    } catch (error) {
      console.error('Error saving recipe:', error);
      setSaveStatus('error');
      setSaveErrorMessage(error.message || 'Failed to save recipe');
    }
  };

  // Navigation component
  const Navigation = () => (
    <nav className="bg-white/95 border-b border-green-200 shadow-sm sticky top-0 z-40 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
            🥗 Calorie Calculator
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setCurrentView('input')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentView === 'input'
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'text-green-700 hover:bg-green-100'
              }`}
            >
              <Calculator size={18} />
              Calculate
            </button>
            <button
              onClick={() => setCurrentView('recipes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentView === 'recipes'
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'text-green-700 hover:bg-green-100'
              }`}
            >
              <List size={18} />
              My Recipes
            </button>
          </div>
        </div>
      </div>
    </nav>
  );

  // Recipe Input View
  const RecipeInputView = () => (
    <div className="w-full max-w-2xl mx-auto px-4 py-10 flex flex-col items-center">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent mb-4">
          Calculate Nutrition
        </h1>
        <p className="text-lg md:text-xl text-green-900 max-w-xl mx-auto">
          Enter a recipe URL or paste your recipe text to get accurate nutritional data.
        </p>
      </div>

      {/* Input Method Toggle */}
      <div className="flex bg-green-100 rounded-lg p-1 mb-6">
        <button
          onClick={() => setInputMethod('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
            inputMethod === 'manual'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-green-600 hover:text-green-700'
          }`}
        >
          <Edit3 size={16} />
          Manual Entry
        </button>
        <button
          onClick={() => setInputMethod('url')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
            inputMethod === 'url'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-green-600 hover:text-green-700'
          }`}
        >
          <Link size={16} />
          Recipe URL
        </button>
      </div>

      {/* Manual Entry Form */}
      {inputMethod === 'manual' && (
        <form
          onSubmit={handleManualSubmit}
          className="w-full bg-white/90 border border-green-300 rounded-2xl shadow-lg p-8 mb-8 flex flex-col items-center"
        >
          <div className="mb-6 w-full">
            <label
              htmlFor="recipe"
              className="block text-lg font-semibold text-green-700 mb-3 text-center"
            >
              Enter Your Recipe
            </label>
            <textarea
              id="recipe"
              value={recipe}
              onChange={(e) => setRecipe(e.target.value)}
              className="w-full h-40 p-4 border-2 border-green-200 rounded-xl focus:border-green-400 focus:ring-2 focus:ring-green-200 transition-all duration-200 resize-none bg-green-50"
              placeholder="Paste your recipe here..."
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !recipe.trim()}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-400 text-white py-3 px-8 rounded-xl font-semibold text-lg hover:from-green-600 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="animate-spin h-6 w-6 mr-3" />
                Analyzing Recipe...
              </div>
            ) : (
              'Calculate Calories'
            )}
          </button>
        </form>
      )}

      {/* URL Entry Form */}
      {inputMethod === 'url' && (
        <form
          onSubmit={handleUrlSubmit}
          className="w-full bg-white/90 border border-green-300 rounded-2xl shadow-lg p-8 mb-8 flex flex-col items-center"
        >
          <div className="mb-6 w-full">
            <label
              htmlFor="recipeUrl"
              className="block text-lg font-semibold text-green-700 mb-3 text-center"
            >
              Enter Recipe URL
            </label>
            <input
              id="recipeUrl"
              type="url"
              value={recipeUrl}
              onChange={(e) => setRecipeUrl(e.target.value)}
              className="w-full p-4 border-2 border-green-200 rounded-xl focus:border-green-400 focus:ring-2 focus:ring-green-200 transition-all duration-200 bg-green-50"
              placeholder="https://example.com/recipe-page"
              required
            />
            <p className="text-sm text-green-600 mt-2 text-center">
              Works with most popular recipe websites like AllRecipes, Food Network, BBC Good Food, etc.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !recipeUrl.trim()}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-400 text-white py-3 px-8 rounded-xl font-semibold text-lg hover:from-green-600 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="animate-spin h-6 w-6 mr-3" />
                Fetching Recipe...
              </div>
            ) : (
              'Parse Recipe from URL'
            )}
          </button>
        </form>
      )}

      {error && (
        <div className="w-full bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-xl text-center">
          <p className="text-red-700 font-medium">Error: {error}</p>
        </div>
      )}

      {results && (
        <div className="w-full bg-white/90 border border-gray-200 rounded-2xl shadow-lg p-6 md:p-10 animate-slide-up flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                Nutritional Breakdown
              </h2>
              {results.siteNutrition && (
                <div className="flex items-center gap-2 mt-2">
                  <Globe size={16} className="text-blue-500" />
                  <span className="text-sm text-blue-600 font-medium">
                    Nutrition data extracted from website
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200"
            >
              <Save size={16} />
              Save Recipe
            </button>
          </div>

          <div className="w-full flex flex-col items-center">
            <div className="w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-center gap-4 mb-8 shadow">
              <div className="flex flex-col items-center justify-center md:mr-8 mb-4 md:mb-0">
                <span className="text-lg font-bold text-gray-900">Total Calories</span>
                <span className="text-4xl font-extrabold text-gray-900">{results.totalCalories}</span>
                {results.perServing && (
                  <span className="text-sm text-gray-600">
                    ({results.perServing.calories} per serving)
                  </span>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
                  <span className="font-semibold">Protein:</span>
                  <div>{results.totalNutrients.protein}g</div>
                  {results.perServing && (
                    <div className="text-xs text-gray-500">({results.perServing.protein}g/serving)</div>
                  )}
                </div>
                <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
                  <span className="font-semibold">Fat:</span>
                  <div>{results.totalNutrients.fat}g</div>
                  {results.perServing && (
                    <div className="text-xs text-gray-500">({results.perServing.fat}g/serving)</div>
                  )}
                </div>
                <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
                  <span className="font-semibold">Carbs:</span>
                  <div>{results.totalNutrients.carbs}g</div>
                  {results.perServing && (
                    <div className="text-xs text-gray-500">({results.perServing.carbs}g/serving)</div>
                  )}
                </div>
                <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
                  <span className="font-semibold">Fiber:</span>
                  <div>{results.totalNutrients.fiber}g</div>
                  {results.perServing && (
                    <div className="text-xs text-gray-500">({results.perServing.fiber}g/serving)</div>
                  )}
                </div>
                <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
                  <span className="font-semibold">Sugar:</span>
                  <div>{results.totalNutrients.sugar}g</div>
                  {results.perServing && (
                    <div className="text-xs text-gray-500">({results.perServing.sugar}g/serving)</div>
                  )}
                </div>
                <div className="bg-white rounded-lg px-4 py-2 shadow text-center min-w-[90px]">
                  <span className="font-semibold">Sodium:</span>
                  <div>{results.totalNutrients.sodium}mg</div>
                  {results.perServing && (
                    <div className="text-xs text-gray-500">({results.perServing.sodium}mg/serving)</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Ingredients</h3>
            {results.ingredients.map((ingredient, index) => (
              <div
                key={index}
                className="flex flex-col md:flex-row md:justify-between md:items-center bg-gray-50 border border-gray-200 p-4 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <div>
                  <h4 className="font-semibold text-gray-900 capitalize">{ingredient.name}</h4>
                  <p className="text-sm text-gray-700 mb-2">{ingredient.original}</p>
                  {ingredient.nutrients && (
                    <div className="flex flex-wrap gap-3 text-xs text-gray-700">
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
                  <span className="text-xl font-bold text-gray-700">
                    {ingredient.calories ?? '—'}
                  </span>
                  <p className="text-sm text-gray-700">calories</p>
                  {ingredient.estimated && (
                    <p className="text-xs text-orange-500 mt-1">*estimated</p>
                  )}
                  {ingredient.fromSite && (
                    <p className="text-xs text-blue-500 mt-1">*from site</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-gray-100 rounded-lg w-full text-center">
            <p className="text-sm text-gray-800">
              <strong>Note:</strong> 
              {results.siteNutrition 
                ? " Nutritional data extracted from the recipe website."
                : " Nutritional data is provided by CalorieNinjas API. Items marked as 'estimated' use fallback calculations when specific data isn't available."
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // Recipes List View
  const RecipesListView = () => (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent mb-4">
          My Recipes
        </h1>
        <p className="text-lg md:text-xl text-green-900">
          View all your saved recipes and their nutritional information
        </p>
      </div>

      {recipesLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-green-500 mr-3" />
          <span className="text-green-700">Loading recipes...</span>
        </div>
      )}

      {recipesError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-xl text-center">
          <p className="text-red-700 font-medium">Error: {recipesError}</p>
        </div>
      )}

      {!recipesLoading && !recipesError && savedRecipes.length === 0 && (
        <div className="text-center py-12">
          <div className="mb-4">
            <ChefHat size={64} className="mx-auto text-green-300" />
          </div>
          <h3 className="text-xl font-semibold text-green-700 mb-2">No recipes yet</h3>
          <p className="text-green-600 mb-6">Start by calculating nutrition for your first recipe!</p>
          <button
            onClick={() => setCurrentView('input')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200"
          >
            <Plus size={20} />
            Add Your First Recipe
          </button>
        </div>
      )}

      {!recipesLoading && savedRecipes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white/90 border border-green-200 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                  {recipe.name}
                </h3>
                {recipe.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {recipe.description}
                  </p>
                )}
              </div>

              {/* Recipe Stats */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center bg-gray-100 rounded-lg p-3">
                  <span className="font-semibold text-gray-800">Calories per serving</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {Math.round((recipe.total_calories || 0) / (recipe.servings || 1))}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Users size={14} />
                    <span>{recipe.servings || 1} servings</span>
                  </div>
                  {recipe.cooking_time && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock size={14} />
                      <span>{recipe.cooking_time} min</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-700">
                    <ChefHat size={14} />
                    <span className="capitalize">{recipe.difficulty}</span>
                  </div>
                  <div className="text-gray-700">
                    Total: {recipe.total_calories || 0} cal
                  </div>
                </div>
              </div>

              {/* Nutrition Summary */}
              <div className="border-t border-gray-200 pt-3">
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  <div>
                    <div className="font-semibold text-gray-800">Protein</div>
                    <div className="text-gray-600">{Math.round((recipe.total_protein || 0) / (recipe.servings || 1))}g</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">Carbs</div>
                    <div className="text-gray-600">{Math.round((recipe.total_carbs || 0) / (recipe.servings || 1))}g</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">Fat</div>
                    <div className="text-gray-600">{Math.round((recipe.total_fat || 0) / (recipe.servings || 1))}g</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setRecipe(recipe.original_text || '');
                    setCurrentView('input');
                    setInputMethod('manual');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all duration-200 text-sm"
                >
                  <Eye size={14} />
                  View & Edit
                </button>
              </div>

              <div className="mt-2 text-xs text-gray-500">
                Created: {new Date(recipe.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-green-200 to-green-300">
      <Navigation />
      
      <main>
        {currentView === 'input' ? <RecipeInputView /> : <RecipesListView />}
      </main>

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

      <style jsx>{`
        .animate-slide-up {
          animation: slideUp 0.5s ease-out;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
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