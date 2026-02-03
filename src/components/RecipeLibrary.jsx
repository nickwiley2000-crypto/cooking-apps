import { useState } from 'react'
import { Plus, X, Search, Scale, ChefHat, Users, Camera, Upload, Loader } from 'lucide-react'

export default function RecipeLibrary({ recipes, setRecipes, settings }) {
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTag, setFilterTag] = useState('All')
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    servings: 4,
    prepTime: '',
    cookTime: '',
    tags: [],
    familyMembers: [],
    ingredients: [],
    instructions: '',
    notes: '',
    isFavorite: false
  })
  const [newIngredient, setNewIngredient] = useState({ name: '', quantity: '', unit: '', store: '', price: '' })
  const [scaleServings, setScaleServings] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)

  const units = ['', 'lbs', 'oz', 'kg', 'g', 'cups', 'tbsp', 'tsp', 'bunch', 'heads', 'dozen', 'boxes', 'bags', 'cans', 'cloves', 'slices', 'pieces']
  const tags = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Quick', 'Meal Prep', 'Budget', 'Healthy']

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const result = reader.result
            if (!result || typeof result !== 'string') {
              reject(new Error('FileReader result was empty or invalid'))
              return
            }
            const base64 = result.split(',')[1]
            if (!base64) {
              reject(new Error('Could not extract base64 from FileReader result'))
              return
            }
            resolve(base64)
          } catch (e) {
            reject(new Error('Error processing FileReader result: ' + e.message))
          }
        }
        reader.onerror = () => reject(new Error('FileReader error: ' + (reader.error?.message || 'unknown')))
        reader.readAsDataURL(file)
      } catch (e) {
        reject(new Error('Error starting FileReader: ' + e.message))
      }
    })
  }

  const scanRecipeImage = async (file) => {
    setScanning(true)
    setScanError(null)
    try {
      const base64 = await fileToBase64(file)
      const mediaType = file.type || 'image/jpeg'
      const url = URL.createObjectURL(file)
      setPreviewImage(url)

      const prompt = [
        'You are a recipe reader. Look at this image of a recipe (from a cookbook, magazine, or card) and extract all the information.',
        '',
        'Return ONLY a valid JSON object with this exact structure, no other text:',
        '{',
        '  "name": "recipe name",',
        '  "servings": 4,',
        '  "prepTime": "15 min",',
        '  "cookTime": "30 min",',
        '  "ingredients": [',
        '    { "name": "ingredient name", "quantity": "1", "unit": "cups" }',
        '  ],',
        '  "instructions": "Full step by step instructions as one string, with each step on a new line numbered.",',
        '  "notes": "Any tips, variations, or extra notes from the recipe"',
        '}',
        '',
        'Rules:',
        '- Extract the recipe name exactly as shown',
        '- Servings should be a number. If not shown, use 4.',
        '- prepTime and cookTime should be strings like "15 min". If not shown, use empty string.',
        '- Each ingredient should have name, quantity (as string), and unit',
        '- Instructions should be all steps combined into one string, each step on its own line',
        '- Notes can include any cooking tips, substitutions, or variations mentioned',
        '- If you cannot read something, make your best guess based on context',
        '- Do NOT include prices - those will be added manually later'
      ].join('\n')

      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
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
      
      let parsed
      try {
        parsed = JSON.parse(jsonString)
      } catch (parseErr) {
        throw new Error('JSON parse failed. Extracted string: ' + jsonString.substring(0, 500) + ' ... Parse error: ' + parseErr.message)
      }

      setNewRecipe({
        name: parsed.name || '',
        servings: parseInt(parsed.servings) || 4,
        prepTime: parsed.prepTime || '',
        cookTime: parsed.cookTime || '',
        tags: [],
        familyMembers: [],
        ingredients: (parsed.ingredients || []).map(ing => ({
          name: ing.name || '',
          quantity: String(ing.quantity || ''),
          unit: ing.unit || '',
          store: '',
          price: '',
          id: Date.now() + Math.random()
        })),
        instructions: parsed.instructions || '',
        notes: parsed.notes || '',
        isFavorite: false
      })
    } catch (e) {
      console.error('Scan error:', e)
      setScanError(e.message || 'Unknown error occurred')
    }
    setScanning(false)
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const fileType = file.type.toLowerCase()
    
    if (!validTypes.includes(fileType)) {
      setScanError(`This file format (${fileType || 'unknown'}) is not supported. Please use JPG, PNG, or WEBP. iPhone HEIC photos need to be converted first - try emailing the photo to yourself or saving it from Photos app in a different format.`)
      e.target.value = ''
      return
    }
    
    if (file) scanRecipeImage(file)
    e.target.value = ''
  }

  const addRecipe = () => {
    if (newRecipe.name.trim()) {
      const recipe = {
        ...newRecipe,
        id: Date.now(),
        totalCost: newRecipe.ingredients.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0),
        createdAt: new Date().toISOString(),
        lastMade: null,
        timeMade: 0
      }
      setRecipes([...recipes, recipe])
      setNewRecipe({
        name: '', servings: 4, prepTime: '', cookTime: '', tags: [], familyMembers: [],
        ingredients: [], instructions: '', notes: '', isFavorite: false
      })
      setShowAddForm(false)
      setPreviewImage(null)
      setScanError(null)
      setSelectedRecipe(recipe)
    }
  }

  const addIngredientToForm = () => {
    if (newIngredient.name.trim()) {
      setNewRecipe({
        ...newRecipe,
        ingredients: [...newRecipe.ingredients, { ...newIngredient, id: Date.now() }]
      })
      setNewIngredient({ name: '', quantity: '', unit: '', store: '', price: '' })
    }
  }

  const removeIngredientFromForm = (id) => {
    setNewRecipe({
      ...newRecipe,
      ingredients: newRecipe.ingredients.filter(i => i.id !== id)
    })
  }

  const deleteRecipe = (id) => {
    setRecipes(recipes.filter(r => r.id !== id))
    setSelectedRecipe(null)
  }

  const toggleFavorite = (id) => {
    setRecipes(recipes.map(r => r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
    if (selectedRecipe && selectedRecipe.id === id) {
      setSelectedRecipe({ ...selectedRecipe, isFavorite: !selectedRecipe.isFavorite })
    }
  }

  const toggleTag = (tag) => {
    setNewRecipe({
      ...newRecipe,
      tags: newRecipe.tags.includes(tag) ? newRecipe.tags.filter(t => t !== tag) : [...newRecipe.tags, tag]
    })
  }

  const toggleFamilyMember = (member) => {
    setNewRecipe({
      ...newRecipe,
      familyMembers: newRecipe.familyMembers.includes(member) ? newRecipe.familyMembers.filter(m => m !== member) : [...newRecipe.familyMembers, member]
    })
  }

  const getScaledIngredients = (recipe) => {
    const scale = scaleServings ? scaleServings / recipe.servings : 1
    return recipe.ingredients.map(i => ({
      ...i,
      scaledQty: (parseFloat(i.quantity) * scale).toFixed(parseFloat(i.quantity) % 1 === 0 ? 0 : 1),
      scaledPrice: (parseFloat(i.price || 0) * scale).toFixed(2)
    }))
  }

  const filteredRecipes = recipes.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchTag = filterTag === 'All' || r.tags.includes(filterTag)
    return matchSearch && matchTag
  })

  const favoriteRecipes = filteredRecipes.filter(r => r.isFavorite)
  const otherRecipes = filteredRecipes.filter(r => !r.isFavorite)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8 pt-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-gray-800">Recipe Library</h1>
          <button onClick={() => { setShowAddForm(true); setSelectedRecipe(null); setPreviewImage(null); setScanError(null) }} className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5" /> New Recipe
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search recipes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white" />
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button key={tag} onClick={() => setFilterTag(tag)} className={'px-3 py-1 rounded-full text-sm font-semibold transition ' + (filterTag === tag ? 'bg-purple-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100')}>
                  {tag}
                </button>
              ))}
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {favoriteRecipes.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-500 uppercase">⭐ Favorites</p>
                  {favoriteRecipes.map(recipe => (
                    <button key={recipe.id} onClick={() => { setSelectedRecipe(recipe); setShowAddForm(false); setScaleServings(null) }} className={'w-full text-left p-4 rounded-lg transition ' + (selectedRecipe && selectedRecipe.id === recipe.id ? 'bg-purple-100 border-2 border-purple-500' : 'bg-white border border-gray-200 hover:shadow-md')}>
                      <p className="font-bold text-gray-800">{recipe.name}</p>
                      <p className="text-sm text-gray-600">${recipe.totalCost.toFixed(2)} • {recipe.servings} servings</p>
                    </button>
                  ))}
                </>
              )}
              {otherRecipes.length > 0 && (
                <>
                  {favoriteRecipes.length > 0 && <p className="text-xs font-semibold text-gray-500 uppercase mt-2">All Recipes</p>}
                  {otherRecipes.map(recipe => (
                    <button key={recipe.id} onClick={() => { setSelectedRecipe(recipe); setShowAddForm(false); setScaleServings(null) }} className={'w-full text-left p-4 rounded-lg transition ' + (selectedRecipe && selectedRecipe.id === recipe.id ? 'bg-purple-100 border-2 border-purple-500' : 'bg-white border border-gray-200 hover:shadow-md')}>
                      <p className="font-bold text-gray-800">{recipe.name}</p>
                      <p className="text-sm text-gray-600">${recipe.totalCost.toFixed(2)} • {recipe.servings} servings</p>
                    </button>
                  ))}
                </>
              )}
              {filteredRecipes.length === 0 && (
                <div className="bg-white p-8 rounded-lg text-center">
                  <p className="text-gray-500">No recipes found</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {showAddForm ? (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">New Recipe</h2>
                  <button onClick={() => { setShowAddForm(false); setPreviewImage(null); setScanError(null) }} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-3 font-semibold">📸 Scan a Recipe from a Book</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="cursor-pointer bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 transition relative">
                      <Camera className="w-8 h-8" />
                      <span className="font-semibold">Take Photo</span>
                      <span className="text-xs opacity-80">Point at recipe page</span>
                      <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} style={{position:'absolute',inset:0,opacity:0,width:'100%',height:'100%',cursor:'pointer'}} />
                    </label>
                    <label className="cursor-pointer bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 transition relative">
                      <Upload className="w-8 h-8" />
                      <span className="font-semibold">Upload Image</span>
                      <span className="text-xs opacity-80">From gallery</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{position:'absolute',inset:0,opacity:0,width:'100%',height:'100%',cursor:'pointer'}} />
                    </label>
                  </div>

                  {scanning && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center gap-3">
                      <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                      <p className="text-blue-800 font-semibold">AI is reading the recipe...</p>
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
                      <p className="text-xs text-gray-500 mb-1">Scanned image:</p>
                      <img src={previewImage} alt="Recipe" className="max-h-40 rounded border border-gray-200" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-4">
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="text-sm text-gray-500">or enter manually below</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <input type="text" placeholder="Recipe name" value={newRecipe.name} onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg text-lg font-semibold" />
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Servings</label>
                      <input type="number" value={newRecipe.servings} onChange={(e) => setNewRecipe({ ...newRecipe, servings: parseInt(e.target.value) || 1 })} className="w-full p-2 border border-gray-300 rounded-lg" min="1" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Prep Time</label>
                      <input type="text" placeholder="e.g. 15 min" value={newRecipe.prepTime} onChange={(e) => setNewRecipe({ ...newRecipe, prepTime: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Cook Time</label>
                      <input type="text" placeholder="e.g. 30 min" value={newRecipe.cookTime} onChange={(e) => setNewRecipe({ ...newRecipe, cookTime: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {tags.filter(t => t !== 'All').map(tag => (
                        <button key={tag} onClick={() => toggleTag(tag)} className={'px-3 py-1 rounded-full text-sm transition ' + (newRecipe.tags.includes(tag) ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>{tag}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Who likes this?</label>
                    <div className="flex flex-wrap gap-2">
                      {settings.familyMembers.map(member => (
                        <button key={member} onClick={() => toggleFamilyMember(member)} className={'px-3 py-1 rounded-full text-sm transition ' + (newRecipe.familyMembers.includes(member) ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>{member}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Ingredients</label>
                    <div className="space-y-2">
                      {newRecipe.ingredients.map(ing => (
                        <div key={ing.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                          <span className="flex-1 text-sm text-gray-800">{ing.name} - {ing.quantity} {ing.unit} {ing.store ? '@ ' + ing.store : ''} {ing.price ? '($' + parseFloat(ing.price).toFixed(2) + ')' : ''}</span>
                          <button onClick={() => removeIngredientFromForm(ing.id)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <input type="text" placeholder="Item" value={newIngredient.name} onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })} className="p-2 border border-gray-300 rounded text-sm" onKeyPress={(e) => e.key === 'Enter' && addIngredientToForm()} />
                        <input type="number" placeholder="Qty" value={newIngredient.quantity} onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })} className="p-2 border border-gray-300 rounded text-sm" step="0.5" />
                        <select value={newIngredient.unit} onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })} className="p-2 border border-gray-300 rounded text-sm">
                          {units.map(u => <option key={u} value={u}>{u || 'Unit'}</option>)}
                        </select>
                        <select value={newIngredient.store} onChange={(e) => setNewIngredient({ ...newIngredient, store: e.target.value })} className="p-2 border border-gray-300 rounded text-sm">
                          <option value="">Any Store</option>
                          {settings.stores.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <input type="number" placeholder="Price $" value={newIngredient.price} onChange={(e) => setNewIngredient({ ...newIngredient, price: e.target.value })} className="p-2 border border-gray-300 rounded text-sm" step="0.01" />
                      </div>
                      <button onClick={addIngredientToForm} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded text-sm flex items-center justify-center gap-1">
                        <Plus className="w-4 h-4" /> Add Ingredient
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Instructions</label>
                    <textarea value={newRecipe.instructions} onChange={(e) => setNewRecipe({ ...newRecipe, instructions: e.target.value })} placeholder="Step by step instructions..." className="w-full p-3 border border-gray-300 rounded-lg text-sm" rows="4" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Meal Prep Notes</label>
                    <textarea value={newRecipe.notes} onChange={(e) => setNewRecipe({ ...newRecipe, notes: e.target.value })} placeholder="e.g. Make double batch for freezer..." className="w-full p-3 border border-gray-300 rounded-lg text-sm" rows="2" />
                  </div>
                  <button onClick={addRecipe} className="w-full bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-lg font-semibold text-lg">Save Recipe</button>
                </div>
              </div>
            ) : selectedRecipe ? (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-bold text-gray-800">{selectedRecipe.name}</h2>
                      <button onClick={() => toggleFavorite(selectedRecipe.id)} className="text-2xl">{selectedRecipe.isFavorite ? '⭐' : '☆'}</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedRecipe.tags && selectedRecipe.tags.map(tag => (
                        <span key={tag} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                      {selectedRecipe.familyMembers && selectedRecipe.familyMembers.length > 0 && (
                        <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Users className="w-3 h-3" /> {selectedRecipe.familyMembers.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => deleteRecipe(selectedRecipe.id)} className="text-red-400 hover:text-red-600"><X className="w-6 h-6" /></button>
                </div>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Total Cost</p>
                    <p className="text-xl font-bold text-purple-600">${selectedRecipe.totalCost.toFixed(2)}</p>
                  </div>
                  <div className="bg-pink-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Per Serving</p>
                    <p className="text-xl font-bold text-pink-600">${(selectedRecipe.totalCost / selectedRecipe.servings).toFixed(2)}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Prep Time</p>
                    <p className="text-xl font-bold text-blue-600">{selectedRecipe.prepTime || '—'}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Cook Time</p>
                    <p className="text-xl font-bold text-green-600">{selectedRecipe.cookTime || '—'}</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg mb-6 flex items-center gap-4">
                  <Scale className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-600 font-semibold">Scale to:</span>
                  <input type="number" value={scaleServings || selectedRecipe.servings} onChange={(e) => setScaleServings(parseInt(e.target.value) || 1)} className="w-20 p-2 border border-gray-300 rounded text-center" min="1" />
                  <span className="text-sm text-gray-600">servings</span>
                  {scaleServings && scaleServings !== selectedRecipe.servings && (
                    <button onClick={() => setScaleServings(null)} className="text-sm text-purple-600 hover:text-purple-800 ml-auto">Reset</button>
                  )}
                </div>
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3">Ingredients</h3>
                  <div className="space-y-2">
                    {getScaledIngredients(selectedRecipe).map(ing => (
                      <div key={ing.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div>
                          <p className="font-medium text-gray-800">{ing.name}</p>
                          <p className="text-sm text-gray-600">{ing.scaledQty} {ing.unit} {ing.store ? '@ ' + ing.store : ''}</p>
                        </div>
                        <p className="font-semibold text-green-600">${ing.scaledPrice}</p>
                      </div>
                    ))}
                  </div>
                  {scaleServings && scaleServings !== selectedRecipe.servings && (
                    <p className="text-sm text-purple-600 mt-2">Scaled total: ${(selectedRecipe.totalCost * (scaleServings / selectedRecipe.servings)).toFixed(2)}</p>
                  )}
                </div>
                {selectedRecipe.instructions && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-800 mb-3">Instructions</h3>
                    <div className="bg-gray-50 p-4 rounded-lg text-gray-700 whitespace-pre-wrap">{selectedRecipe.instructions}</div>
                  </div>
                )}
                {selectedRecipe.notes && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-800 mb-3">📝 Meal Prep Notes</h3>
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-gray-700">{selectedRecipe.notes}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Select a recipe or create a new one</p>
                <p className="text-sm text-gray-400 mt-2">You can scan recipes from books using your camera!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
