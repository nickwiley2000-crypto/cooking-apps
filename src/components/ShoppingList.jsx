import { useState } from 'react'
import { Plus, X, CheckCircle, Circle, Trash2, ShoppingCart } from 'lucide-react'

export default function ShoppingList({ shoppingList, setShoppingList, settings, pantry, setPantry }) {
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, unit: '', price: 0, store: '' })
  const [filterStore, setFilterStore] = useState('All')
  const [shoppingMode, setShoppingMode] = useState(false)

  const units = ['', 'lbs', 'oz', 'kg', 'g', 'cups', 'tbsp', 'tsp', 'bunch', 'heads', 'dozen', 'boxes', 'bags', 'cans', 'pieces', 'whole']

  const addItem = () => {
    if (newItem.name.trim()) {
      setShoppingList([...shoppingList, {
        ...newItem,
        id: Date.now(),
        checked: false
      }])
      setNewItem({ name: '', quantity: 1, unit: '', price: 0, store: '' })
    }
  }

  const toggleItem = (id) => {
    setShoppingList(shoppingList.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ))
  }

  const removeItem = (id) => {
    setShoppingList(shoppingList.filter(item => item.id !== id))
  }

  const clearChecked = () => {
    // Move checked items to pantry
    const checkedItems = shoppingList.filter(i => i.checked)
    checkedItems.forEach(item => {
      const existingPantryItem = pantry.find(p => p.name.toLowerCase() === item.name.toLowerCase())
      if (existingPantryItem) {
        setPantry(pantry.map(p =>
          p.id === existingPantryItem.id
            ? { ...p, quantity: p.quantity + item.quantity }
            : p
        ))
      } else {
        setPantry([...pantry, {
          id: Date.now() + Math.random(),
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: 'Other',
          lastPurchasePrice: item.price,
          lastPurchaseDate: new Date().toISOString().split('T')[0]
        }])
      }
    })
    setShoppingList(shoppingList.filter(i => !i.checked))
  }

  const getFilteredItems = () => {
    if (filterStore === 'All') return shoppingList
    return shoppingList.filter(item => item.store === filterStore)
  }

  const getItemsByStore = () => {
    const storeMap = {}
    shoppingList.forEach(item => {
      const store = item.store || 'Unassigned'
      if (!storeMap[store]) storeMap[store] = []
      storeMap[store].push(item)
    })
    return storeMap
  }

  const totalCost = shoppingList.reduce((sum, item) => sum + (item.price || 0), 0)
  const checkedCost = shoppingList.filter(i => i.checked).reduce((sum, item) => sum + (item.price || 0), 0)
  const checkedCount = shoppingList.filter(i => i.checked).length

  const itemsByStore = getItemsByStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-8 pt-20">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-gray-800">Shopping List</h1>
          <button
            onClick={() => setShoppingMode(!shoppingMode)}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 ${
              shoppingMode
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            {shoppingMode ? 'Exit Shopping Mode' : 'Enter Shopping Mode'}
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-sm text-gray-600">Total Items</p>
            <p className="text-3xl font-bold text-gray-800">{shoppingList.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-sm text-gray-600">Estimated Total</p>
            <p className="text-3xl font-bold text-green-600">${totalCost.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-sm text-gray-600">Already Got</p>
            <p className="text-3xl font-bold text-blue-600">${checkedCost.toFixed(2)}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">{checkedCount} of {shoppingList.length} items</span>
            <span className="text-sm text-gray-600">{shoppingList.length > 0 ? Math.round((checkedCount / shoppingList.length) * 100) : 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${shoppingList.length > 0 ? (checkedCount / shoppingList.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Add Item (hidden in shopping mode) */}
        {!shoppingMode && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Add Item</h3>
            <div className="grid grid-cols-6 gap-2">
              <input
                type="text"
                placeholder="Item name"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="p-2 border border-gray-300 rounded col-span-2"
                onKeyPress={(e) => e.key === 'Enter' && addItem()}
              />
              <input
                type="number"
                placeholder="Qty"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                className="p-2 border border-gray-300 rounded"
                step="0.5"
              />
              <select
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                className="p-2 border border-gray-300 rounded text-sm"
              >
                {units.map(u => <option key={u} value={u}>{u || 'Unit'}</option>)}
              </select>
              <select
                value={newItem.store}
                onChange={(e) => setNewItem({ ...newItem, store: e.target.value })}
                className="p-2 border border-gray-300 rounded text-sm"
              >
                <option value="">Store</option>
                {settings.stores.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                type="number"
                placeholder="$"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                className="p-2 border border-gray-300 rounded"
                step="0.01"
              />
              <button
                onClick={addItem}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-semibold flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>
        )}

        {/* Store Filter */}
        {!shoppingMode && (
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterStore('All')}
                className={`px-4 py-2 rounded font-semibold transition ${filterStore === 'All' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                All Stores
              </button>
              {settings.stores.map(store => (
                <button
                  key={store}
                  onClick={() => setFilterStore(store)}
                  className={`px-4 py-2 rounded font-semibold transition ${filterStore === store ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  {store}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Items by Store */}
        {shoppingList.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow text-center">
            <ShoppingCart className="w-16 h-16 text-green-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Your shopping list is empty</p>
            <p className="text-gray-400">Go to Meal Planner and click "Generate Shopping List"</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(itemsByStore)
              .filter(([store]) => filterStore === 'All' || store === filterStore)
              .map(([store, items]) => (
                <div key={store} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">{store}</h3>
                    <span className="text-sm font-semibold text-green-600">
                      Subtotal: ${items.reduce((sum, i) => sum + (i.price || 0), 0).toFixed(2)}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {items.map(item => (
                      <li
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded transition ${
                          item.checked ? 'bg-gray-100' : 'bg-green-50'
                        }`}
                      >
                        <button onClick={() => toggleItem(item.id)} className="text-green-500 flex-shrink-0">
                          {item.checked ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                        </button>
                        <div className="flex-1">
                          <p className={`font-medium ${item.checked ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-500">{item.quantity} {item.unit}</p>
                        </div>
                        <span className="text-sm font-semibold text-green-600">${(item.price || 0).toFixed(2)}</span>
                        {!shoppingMode && (
                          <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500">
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        )}

        {/* Clear Checked */}
        {checkedCount > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={clearChecked}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto"
            >
              <Trash2 className="w-5 h-5" /> Clear Checked (adds to Pantry)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
