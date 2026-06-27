import PropTypes from 'prop-types'

function FilterButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
        active
          ? 'bg-emerald-600 text-white border border-emerald-500'
          : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
      }`}
    >
      {label}
    </button>
  )
}

FilterButton.propTypes = {
  label: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
}

export default FilterButton
