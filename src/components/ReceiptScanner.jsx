import { useState } from 'react'
import { Plus, X, DollarSign, RefreshCw, Camera, Upload, Loader } from 'lucide-react'

export default function ReceiptScanner({ receipts, setReceipts, recipes, setRecipes, pantry, setPantry }) {
  const [showAddReceipt, setShowAddReceipt] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [newReceipt, setNewReceipt] = useState({
    store: '',
    date: new Date().toISOString().split('T')[0],
    items: [],
    total: 0
  })
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, unit: '', price: 0 })
  const [updateLog, setUpdateLog] = useState([])
  const [showUpdateLog, setShowUpdateLog] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)

  const units = ['', 'lbs', 'oz', 'kg', 'g', 'cups', 'tbsp', 'tsp', 'bunch', 'heads', 'dozen', 'boxes', 'bags', 'cans', 'pieces', 'whole']

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const scanReceiptImage = async (file) => {
    setScanning(true)
    setScanError(null)
    try {
      const base64 = await fileToBase64(file)
      const mediaType = file.type || 'image/jpeg'
      const url = URL.createObjectURL(file)
      setPreviewImage(url)

      const prompt = [
        'You are a receipt scanner. Look at this receipt image and extract the information.',
        '',
        'Return ONLY a valid JSON object with this exact structure, no other text:',
        '{',
        '  "store": "store name from receipt",',
        '  "date": "YYYY-MM-DD",',
        '  "items": [',
        '    { "name": "item name", "quantity": 1, "unit": "", "price": 0.00 }',
        '  ],',
        '  "total": 0.00',
        '}',
        '',
        'Rules:',
        '- Extract every line item with its price',
        '- If quantity is not shown, use 1',
        '- If unit is not shown, leave it as empty string',
        '- Price should be a number (no $ sign)',
        '- Total should be the receipt total',
        '- If you cannot read something clearly, make your best guess',
        '- Date format must be YYYY-MM-DD. If no date visible, use today\'s date.'
      ].join('\n')

      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: prompt }
            ]
          }]
        })
      })

      const data = await response.json()
      if (!response.ok || data.error) {
        throw new Error(data.error || 'API returned status ' + response.status)
      }

      const text = data.content.map(block => block.text || '').join('')
      // Robustly extract JSON: find the first { and last } in the response
      const jsonStart = text.indexOf('{')
      const jsonEnd = text.lastIndexOf('}')
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No JSON found in AI response. Raw: ' + text.substring(0, 300))
      }
      const jsonString = text.substring(jsonStart, jsonEnd + 1)
      const parsed = JSON.parse(jsonString)

      setNewReceipt({
        store: parsed.store || '',
        date: parsed.date || new Date().toISOString().split('T')[0],
        items: (parsed.items || []).map(item => ({
          ...item,
          id: Date.now() + Math.random(),
          quantity: parseFloat(item.quantity) || 1,
          price: parseFloat(item.price) || 0
        })),
        total: parseFloat(parsed.total) || (parsed.items || []).reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0)
      })
    } catch (e) {
      console.error('Scan error:', e)
      setScanError(e.message || 'Unknown error occurred')
    }
    setScanning(false)
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) scanReceiptImage(file)
    e.target.value = ''
  }

  const addItemToReceipt = () => {
    if (newItem.name.trim() && newItem.price > 0) {
      setNewReceipt({
        ...newReceipt,
        items: [...newReceipt.items, { ...newItem, id: Date.now() }],
        total: newReceipt.total + newItem.price
      })
      setNewItem({ name: '', quantity: 1, unit: '', price: 0 })
    }
  }

  const removeItemFromReceipt = (id) => {
    const item = newReceipt.items.find(i => i.id === id)
    setNewReceipt({
      ...newReceipt,
      items: newReceipt.items.filter(i => i.id !== id),
      total: newReceipt.total - (item?.price || 0)
    })
  }

  const saveReceipt = () => {
    if (newReceipt.store && newReceipt.items.length > 0) {
      const receipt = { ...newReceipt, id: Date.now(), createdAt: new Date().toISOString() }
      setReceipts([...receipts, receipt])
      const logs = updatePricesFromReceipt(receipt)
      setUpdateLog(logs)
      setShowUpdateLog(true)
      setNewReceipt({ store: '', date: new Date().toISOString().split('T')[0], items: [], total: 0 })
      setPreviewImage(null)
      setShowAddReceipt(false)
    }
  }

  const updatePricesFromReceipt = (receipt) => {
    const logs = []
    let updatedRecipes = [...recipes]
    let updatedPantry = [...pantry]
    receipt.items.forEach(item => {
      const itemNameLower = item.name.toLowerCase()
      updatedRecipes = updatedRecipes.map(recipe => {
        let recipeUpdated = false
        const updatedIngredients = recipe.ingredients.map(ing => {
          if (ing.name.toLowerCase() === itemNameLower && ing.price !== item.price) {
            recipeUpdated = true
            logs.push({ type: 'recipe', recipe: recipe.name, ingredient: ing.name, oldPrice: ing.price, newPrice: item.price })
            return { ...ing, price: item.price, store: receipt.store }
          }
          return ing
        })
        if (recipeUpdated) {
          return { ...recipe, ingredients: updatedIngredients, totalCost: updatedIngredients.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0) }
        }
        return recipe
      })
      updatedPantry = updatedPantry.map(p => {
        if (p.name.toLowerCase() === itemNameLower) {
          logs.push({ type: 'pantry', item: p.name, oldPrice: p.lastPurchasePrice, newPrice: item.price })
          return { ...p, lastPurchasePrice: item.price, lastPurchaseDate: receipt.date }
        }
        return p
      })
    })
    setRecipes(updatedRecipes)
    setPantry(updatedPantry)
    return logs
  }

  const deleteReceipt = (id) => {
    setReceipts(receipts.filter(r => r.id !== id))
    if (selectedReceipt?.id === id) setSelectedReceipt(null)
  }

  const totalReceiptSpend = receipts.reduce((sum, r) => sum + (r.total || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-8 pt-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-gray-800">Receipt Scanner</h1>
          <button onClick={() => { setShowAddReceipt(true); setSelectedReceipt(null); setPreviewImage(null); setScanError(null) }} className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add Receipt
          </button>
        </div>

        {showUpdateLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Price Updates Applied</h3>
                <button onClick={() => setShowUpdateLog(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
              </div>
              {updateLog.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No matching items found to update</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {updateLog.map((log, i) => (
                    <div key={i} className={`p-3 rounded ${log.type === 'recipe' ? 'bg-purple-50' : 'bg-blue-50'}`}>
                      <p className="text-sm font-semibold text-gray-800">{log.type === 'recipe' ? '📖 ' + log.recipe : '📦 Pantry'} → {log.ingredient || log.item}</p>
                      <p className="text-sm text-gray-600">${parseFloat(log.oldPrice || 0).toFixed(2)} → <span className="text-green-600 font-semibold">${log.newPrice.toFixed(2)}</span></p>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setShowUpdateLog(false)} className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg font-semibold">Close</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-sm text-gray-600">Total Receipts</p>
            <p className="text-3xl font-bold text-red-600">{receipts.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-sm text-gray-600">Total Spent (All Time)</p>
            <p className="text-3xl font-bold text-orange-600">${totalReceiptSpend.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-sm text-gray-600">Avg per Receipt</p>
            <p className="text-3xl font-bold text-green-600">${receipts.length > 0 ? (totalReceiptSpend / receipts.length).toFixed(2) : '0.00'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {receipts.length === 0 ? (
                <div className="bg-white p-8 rounded-lg text-center">
                  <p className="text-gray-500">No receipts yet</p>
                  <p className="text-sm text-gray-400">Click "Add Receipt" to enter one</p>
                </div>
              ) : (
                [...receipts].reverse().map(receipt => (
                  <button key={receipt.id} onClick={() => { setSelectedReceipt(receipt); setShowAddReceipt(false) }} className={'w-full text-left bg-white p-4 rounded-lg shadow transition ' + (selectedReceipt && selectedReceipt.id === receipt.id ? 'ring-2 ring-red-500' : 'hover:shadow-md')}>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-800">{receipt.store}</p>
                      <span className="font-semibold text-green-600">${receipt.total.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-gray-500">{new Date(receipt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {receipt.items.length} items</p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {showAddReceipt ? (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">New Receipt</h2>
                  <button onClick={() => { setShowAddReceipt(false); setPreviewImage(null); setScanError(null) }} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-3 font-semibold">Scan a Receipt</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="cursor-pointer bg-red-500 hover:bg-red-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 transition relative">
                      <Camera className="w-8 h-8" />
                      <span className="font-semibold">Take Photo</span>
                      <span className="text-xs opacity-80">Opens camera</span>
                      <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} style={{position:'absolute',inset:0,opacity:0,width:'100%',height:'100%',cursor:'pointer'}} />
                    </label>
                    <label className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 transition relative">
                      <Upload className="w-8 h-8" />
                      <span className="font-semibold">Upload Image</span>
                      <span className="text-xs opacity-80">From gallery</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{position:'absolute',inset:0,opacity:0,width:'100%',height:'100%',cursor:'pointer'}} />
                    </label>
                  </div>

                  {scanning && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center gap-3">
                      <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                      <p className="text-blue-800 font-semibold">AI is reading your receipt...</p>
                    </div>
                  )}
                  {scanError && (
                    <div className="mt-4 bg-red-50 border border-red-200 p-4 rounded-lg">
                      <p className="text-red-800 text-sm font-semibold">Error:</p>
                      <p className="text-red-700 text-sm mt-1">{scanError}</p>
                    </div>
                  )}
                  {previewImage && !scanning && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 mb-1">Receipt image:</p>
                      <img src={previewImage} alt="Receipt" className="max-h-40 rounded border border-gray-200" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-4">
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="text-sm text-gray-500">or enter manually below</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Store</label>
                      <input type="text" placeholder="Store name" value={newReceipt.store} onChange={(e) => setNewReceipt({ ...newReceipt, store: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg" list="store-list" />
                      <datalist id="store-list">
                        {["Lowe's Foods", 'Harris Teeter', 'Food Lion', 'Whole Foods'].map(s => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Date</label>
                      <input type="date" value={newReceipt.date} onChange={(e) => setNewReceipt({ ...newReceipt, date: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Items</label>
                    <div className="space-y-2">
                      {newReceipt.items.map(item => (
                        <div key={item.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                          <span className="flex-1 text-sm text-gray-800">{item.name} - {item.quantity} {item.unit}</span>
                          <span className="text-sm font-semibold text-green-600">${item.price.toFixed(2)}</span>
                          <button onClick={() => removeItemFromReceipt(item.id)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                      <div className="grid grid-cols-5 gap-2">
                        <input type="text" placeholder="Item" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="p-2 border border-gray-300 rounded text-sm col-span-2" onKeyPress={(e) => e.key === 'Enter' && addItemToReceipt()} />
                        <input type="number" placeholder="Qty" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })} className="p-2 border border-gray-300 rounded text-sm" step="0.5" />
                        <select value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} className="p-2 border border-gray-300 rounded text-sm">
                          {units.map(u => <option key={u} value={u}>{u || 'Unit'}</option>)}
                        </select>
                        <input type="number" placeholder="$" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })} className="p-2 border border-gray-300 rounded text-sm" step="0.01" />
                      </div>
                      <button onClick={addItemToReceipt} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded text-sm flex items-center justify-center gap-1">
                        <Plus className="w-4 h-4" /> Add Item
                      </button>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg flex items-center justify-between">
                    <span className="font-semibold text-gray-800">Receipt Total</span>
                    <span className="text-2xl font-bold text-green-600">${newReceipt.total.toFixed(2)}</span>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                    <p className="text-sm text-orange-800 flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Saving this receipt will automatically update matching prices in your recipes and pantry.</p>
                  </div>
                  <button onClick={saveReceipt} className="w-full bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg font-semibold text-lg">Save Receipt & Update Prices</button>
                </div>
              </div>
            ) : selectedReceipt ? (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedReceipt.store}</h2>
                    <p className="text-gray-600">{new Date(selectedReceipt.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <button onClick={() => deleteReceipt(selectedReceipt.id)} className="text-red-400 hover:text-red-600"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-2 mb-6">
                  {selectedReceipt.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.quantity} {item.unit}</p>
                      </div>
                      <p className="font-semibold text-green-600">${item.price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-green-50 p-4 rounded-lg flex items-center justify-between">
                  <span className="font-semibold text-gray-800">Total</span>
                  <span className="text-2xl font-bold text-green-600">${selectedReceipt.total.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Select a receipt or add a new one</p>
                <p className="text-sm text-gray-400 mt-2">Use the camera to scan receipts or enter items manually</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
