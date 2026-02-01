import { useState } from 'react'
import { Plus, X, Search, AlertTriangle } from 'lucide-react'

export default function PantryManager({ pantry, setPantry }) {
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, unit: '', category: 'Other', lastPurchasePrice: 0, lastPurchaseDate: new Date().toISOString().split('T')[0] })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')

  const categories = ['Produce', 'Dairy', 'Meat', 'Pantry', 'Frozen', 'Bakery', 'Beverages', 'Spices', 'Other']
  const units = ['', 'lbs', 'oz', 'kg', 'g', 'cups', 'tbsp', 'tsp', 'bunch', 'heads', 'dozen', 'boxes', 'bags', 'cans', 'pieces', 'whole']

  const addItem = () => {
    if (newItem.name.trim()) {
      const existing = pantry.find(p => p.name.toLowerCase() === newItem.name.toLowerCase())
      if (existing) {
        setPantry(pantry.map(p =>
          p.id === existing.id ? { ...p, quantity: p.quantity + newItem.quantity } : p
        ))
      } else {
        setPantry([...pantry, { ...newItem, id: Date.now() }])
      }
      setNewItem({ name: '', quantity: 1, unit: '', category: 'Other', lastPurchasePrice: 0, lastPurchaseDate: new Date().toISOString().split('T')[0] })
    }
  }

  const updateQuantity = (id, newQty) => {
    if (newQty <= 0) {
      setPantry(pantry.filter(p => p.id !== id))
    } else {
      setPantry(pantry.map(p => p.id === id ? { ...p, quantity: newQty } : p))
    }
  }

  const removeItem = (id) => {
    setPantry(pantry.filter(p => p.id !== id))
  }

  const getFilteredItems = () => {
    return pantry.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = filterCategory === 'All' || item.category === filterCategory
      return matchesSearch && matchesCategory
    })
  }

  const getLowStockItems = () => {
    return pantry.filter(item => item.quantity <= 1)
  }

  const filteredItems = getFilteredItems()
  const lowStockItems = getLowStockItems()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-8 pt-20">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Pantry Manager</h1>

        {/* Low Stock Warning */}
        {lowStockItems.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-800">Low Stock Warning</h3>
            </div>
            <div className="flex gap-2 flex-wrap">
              {lowStockItems.map(item => (
                <span key={item.id} className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                  {item.name} ({item.quantity} {item.unit} left)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-sm text-gray-600">Total Items</p>
            <p className="text-3xl font-bold text-blue-600">{pantry.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-sm text-gray-600">Categories</p>
            <p className="text-3xl font-bold text-cyan-600">{new Set(pantry.map(p => p.category)).size}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-sm text-gray-600">Low Stock</p>
            <p className={`text-3xl font-bold ${lowStockItems.length > 0 ? 'text-yellow-600' : 'text-green-600'}`}>{lowStockItems.length}</p>
          </div>
        </div>

        {/* Add Item */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Add Item</h3>
          <div className="grid grid-cols-7 gap-2">
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
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              className="p-2 border border-gray-300 rounded text-sm"
            >
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <input
              type="number"
              placeholder="Price $"
              value={newItem.lastPurchasePrice}
              onChange={(e) => setNewItem({ ...newItem, lastPurchasePrice: parseFloat(e.target.value) || 0 })}
              className="p-2 border border-gray-300 rounded"
              step="0.01"
            />
            <button
              onClick={addItem}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex gap-4 items-center mb-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search pantry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 pl-10 border border-gray-300 rounded"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['All', ...categories].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition ${
                  filterCategory === cat ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Pantry Items by Category */}
        {filteredItems.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow text-center">
            <p className="text-gray-500 text-lg">Pantry is empty</p>
            <p className="text-gray-400">Add items above or check off items in Shopping List</p>
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map(category => {
              const categoryItems = filteredItems.filter(i => i.category === category)
              if (categoryItems.length === 0) return null
              return (
                <div key={category} className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {categoryItems.map(item => (
                      <div key={item.id} className={`flex items-center gap-3 p-3 rounded ${item.quantity <= 1 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.lastPurchasePrice > 0 && `Last bought: $${item.lastPurchasePrice.toFixed(2)}`}
                            {item.lastPurchaseDate && ` • ${new Date(item.lastPurchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold"
                          >
                            -
                          </button>
                          <span className="text-sm font-semibold text-gray-800 w-12 text-center">{item.quantity} {item.unit}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold"
                          >
                            +
                          </button>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
