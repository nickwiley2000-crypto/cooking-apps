import { useState } from 'react'
import { Plus, X, Save } from 'lucide-react'

export default function SettingsPanel({ settings, setSettings }) {
  const [newStore, setNewStore] = useState('')
  const [newMember, setNewMember] = useState('')

  const addStore = () => {
    if (newStore.trim() && !settings.stores.includes(newStore.trim())) {
      setSettings({ ...settings, stores: [...settings.stores, newStore.trim()] })
      setNewStore('')
    }
  }

  const removeStore = (store) => {
    setSettings({ ...settings, stores: settings.stores.filter(s => s !== store) })
  }

  const addMember = () => {
    if (newMember.trim() && !settings.familyMembers.includes(newMember.trim())) {
      setSettings({ ...settings, familyMembers: [...settings.familyMembers, newMember.trim()] })
      setNewMember('')
    }
  }

  const removeMember = (member) => {
    setSettings({ ...settings, familyMembers: settings.familyMembers.filter(m => m !== member) })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-8 pt-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Monthly Budget */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Monthly Budget</h3>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-gray-600">$</span>
              <input
                type="number"
                value={settings.monthlyBudget}
                onChange={(e) => setSettings({ ...settings, monthlyBudget: parseFloat(e.target.value) || 0 })}
                className="flex-1 p-3 border border-gray-300 rounded-lg text-2xl font-semibold"
                step="50"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">Set your monthly grocery budget. You'll get alerts when approaching the limit.</p>
          </div>

          {/* Preferred Stores */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Preferred Stores</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {settings.stores.map(store => (
                <div key={store} className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
                  <span className="font-semibold">{store}</span>
                  <button onClick={() => removeStore(store)} className="text-green-600 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a store..."
                value={newStore}
                onChange={(e) => setNewStore(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addStore()}
                className="flex-1 p-2 border border-gray-300 rounded-lg"
              />
              <button onClick={addStore} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>

          {/* Family Members */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Family Members</h3>
            <p className="text-sm text-gray-500 mb-4">Tag recipes with family members to filter by who likes what.</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {settings.familyMembers.map(member => (
                <div key={member} className="flex items-center gap-2 bg-pink-100 text-pink-800 px-4 py-2 rounded-full">
                  <span className="font-semibold">{member}</span>
                  <button onClick={() => removeMember(member)} className="text-pink-600 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a family member..."
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addMember()}
                className="flex-1 p-2 border border-gray-300 rounded-lg"
              />
              <button onClick={addMember} className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>

          {/* Data Backup */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Data Backup</h3>
            <p className="text-sm text-gray-500 mb-4">Export all your data as a JSON backup file. Import it later to restore everything.</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const data = { settings }
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'kitchen-manager-backup.json'
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Export Backup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
