import { useState, useEffect } from 'react'
import { Home, BookOpen, Calendar, ShoppingCart, Package, TrendingUp, Receipt, Settings } from 'lucide-react'
import RecipeLibrary from './components/RecipeLibrary'
import WeeklyPlanner from './components/WeeklyPlanner'
import ShoppingList from './components/ShoppingList'
import PantryManager from './components/PantryManager'
import BudgetDashboard from './components/BudgetDashboard'
import ReceiptScanner from './components/ReceiptScanner'
import SettingsPanel from './components/SettingsPanel'

export default function CookingApp() {
  const [currentView, setCurrentView] = useState('home')
  const [recipes, setRecipes] = useState([])
  const [weeklyPlan, setWeeklyPlan] = useState({})
  const [pantry, setPantry] = useState([])
  const [shoppingList, setShoppingList] = useState([])
  const [receipts, setReceipts] = useState([])
  const [mealHistory, setMealHistory] = useState([])
  const [settings, setSettings] = useState({
    stores: ['Lowe\'s Foods', 'Harris Teeter', 'Food Lion', 'Whole Foods'],
    monthlyBudget: 800,
    familyMembers: ['Adults', 'Kids']
  })
  const [loading, setLoading] = useState(true)

  // Load all data from storage
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await window.storage.get('cooking-app-data')
        if (data) {
          const parsed = JSON.parse(data.value)
          setRecipes(parsed.recipes || [])
          setWeeklyPlan(parsed.weeklyPlan || {})
          setPantry(parsed.pantry || [])
          setShoppingList(parsed.shoppingList || [])
          setReceipts(parsed.receipts || [])
          setMealHistory(parsed.mealHistory || [])
          setSettings(parsed.settings || settings)
        }
      } catch (e) {
        console.log('Starting fresh')
      }
      setLoading(false)
    }
    loadData()
  }, [])

  // Save all data to storage
  useEffect(() => {
    if (!loading) {
      const saveData = async () => {
        try {
          const data = {
            recipes,
            weeklyPlan,
            pantry,
            shoppingList,
            receipts,
            mealHistory,
            settings
          }
          await window.storage.set('cooking-app-data', JSON.stringify(data))
        } catch (e) {
          console.error('Save failed')
        }
      }
      saveData()
    }
  }, [recipes, weeklyPlan, pantry, shoppingList, receipts, mealHistory, settings, loading])

  const navigation = [
    { id: 'recipes', name: 'Recipes', icon: BookOpen, color: 'purple' },
    { id: 'planner', name: 'Meal Plan', icon: Calendar, color: 'orange' },
    { id: 'shopping', name: 'Shopping', icon: ShoppingCart, color: 'green' },
    { id: 'pantry', name: 'Pantry', icon: Package, color: 'blue' },
    { id: 'budget', name: 'Budget', icon: TrendingUp, color: 'indigo' },
    { id: 'receipts', name: 'Receipts', icon: Receipt, color: 'red' },
    { id: 'settings', name: 'Settings', icon: Settings, color: 'gray' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your kitchen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {currentView === 'home' ? (
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-gray-800 mb-4">Kitchen Manager</h1>
              <p className="text-xl text-gray-600">Your complete cooking, planning, and budgeting system</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {navigation.map(nav => (
                <button
                  key={nav.id}
                  onClick={() => setCurrentView(nav.id)}
                  className={`bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 text-left border-l-4 border-${nav.color}-500`}
                >
                  <nav.icon className={`w-12 h-12 text-${nav.color}-500 mb-4`} />
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">{nav.name}</h2>
                  <p className="text-gray-600">
                    {nav.id === 'recipes' && `${recipes.length} recipes saved`}
                    {nav.id === 'planner' && 'Plan your weekly meals'}
                    {nav.id === 'shopping' && `${shoppingList.length} items`}
                    {nav.id === 'pantry' && `${pantry.length} items in stock`}
                    {nav.id === 'budget' && 'Track your spending'}
                    {nav.id === 'receipts' && `${receipts.length} receipts`}
                    {nav.id === 'settings' && 'Manage your preferences'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setCurrentView('home')}
            className="fixed top-4 left-4 bg-white hover:bg-gray-50 text-gray-800 px-6 py-3 rounded-lg font-semibold shadow-lg z-50 flex items-center gap-2"
          >
            <Home className="w-5 h-5" /> Home
          </button>

          {currentView === 'recipes' && (
            <RecipeLibrary 
              recipes={recipes} 
              setRecipes={setRecipes}
              settings={settings}
            />
          )}
          {currentView === 'planner' && (
            <WeeklyPlanner 
              recipes={recipes}
              weeklyPlan={weeklyPlan}
              setWeeklyPlan={setWeeklyPlan}
              setShoppingList={setShoppingList}
              shoppingList={shoppingList}
            />
          )}
          {currentView === 'shopping' && (
            <ShoppingList 
              shoppingList={shoppingList}
              setShoppingList={setShoppingList}
              settings={settings}
              pantry={pantry}
              setPantry={setPantry}
            />
          )}
          {currentView === 'pantry' && (
            <PantryManager 
              pantry={pantry}
              setPantry={setPantry}
            />
          )}
          {currentView === 'budget' && (
            <BudgetDashboard 
              mealHistory={mealHistory}
              weeklyPlan={weeklyPlan}
              recipes={recipes}
              receipts={receipts}
              settings={settings}
            />
          )}
          {currentView === 'receipts' && (
            <ReceiptScanner 
              receipts={receipts}
              setReceipts={setReceipts}
              recipes={recipes}
              setRecipes={setRecipes}
              pantry={pantry}
              setPantry={setPantry}
            />
          )}
          {currentView === 'settings' && (
            <SettingsPanel 
              settings={settings}
              setSettings={setSettings}
            />
          )}
        </div>
      )}
    </div>
  )
}
