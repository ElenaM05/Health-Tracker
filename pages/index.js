import { useState, useRef, useEffect } from 'react';
import CalorieTracker from './CalorieTracker';
import MealPlanner from './MealPlanner';
import { Calculator, Calendar, Home, ChevronDown } from 'lucide-react';

export default function HealthTrackerApp() {
  const [currentApp, setCurrentApp] = useState('home');
  const [calorieView, setCalorieView] = useState('input');
  const [mealPlannerView, setMealPlannerView] = useState('generate');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCalorieCalculatorClick = (view) => {
    setCurrentApp('calorie-tracker');
    setCalorieView(view);
    setIsDropdownOpen(false);
  };

  const handleMealPlannerClick = (view) => {
    setCurrentApp('meal-planner');
    setMealPlannerView(view);
    setIsDropdownOpen(false);
  };

  // Main Navigation
  const MainNavigation = () => (
    <nav className="bg-white/95 border-b border-emerald-200 shadow-sm sticky top-0 z-50 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Health Tracker
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setCurrentApp('home')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentApp === 'home'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Home size={18} />
              Home
            </button>
            
            <button
              onClick={() => handleCalorieCalculatorClick('input')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentApp === 'calorie-tracker'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Calculator size={18} />
              Calculate Calories
            </button>
            
            <button
              onClick={() => handleMealPlannerClick('generate')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentApp === 'meal-planner' && mealPlannerView === 'generate'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Calendar size={18} />
              Generate Plan
            </button>
            
            {/* Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-emerald-700 hover:bg-emerald-100"
              >
                More
                <ChevronDown size={16} className={`transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-emerald-200 rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => handleCalorieCalculatorClick('recipes')}
                    className="w-full text-left px-4 py-2 text-emerald-700 hover:bg-emerald-50 rounded-t-lg transition-colors duration-200"
                  >
                    View Recipes
                  </button>
                  <button
                    onClick={() => handleMealPlannerClick('plans')}
                    className="w-full text-left px-4 py-2 text-emerald-700 hover:bg-emerald-50 transition-colors duration-200"
                  >
                    View Meal Plans
                  </button>
                  <button
                    onClick={() => handleMealPlannerClick('analytics')}
                    className="w-full text-left px-4 py-2 text-emerald-700 hover:bg-emerald-50 rounded-b-lg transition-colors duration-200"
                  >
                    Meal Analytics
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );

  // Home/Welcome View
  const HomeView = () => (
    <div className="w-full max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent mb-6">
          Health Tracker
        </h1>
        <p className="text-xl md:text-2xl text-emerald-900 max-w-3xl mx-auto leading-relaxed">
          Your comprehensive nutrition companion for calculating calories, saving recipes, and planning healthy meals.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Calorie Calculator Card */}
        <div className="bg-white/90 border border-emerald-200 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-200 hover:scale-105">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-green-100 p-3 rounded-xl">
              <Calculator size={32} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Calorie Calculator</h3>
              <p className="text-gray-600">Analyze nutrition from recipes</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-gray-700">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Parse recipes from text or URLs</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Get detailed nutritional breakdown</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Save recipes to your collection</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>View saved recipes library</span>
            </div>
          </div>

          <button
            onClick={() => handleCalorieCalculatorClick('input')}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-400 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-500 transition-all duration-200"
          >
            Start Calculating Calories
          </button>
        </div>

        {/* Meal Planner Card */}
        <div className="bg-white/90 border border-emerald-200 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-200 hover:scale-105">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-emerald-100 p-3 rounded-xl">
              <Calendar size={32} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Meal Planner</h3>
              <p className="text-gray-600">Plan your weekly meals</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-gray-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>Generate personalized meal plans</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>Set calorie targets and preferences</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>View detailed daily meal plans</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>Track nutrition analytics</span>
            </div>
          </div>

          <button
            onClick={() => handleMealPlannerClick('generate')}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 text-white py-3 px-6 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-500 transition-all duration-200"
          >
            Start Meal Planning
          </button>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-center text-emerald-800 mb-8">How It Works</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-white rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
              <span className="text-2xl font-bold text-emerald-600">1</span>
            </div>
            <h3 className="text-lg font-semibold text-emerald-800 mb-2">Calculate & Save</h3>
            <p className="text-emerald-700">
              Input your recipes manually or from URLs to get detailed nutrition information and save them to your collection.
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-white rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
              <span className="text-2xl font-bold text-emerald-600">2</span>
            </div>
            <h3 className="text-lg font-semibold text-emerald-800 mb-2">Generate Plans</h3>
            <p className="text-emerald-700">
              Use your saved recipes to generate personalized meal plans based on your calorie goals and preferences.
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-white rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
              <span className="text-2xl font-bold text-emerald-600">3</span>
            </div>
            <h3 className="text-lg font-semibold text-emerald-800 mb-2">Track Progress</h3>
            <p className="text-emerald-700">
              Monitor your meal plans and nutrition analytics to stay on track with your health goals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-100 via-emerald-200 to-teal-300">
      <MainNavigation />
      
      <main>
        {currentApp === 'home' && <HomeView />}
        {currentApp === 'calorie-tracker' && <CalorieTracker currentView={calorieView} />}
        {currentApp === 'meal-planner' && <MealPlanner currentView={mealPlannerView} />}
      </main>
    </div>
  );
}