import { memo } from 'react'
import PropTypes from 'prop-types'
import { ArrowRight } from 'lucide-react'
import { COLOR_CLASSES } from '../../constants/items'

const QuickActionCard = memo(function QuickActionCard({ 
  icon: Icon, 
  title, 
  description, 
  color = 'blue',
  href,
  isLink = true 
}) {
  const baseClasses = "bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700 transition-all"
  const interactiveClasses = isLink 
    ? "hover:border-gray-600 group cursor-pointer" 
    : "bg-gray-800/50 border-gray-700/50"

  const content = (
    <div className="flex items-start gap-4">
      <div className={`p-3 rounded-lg border ${COLOR_CLASSES[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {isLink && (
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
          )}
        </div>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
  )

  if (isLink && href) {
    return (
      <a href={href} className={`${baseClasses} ${interactiveClasses}`}>
        {content}
      </a>
    )
  }

  return (
    <div className={`${baseClasses} ${interactiveClasses}`}>
      {content}
    </div>
  )
})

QuickActionCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  color: PropTypes.oneOf(['yellow', 'amber', 'gray', 'blue', 'purple']),
  href: PropTypes.string,
  isLink: PropTypes.bool
}

export default QuickActionCard
