import { useState } from 'react'
import { Plus, X, ChevronLeft, ChevronRight, DollarSign, ShoppingCart } from 'lucide-react'

export default function WeeklyPlanner({ recipes, weeklyPlan, setWeeklyPlan, setShoppingList, shoppingList }) {
  const [currentWeek, setCurrentWeek] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [searchRecipe, setSearchRecipe] = useState('')

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const mealTypes = ['Breakfast', 'Lunch', 'Lunch (Kids)', 'Dinner', 'Snack']

  const getWeekStart = (offset) => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + offset * 7)
    return monday
  }

  const getWeekKey = (offset) => {
    const monday = getWeekStart(offset)
    return monday.toISOString().split('T')[0]
  }

  const getWeekDisplay = (offset) => {
    const monday = getWeekStart(offset)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${fmt(monday)} - ${fmt(sunday)}`
  }

  const weekKey = getWeekKey(currentWeek)

  const getMealForSlot = (day, mealType) => {
    const key = `${weekKey}|${day}|${mealType}`
    return weeklyPlan[key] || null
  }

  const addMealToSlot = (recipe) => {
    if (selectedSlot) {
      const key = `${weekKey}|${selectedSlot.day}|${selectedSlot.mealType}`
      setWeeklyPlan({ ...weeklyPlan, [key]: { recipeId: recipe.id, recipeName: recipe.name, totalCost: recipe.totalCost, servings: recipe.servings } })
      setSelectedSlot(null)
      setSearchRecipe('')
    }
  }

  const removeMealFromSlot = (day, mealType) => {
    const key = `${weekKey}|${day}|${mealType}`
    const updated = { ...weeklyPlan }
    delete updated[key]
    setWeeklyPlan(updated)
  }

  const getWeeklyCost = () => {
    return Object.keys(weeklyPlan)
      .filter(k => k.startsWith(weekKey))
      .reduce((sum, k) => sum + (weeklyPlan[k].totalCost || 0), 0)
  }

  const getMealCount = () => {
    return Object.keys(weeklyPlan).filter(k => k.startsWith(weekKey)).length
  }

  const generateShoppingList = () => {
    const ingredientMap = {}
    Object.keys(weeklyPlan)
      .filter(k => k.startsWith(weekKey))
      .forEach(k => {
        const meal = weeklyPlan[k]
        const recipe = recipes.find(r => r.id === meal.recipeId)
        if (recipe) {
          recipe.ingredients.forEach(ing => {
            const store = ing.store || 'Unassigned'
            const itemKey = `${ing.name}|${store}`
            if (!ingredientMap[itemKey]) {
              ingredientMap[itemKey] = { ...ing, totalQuantity: 0, checked: false }
            }
            ingredientMap[itemKey].totalQuantity += ing.quantity
          })
        }
      })
    const items = Object.values(ingredientMap).map(item => ({
      id: Date.now() + Math.random(),
      name: item.name,
      quantity: item.totalQuantity,
      unit: item.unit,
      price: item.price,
      store: item.store,
      checked: false
    }))
    setShoppingList(items)
    alert(`Shopping list generated with ${items.length} items!`)
  }

  const filteredRecipes = recipes.filter(r =>
    r.name.toLowerCase().includes(searchRecipe.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-8 pt-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-gray-800">Weekly Meal Planner</h1>
          <button
            onClick={generateShoppingList}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" /> Generate Shopping List
          </button>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow mb-6">
          <button onClick={() => setCurrentWeek(currentWeek - 1)} className="p-2 hover:bg-gray-100 rounded">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800">{getWeekDisplay(currentWeek)}</h2>
            {currentWeek !== 0 && (
              <button onClick={() => setCurrentWeek(0)} className="text-sm text-blue-600 hover:text-blue-800">
                Jump to This Week
              </button>
            )}
          </div>
          <button onClick={() => setCurrentWeek(currentWeek + 1)} className="p-2 hover:bg-gray-100 rounded">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Weekly Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-sm text-gray-600">Meals Planned</p>
            <p className="text-3xl font-bold text-orange-600">{getMealCount()}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-sm text-gray-600">Estimated Weekly Cost</p>
            <p className="text-3xl font-bold text-green-600">${getWeeklyCost().toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-sm text-gray-600">Avg Cost Per Meal</p>
            <p className="text-3xl font-bold text-blue-600">
              ${getMealCount() > 0 ? (getWeeklyCost() / getMealCount()).toFixed(2) : '0.00'}
            </p>
          </div>
        </div>

        {/* Meal Grid */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {days.map(day => (
            <div key={day} className="bg-white rounded-lg shadow p-3">
              <h3 className="font-bold text-gray-800 text-center text-sm mb-3 border-b pb-2">{day}</h3>
              <div className="space-y-2">
                {mealTypes.map(mealType => {
                  const meal = getMealForSlot(day, mealType)
                  return (
                    <div key={mealType}>
                      {meal ? (
                        <div className="bg-orange-100 border border-orange-200 p-2 rounded">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-semibold text-orange-700">{mealType}</p>
                              <p className="text-xs font-medium text-gray-800 mt-0.5">{meal.recipeName}</p>
                              <p className="text-xs text-green-600 mt-0.5">${meal.totalCost.toFixed(2)}</p>
                            </div>
                            <button onClick={() => removeMealFromSlot(day, mealType)} className="text-gray-400 hover:text-red-500">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedSlot({ day, mealType })}
                          className="w-full text-left bg-gray-50 hover:bg-orange-50 border border-dashed border-gray-300 p-2 rounded transition"
                        >
                          <p className="text-xs text-gray-500">{mealType}</p>
                          <p className="text-xs text-gray-400">+ Add</p>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Recipe Selector Modal */}
        {selectedSlot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-screen overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  Select Recipe for {selectedSlot.mealType} on {selectedSlot.day}
                </h3>
                <button onClick={() => { setSelectedSlot(null); setSearchRecipe('') }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchRecipe}
                onChange={(e) => setSearchRecipe(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mb-4"
                autoFocus
              />
              {filteredRecipes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recipes found</p>
              ) : (
                <div className="space-y-2">
                  {filteredRecipes.map(recipe => (
                    <button
                      key={recipe.id}
                      onClick={() => addMealToSlot(recipe)}
                      className="w-full text-left bg-gray-50 hover:bg-orange-50 p-4 rounded-lg transition border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-800">{recipe.name}</p>
                          <p className="text-sm text-gray-600">{recipe.servings} servings • {recipe.ingredients.length} ingredients</p>
                        </div>
                        <span className="text-green-600 font-semibold">${recipe.totalCost.toFixed(2)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
