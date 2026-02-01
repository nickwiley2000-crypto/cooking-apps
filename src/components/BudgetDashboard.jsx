import { useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react'

export default function BudgetDashboard({ mealHistory, weeklyPlan, recipes, receipts, settings }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  // Calculate current week cost
  const getCurrentWeekCost = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    const weekKey = monday.toISOString().split('T')[0]
    return Object.keys(weeklyPlan)
      .filter(k => k.startsWith(weekKey))
      .reduce((sum, k) => sum + (weeklyPlan[k].totalCost || 0), 0)
  }

  // Calculate monthly spending from receipts
  const getMonthlySpending = () => {
    return receipts
      .filter(r => {
        const date = new Date(r.date)
        return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
      })
      .reduce((sum, r) => sum + (r.total || 0), 0)
  }

  // Get weekly costs from planned meals (historical)
  const getWeeklyCosts = () => {
    const weeks = {}
    Object.keys(weeklyPlan).forEach(key => {
      const weekKey = key.split('|')[0]
      if (!weeks[weekKey]) weeks[weekKey] = 0
      weeks[weekKey] += weeklyPlan[key].totalCost || 0
    })
    return weeks
  }

  // Get spending by store from receipts
  const getSpendingByStore = () => {
    const storeMap = {}
    receipts
      .filter(r => {
        const date = new Date(r.date)
        return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
      })
      .forEach(r => {
        const store = r.store || 'Unknown'
        if (!storeMap[store]) storeMap[store] = 0
        storeMap[store] += r.total || 0
      })
    return storeMap
  }

  // Get most expensive recipes
  const getMostExpensiveRecipes = () => {
    return [...recipes].sort((a, b) => b.totalCost - a.totalCost).slice(0, 5)
  }

  // Get cheapest recipes
  const getCheapestRecipes = () => {
    return [...recipes].sort((a, b) => a.totalCost - b.totalCost).slice(0, 5)
  }

  const currentWeekCost = getCurrentWeekCost()
  const monthlySpending = getMonthlySpending()
  const budget = settings.monthlyBudget
  const budgetUsedPercent = budget > 0 ? (monthlySpending / budget) * 100 : 0
  const spendingByStore = getSpendingByStore()
  const weeklyCosts = getWeeklyCosts()
  const weeklyEntries = Object.entries(weeklyCosts).sort((a, b) => a[0].localeCompare(b[0])).slice(-8)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-8 pt-20">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Budget & Spending</h1>

        {/* Month Selector */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600">Viewing:</label>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="p-2 border border-gray-300 rounded">
              {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="p-2 border border-gray-300 rounded">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Budget Alert */}
        {budgetUsedPercent >= 90 && (
          <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${budgetUsedPercent >= 100 ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <AlertTriangle className={`w-6 h-6 ${budgetUsedPercent >= 100 ? 'text-red-600' : 'text-yellow-600'}`} />
            <div>
              <p className={`font-semibold ${budgetUsedPercent >= 100 ? 'text-red-800' : 'text-yellow-800'}`}>
                {budgetUsedPercent >= 100 ? '⚠️ Budget Exceeded!' : '⚠️ Approaching Budget Limit'}
              </p>
              <p className={`text-sm ${budgetUsedPercent >= 100 ? 'text-red-700' : 'text-yellow-700'}`}>
                You've spent ${monthlySpending.toFixed(2)} of your ${budget.toFixed(2)} monthly budget ({budgetUsedPercent.toFixed(0)}%)
              </p>
            </div>
          </div>
        )}

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-lg shadow">
            <p className="text-sm text-gray-600">Monthly Budget</p>
            <p className="text-2xl font-bold text-indigo-600">${budget.toFixed(2)}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow">
            <p className="text-sm text-gray-600">Month Spent</p>
            <p className={`text-2xl font-bold ${budgetUsedPercent >= 100 ? 'text-red-600' : 'text-green-600'}`}>${monthlySpending.toFixed(2)}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow">
            <p className="text-sm text-gray-600">Remaining</p>
            <p className={`text-2xl font-bold ${budget - monthlySpending < 0 ? 'text-red-600' : 'text-blue-600'}`}>${(budget - monthlySpending).toFixed(2)}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow">
            <p className="text-sm text-gray-600">This Week (Planned)</p>
            <p className="text-2xl font-bold text-orange-600">${currentWeekCost.toFixed(2)}</p>
          </div>
        </div>

        {/* Budget Progress Bar */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Monthly Budget Progress</h3>
            <span className="text-sm font-semibold text-gray-600">{budgetUsedPercent.toFixed(0)}% used</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-5">
            <div
              className={`h-5 rounded-full transition-all duration-500 ${
                budgetUsedPercent >= 100 ? 'bg-red-500' : budgetUsedPercent >= 75 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-500">
            <span>$0</span>
            <span>${(budget / 2).toFixed(0)}</span>
            <span>${budget.toFixed(0)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Weekly Cost History */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800 mb-4">Weekly Planned Costs</h3>
            {weeklyEntries.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No weekly plans yet</p>
            ) : (
              <div className="space-y-3">
                {weeklyEntries.map(([weekKey, cost]) => {
                  const date = new Date(weekKey)
                  const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  const maxCost = Math.max(...weeklyEntries.map(([, c]) => c), 1)
                  const barWidth = (cost / maxCost) * 100
                  return (
                    <div key={weekKey}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">Week of {label}</span>
                        <span className="text-sm font-semibold text-indigo-600">${cost.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div className="bg-indigo-500 h-3 rounded-full" style={{ width: `${barWidth}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Spending by Store */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800 mb-4">Spending by Store</h3>
            {Object.keys(spendingByStore).length === 0 ? (
              <p className="text-gray-500 text-center py-8">No receipt data this month</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(spendingByStore)
                  .sort((a, b) => b[1] - a[1])
                  .map(([store, amount]) => {
                    const maxAmount = Math.max(...Object.values(spendingByStore), 1)
                    const barWidth = (amount / maxAmount) * 100
                    return (
                      <div key={store}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">{store}</span>
                          <span className="text-sm font-semibold text-green-600">${amount.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                          <div className="bg-green-500 h-3 rounded-full" style={{ width: `${barWidth}%` }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Most Expensive Recipes */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Most Expensive Recipes</h3>
              <TrendingUp className="w-5 h-5 text-red-500" />
            </div>
            {recipes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recipes yet</p>
            ) : (
              <div className="space-y-3">
                {getMostExpensiveRecipes().map((recipe, i) => (
                  <div key={recipe.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                    <span className="text-lg font-bold text-gray-400">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{recipe.name}</p>
                      <p className="text-xs text-gray-500">{recipe.servings} servings • ${(recipe.totalCost / recipe.servings).toFixed(2)} each</p>
                    </div>
                    <span className="font-bold text-red-600">${recipe.totalCost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cheapest Recipes */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Most Budget-Friendly</h3>
              <TrendingDown className="w-5 h-5 text-green-500" />
            </div>
            {recipes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recipes yet</p>
            ) : (
              <div className="space-y-3">
                {getCheapestRecipes().map((recipe, i) => (
                  <div key={recipe.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                    <span className="text-lg font-bold text-gray-400">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{recipe.name}</p>
                      <p className="text-xs text-gray-500">{recipe.servings} servings • ${(recipe.totalCost / recipe.servings).toFixed(2)} each</p>
                    </div>
                    <span className="font-bold text-green-600">${recipe.totalCost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
