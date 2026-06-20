import { useMemo } from 'react'
import PropTypes from 'prop-types'

function FilterSelect({ label, value, onChange, options, allLabel = 'All' }) {
  const filteredOptions = useMemo(() => options.filter(opt => opt !== 'All'), [options])

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      >
        <option value="All">{allLabel}</option>
        {filteredOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

FilterSelect.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  allLabel: PropTypes.string
}

export default FilterSelect
