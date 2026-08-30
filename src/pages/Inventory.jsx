import { Package } from 'lucide-react'
import { useInventory } from '../hooks/useInventory'
import { useInventoryTable } from '../hooks/useInventoryTable'
import { useServersContext } from '../contexts/ServersContext'
import InventoryFilters from '../components/inventory/InventoryFilters'
import InventoryTable from '../components/inventory/InventoryTable'
import ImportModal from '../components/inventory/ImportModal'

function Inventory() {
  const {
    inventory, categories, total,
    loading, importing,
    logText, setLogText,
    showImport, setShowImport,
    importResult, setImportResult,
    error, setError,
    selectedCategory, setSelectedCategory,
    selectedServerId, setSelectedServerId,
    weeklyOnly, setWeeklyOnly,
    fetchInventory, handleImport,
    wiping, handleWipe,
  } = useInventory()
  const { servers } = useServersContext()

  const {
    search, setSearch,
    sort, handleSort,
    filteredItems,
  } = useInventoryTable(inventory)

  return (
    <div className="pt-6 px-6 pb-2 max-w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Stash Inventory</h1>
        <p className="text-gray-400 text-sm mt-1">{total} item{total !== 1 ? 's' : ''} in stash</p>
      </div>

      <ImportModal
        show={showImport}
        onClose={() => setShowImport(false)}
        logText={logText}
        onLogText={setLogText}
        importing={importing}
        onImport={handleImport}
        importResult={importResult}
        onDismissResult={() => setImportResult(null)}
        error={error}
        onDismissError={() => setError(null)}
      />

      <InventoryFilters
        search={search} onSearch={setSearch}
        weeklyOnly={weeklyOnly} onWeeklyOnly={setWeeklyOnly}
        selectedCategory={selectedCategory} onCategory={setSelectedCategory} categories={categories}
        selectedServerId={selectedServerId} onServerId={setSelectedServerId} servers={servers}
        loading={loading} onRefresh={fetchInventory}
        onImport={() => { setShowImport(true); setImportResult(null) }}
        onWipe={handleWipe}
        wiping={wiping}
      />

      {!loading && inventory.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg">No items in stash</p>
          <p className="text-sm mt-1">Import a server log to populate your inventory</p>
        </div>
      )}

      {filteredItems.length > 0 && (
        <InventoryTable
          items={filteredItems}
          sortKey={sort.key} sortDir={sort.dir} onSort={handleSort}
        />
      )}
    </div>
  )
}

export default Inventory
