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
    priceFilter, setPriceFilter,
    fetchInventory, handleImport,
  } = useInventory()
  const { servers } = useServersContext()

  const {
    search, setSearch,
    minLiquidity, setMinLiquidity,
    sort, handleSort,
    filteredItems, totals,
    fieldMap,
  } = useInventoryTable(inventory, priceFilter)

  return (
    <div className="p-6 max-w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Stash Inventory</h1>
          <p className="text-gray-400 text-sm mt-1">{total} item{total !== 1 ? 's' : ''} in stash</p>
        </div>
        {inventory.length > 0 && (
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-xs text-gray-400">Conservative (buy/NPC)</p>
              <p className="text-base font-bold text-yellow-400">{totals.buy.toLocaleString()} gp</p>
            </div>
            {selectedServerId && totals.sell > 0 && (
              <div>
                <p className="text-xs text-gray-400">Server sell</p>
                <p className="text-base font-bold text-orange-400">{totals.sell.toLocaleString()} gp</p>
              </div>
            )}
            {totals.topBuy > 0 && (
              <div>
                <p className="text-xs text-gray-400">Top server buy</p>
                <p className="text-base font-bold text-blue-400">{totals.topBuy.toLocaleString()} gp</p>
              </div>
            )}
            {totals.globalBuy > 0 && (
              <div>
                <p className="text-xs text-gray-400">Global avg buy</p>
                <p className="text-base font-bold text-gray-300">{totals.globalBuy.toLocaleString()} gp</p>
              </div>
            )}
            {totals.globalSell > 0 && (
              <div>
                <p className="text-xs text-gray-400">Global avg sell</p>
                <p className="text-base font-bold text-green-400">{totals.globalSell.toLocaleString()} gp</p>
              </div>
            )}
          </div>
        )}
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
        priceFilter={priceFilter} onPriceFilter={setPriceFilter}
        minLiquidity={minLiquidity} onMinLiquidity={setMinLiquidity}
        weeklyOnly={weeklyOnly} onWeeklyOnly={setWeeklyOnly}
        selectedCategory={selectedCategory} onCategory={setSelectedCategory} categories={categories}
        selectedServerId={selectedServerId} onServerId={setSelectedServerId} servers={servers}
        loading={loading} onRefresh={fetchInventory}
        onImport={() => { setShowImport(true); setImportResult(null) }}
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
          avgBuyField={fieldMap.avgBuyField}
          avgSellField={fieldMap.avgSellField}
          topServerNameField={fieldMap.topServerNameField}
          topServerBuyField={fieldMap.topServerBuyField}
          topServerSellField={fieldMap.topServerSellField}
        />
      )}
    </div>
  )
}

export default Inventory
