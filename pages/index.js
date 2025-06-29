import { useState } from 'react';
import Head from 'next/head';

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

    return (
    <>
      <Head>
        <title>AI Recipe Calorie Calculator</title>
        <meta name="description" content="Calculate calories in your recipes using AI and nutritional databases" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mint-100 via-mint-200 to-mint-300">
        <div className="w-full max-w-2xl mx-auto px-4 py-10 flex flex-col items-center">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-mint-600 to-green-500 bg-clip-text text-transparent mb-4">
              🥗 AI Recipe Calorie Calculator
            </h1>
            <p className="text-lg md:text-xl text-mint-900 max-w-xl mx-auto">
              Paste your recipe and let AI parse the ingredients while we fetch accurate nutritional data.
            </p>
          </div>

          {/* Main Form */}
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
                'Calculate Calories with AI'
              )}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="w-full bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-xl text-center">
              <p className="text-red-700 font-medium">Error: {error}</p>
            </div>
          )}

          {/* Results */}
          {results && (
  <div className="w-full bg-white/90 border border-earthy-200 rounded-2xl shadow-lg p-6 md:p-10 animate-slide-up flex flex-col items-center">
    <h2 className="text-2xl md:text-3xl font-bold text-earthy-800 mb-8 text-center">
      Nutritional Breakdown
    </h2>

    {/* Total Calories & Nutrients */}
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

    {/* Ingredient List */}
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
        </div>
      </div>
    </>
  );
}