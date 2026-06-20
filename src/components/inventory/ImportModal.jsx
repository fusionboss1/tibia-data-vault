import PropTypes from 'prop-types'
import { Upload, RefreshCw, X, AlertTriangle, Package } from 'lucide-react'

function ImportModal({
  show, onClose,
  logText, onLogText,
  importing, onImport,
  importResult, onDismissResult,
  error, onDismissError,
}) {
  return (
    <>
      {importResult && (
        <div className={`mb-4 p-4 rounded-lg border flex items-start gap-3 ${
          importResult.unmatched_names.length > 0
            ? 'bg-yellow-900/30 border-yellow-700 text-yellow-300'
            : 'bg-green-900/30 border-green-700 text-green-300'
        }`}>
          {importResult.unmatched_names.length > 0
            ? <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
            : <Package className="w-5 h-5 mt-0.5 shrink-0" />
          }
          <div>
            <p className="font-medium">
              Imported {importResult.items_imported} items successfully.
            </p>
            {importResult.unmatched_names.length > 0 && (
              <p className="text-sm mt-1">
                {importResult.unmatched_names.length} unmatched (not in items database):{' '}
                <span className="font-mono">{importResult.unmatched_names.join(', ')}</span>
              </p>
            )}
            {importResult.ambiguous_names?.length > 0 && (
              <p className="text-sm mt-1 text-orange-300">
                {importResult.ambiguous_names.length} ambiguous (best guess used — verify manually):{' '}
                <span className="font-mono">{importResult.ambiguous_names.join(', ')}</span>
              </p>
            )}
          </div>
          <button onClick={onDismissResult} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 rounded-lg border bg-red-900/30 border-red-700 text-red-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={onDismissError} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">Import Server Log</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-gray-400 text-sm mb-3">
                Paste your server log below. Only lines matching{' '}
                <code className="bg-gray-700 px-1 rounded text-yellow-300">HH:MM:SS Retrieved Nx item name.</code>{' '}
                will be processed. This will replace your current stash.
              </p>
              <textarea
                className="w-full h-64 bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-gray-200 font-mono resize-none focus:outline-none focus:border-blue-500"
                placeholder={'17:09:40 Retrieved 196x ancient stone.\n17:09:41 Retrieved 50x health potion.'}
                value={logText}
                onChange={e => onLogText(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onImport}
                disabled={importing || !logText.trim()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                {importing
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importing...</>
                  : <><Upload className="w-4 h-4" /> Import</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

ImportModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  logText: PropTypes.string.isRequired,
  onLogText: PropTypes.func.isRequired,
  importing: PropTypes.bool.isRequired,
  onImport: PropTypes.func.isRequired,
  importResult: PropTypes.object,
  onDismissResult: PropTypes.func.isRequired,
  error: PropTypes.string,
  onDismissError: PropTypes.func.isRequired,
}

export default ImportModal
