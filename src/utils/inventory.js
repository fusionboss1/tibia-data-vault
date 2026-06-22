export function sortInventoryItems(items, sortKey, sortDir) {
  const isStr = sortKey === 'item_name'
  return [...items].sort((a, b) => {
    const av = a[sortKey] ?? (isStr ? '' : -1)
    const bv = b[sortKey] ?? (isStr ? '' : -1)
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })
}

export function filterInventoryItems(items, { search }) {
  const searchLower = search.trim().toLowerCase()
  return searchLower
    ? items.filter(item => item.item_name.toLowerCase().includes(searchLower))
    : items
}
