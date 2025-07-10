import React from 'react'
import { UpgradeOption } from '../types'
import { useLanguage } from '../contexts/LanguageContext'

interface UpgradeModalProps {
  options: UpgradeOption[]
  onSelectOption: (optionId: string) => void
  playerLevel: number
  effectiveLevelForUpgradeContext: number
}

const FormattedDescription: React.FC<{ text: string }> = ({ text }) => {
  // Regex to split the string by numeric parts (including percentages), keeping the numeric parts.
  // The capturing group `(\\d+(?:\\.\\d+)?%?)` is key here.
  const splitRegex = new RegExp('(\\d+(?:\\.\\d+)?%?)', 'g')
  const parts = text.split(splitRegex)

  // Regex to test if a given string part IS a numeric string (e.g., "123", "15.5", "20%")
  // This is non-global, intended for testing individual array elements from the split.
  const numericPartTestRegex = new RegExp('^(\\d+(?:\\.\\d+)?%?)$')

  return (
    <>
      {parts.map((part, index) => {
        // If the part itself matches the standalone numeric pattern, highlight it.
        if (numericPartTestRegex.test(part)) {
          return (
            <span key={index} className="text-green-400 font-bold">
              {part}
            </span>
          )
        }
        // Otherwise, return the part as plain text.
        return part
      })}
    </>
  )
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  options,
  onSelectOption,
  playerLevel,
  effectiveLevelForUpgradeContext,
}) => {
  const { t } = useLanguage()

  if (options.length === 0) {
    return null
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[2000] p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="upgradeModalTitle"
    >
      <div className="bg-gray-800 p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-lg md:max-w-2xl text-white border-2 border-yellow-500 flex flex-col max-h-[90vh]">
        <div className="flex-shrink-0">
          <h2 id="upgradeModalTitle" className="text-2xl md:text-3xl font-bold text-yellow-400 mb-2 text-center">
            {t('UPGRADE_MODAL_TITLE')}
          </h2>
          <p className="text-gray-400 mb-1 text-center text-sm italic">
            {t('UPGRADE_MODAL_CONTEXT_LEVEL_INFO', { level: effectiveLevelForUpgradeContext })}
          </p>
          <p className="text-gray-300 mb-4 text-center text-sm">
            {t('UPGRADE_MODAL_CURRENT_LEVEL_INFO', { playerLevel })}
          </p>
          <p className="text-gray-300 mb-6 text-center text-md md:text-lg">{t('UPGRADE_MODAL_PROMPT')}</p>
        </div>

        <div className="space-y-4 overflow-y-auto pr-2 no-scrollbar flex-grow">
          {options.map((option) => {
            const title = t(option.titleKey, option.titleParams)
            const description = t(option.descriptionKey, option.descriptionParams)

            return (
              <button
                key={option.id}
                onClick={() => onSelectOption(option.id)}
                className="w-full text-left p-4 bg-gray-700 hover:bg-yellow-600 hover:text-gray-900 rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-4 focus:ring-yellow-500 focus:ring-opacity-50 group"
                aria-label={`${t('UPGRADE_MODAL_PROMPT_ARIA_LABEL', { title: title, description: description })}`}
              >
                <h3 className="text-lg font-semibold text-yellow-300 group-hover:text-gray-900">{title}</h3>
                <p className="text-sm text-gray-300 mt-1 group-hover:text-gray-800">
                  <FormattedDescription text={description} />
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
