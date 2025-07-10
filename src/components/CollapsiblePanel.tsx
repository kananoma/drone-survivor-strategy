import React, { useState, useEffect, ReactNode } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

interface CollapsiblePanelProps {
  titleKey: string
  children: ReactNode
  defaultOpenOnMobile?: boolean // If true, panel starts open on mobile. Defaults to false (collapsed).
  className?: string // For the main div wrapper of the panel
  contentClassName?: string // Class for the content div that collapses/expands
  titleButtonClassName?: string // Class for the button element serving as the title/toggle
  icon?: string // Optional icon for the title
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  titleKey,
  children,
  defaultOpenOnMobile = false,
  className = 'bg-gray-800 rounded-lg shadow-xl w-full',
  contentClassName = 'p-4',
  titleButtonClassName = 'p-4 text-md font-semibold text-sky-300 w-full flex justify-between items-center focus:outline-none',
  icon,
}) => {
  const { t } = useLanguage()
  const [isMobile, setIsMobile] = useState(false)
  const [isExpanded, setIsExpanded] = useState(defaultOpenOnMobile)

  useEffect(() => {
    const checkIsMobile = () => window.innerWidth < 768 // md breakpoint

    const handleResize = () => {
      const mobile = checkIsMobile()
      setIsMobile(mobile)
      // Desktop is always expanded. Mobile state is preserved on resize unless crossing breakpoint.
      if (!mobile) {
        setIsExpanded(true)
      }
    }

    // Initial check
    const initialMobile = checkIsMobile()
    setIsMobile(initialMobile)
    setIsExpanded(initialMobile ? defaultOpenOnMobile : true)

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [defaultOpenOnMobile])

  const toggleExpand = () => {
    // Only allow user to toggle on mobile.
    if (isMobile) {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <div className={className}>
      <button
        onClick={toggleExpand}
        className={titleButtonClassName}
        aria-expanded={isExpanded}
        aria-controls={`collapsible-content-${titleKey}`}
        // The button is only a toggle on mobile. On desktop, it's just a static header.
        // We use isMobile to control the click handler's effect and the visibility of the icon.
      >
        <span className="text-left">
          {icon && <span className="mr-2">{icon}</span>}
          {t(titleKey)}
        </span>
        {isMobile && ( // Only show expand/collapse icon on mobile
          <span
            className={`transform transition-transform duration-200 ease-in-out ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
          >
            ▼
          </span>
        )}
      </button>

      <div id={`collapsible-content-${titleKey}`} className={`${isExpanded ? 'block' : 'hidden'} ${contentClassName}`}>
        {children}
      </div>
    </div>
  )
}
