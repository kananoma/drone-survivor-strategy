import React, { ReactNode } from 'react'

interface MobileControlsDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export const MobileControlsDrawer: React.FC<MobileControlsDrawerProps> = ({ isOpen, onClose, children }) => {
  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ease-in-out ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-60" onClick={onClose} aria-label="Close menu"></div>

      {/* Drawer Content */}
      <div
        className={`absolute top-0 left-0 h-full w-full max-w-xs bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 id="drawer-title" className="text-lg font-semibold text-sky-300">
            Menu
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
            aria-label="Close menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-65px)] no-scrollbar">{children}</div>
      </div>
    </div>
  )
}
