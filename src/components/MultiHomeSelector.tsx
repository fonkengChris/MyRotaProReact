import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Home } from '@/types'

interface MultiHomeSelectorProps {
  homes: Home[]
  selectedHomes: string[]
  onHomesChange: (homeIds: string[]) => void
  onGenerate: () => void
  isLoading?: boolean
}

const MultiHomeSelector: React.FC<MultiHomeSelectorProps> = ({
  homes,
  selectedHomes,
  onHomesChange,
  onGenerate,
  isLoading = false
}) => {
  const [showSelector, setShowSelector] = useState(false)

  const handleHomeToggle = (homeId: string) => {
    if (selectedHomes.includes(homeId)) {
      onHomesChange(selectedHomes.filter(id => id !== homeId))
    } else {
      onHomesChange([...selectedHomes, homeId])
    }
  }

  const handleSelectAll = () => {
    onHomesChange(homes.map(home => home.id))
  }

  const handleClearAll = () => {
    onHomesChange([])
  }

  const selectedHomesData = homes.filter(home => selectedHomes.includes(home.id))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multi-Home Rota Generation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Select homes for AI rota generation. Staff can be assigned across multiple homes.
              </p>
              <p className="text-sm text-gray-500">
                Selected: {selectedHomes.length} of {homes.length} homes
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={selectedHomes.length === homes.length}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={selectedHomes.length === 0}
              >
                Clear All
              </Button>
            </div>
          </div>

          {showSelector ? (
            <div className="space-y-2">
              {homes.map((home) => (
                <label
                  key={home.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedHomes.includes(home.id)}
                    onChange={() => handleHomeToggle(home.id)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{home.name}</div>
                    <div className="text-sm text-gray-500">
                      {home.location.city}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedHomes.length > 0 
                      ? `${selectedHomes.length} home(s) selected`
                      : 'No homes selected'
                    }
                  </p>
                  {selectedHomes.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedHomesData.map(home => home.name).join(', ')}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSelector(!showSelector)}
                >
                  {showSelector ? 'Hide' : 'Select Homes'}
                </Button>
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              variant="primary"
              onClick={onGenerate}
              disabled={selectedHomes.length === 0 || isLoading}
              className="flex-1"
            >
              {isLoading ? 'Generating...' : `Generate Rota for ${selectedHomes.length} Home(s)`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MultiHomeSelector
