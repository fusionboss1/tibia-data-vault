import PropTypes from 'prop-types'

function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-xl">{message}</div>
    </div>
  )
}

LoadingSpinner.propTypes = {
  message: PropTypes.string
}

export default LoadingSpinner
