import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react'
import { Language } from '../types'

// Define the shape of your translation files
type Translations = Record<string, string | Record<string, string>> // Allow nested for structure if needed

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const defaultLanguage: Language = 'ja' // Default language

async function loadTranslations(lang: Language): Promise<Translations> {
  try {
    const response = await fetch(`/src/locales/${lang}.json`)
    if (!response.ok) {
      console.error(`[LanguageContext] Failed to load ${lang}.json: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to load ${lang}.json: ${response.statusText}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error(`[LanguageContext] Error loading translations for ${lang}:`, error)
    if (lang !== defaultLanguage) {
      console.warn(`[LanguageContext] Falling back to ${defaultLanguage} translations.`)
      try {
        const fallbackResponse = await fetch(`/src/locales/${defaultLanguage}.json`)
        if (!fallbackResponse.ok) {
          console.error(
            `[LanguageContext] Fallback to ${defaultLanguage}.json also failed: ${fallbackResponse.statusText}`
          )
          if (defaultLanguage !== 'en') {
            console.warn(`[LanguageContext] Trying English as last resort.`)
            const enResponse = await fetch(`/src/locales/en.json`)
            if (enResponse.ok) return await enResponse.json()
            console.error(`[LanguageContext] English fallback also failed.`)
          }
          throw new Error('Failed to load any fallback translations')
        }
        return await fallbackResponse.json()
      } catch (fallbackError) {
        console.error('[LanguageContext] Error during fallback loading:', fallbackError)
        throw fallbackError
      }
    } else if (lang !== 'en') {
      console.warn(`[LanguageContext] Default language ${lang} failed, falling back to English.`)
      try {
        const enResponse = await fetch(`/src/locales/en.json`)
        if (enResponse.ok) return await enResponse.json()
        console.error(`[LanguageContext] English fallback failed.`)
      } catch (enError) {
        console.error('[LanguageContext] Error loading English fallback:', enError)
        throw enError
      }
      throw new Error('Failed to load English fallback translations')
    }
    throw error
  }
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setCurrentLanguage] = useState<Language>(() => {
    // 1. Check URL query parameter
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const langFromQuery = urlParams.get('lang') as Language | null
      if (langFromQuery && (langFromQuery === 'en' || langFromQuery === 'ja')) {
        // Do not set localStorage here yet, setLanguage function will do it.
        return langFromQuery
      }
    }

    // 2. Check localStorage
    if (typeof window !== 'undefined') {
      const storedLang = localStorage.getItem('gameLanguage') as Language | null
      if (storedLang && (storedLang === 'en' || storedLang === 'ja')) {
        return storedLang
      }
    }

    // 3. Check browser language
    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language.split('-')[0] as Language
      if (browserLang === 'ja' || browserLang === 'en') {
        return browserLang
      }
    }

    // 4. Default language
    return defaultLanguage
  })

  const [translations, setTranslations] = useState<Translations>({})

  useEffect(() => {
    loadTranslations(language)
      .then((loadedTrans) => {
        setTranslations(loadedTrans)
      })
      .catch((err) => {
        console.error(`[LanguageContext] Failed to load or set translations for ${language} in useEffect:`, err)
        setTranslations({})
      })
  }, [language])

  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('gameLanguage', lang)
      const url = new URL(window.location.href)
      url.searchParams.set('lang', lang)
      window.history.replaceState({}, '', url.toString()) // Use replaceState to avoid polluting history
    }
  }

  // Effect to synchronize URL param with localStorage and initial state on first load.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const langFromQuery = urlParams.get('lang') as Language | null
      const langFromStorage = localStorage.getItem('gameLanguage') as Language | null

      if (langFromQuery && (langFromQuery === 'en' || langFromQuery === 'ja')) {
        if (language !== langFromQuery) {
          setCurrentLanguage(langFromQuery) // This will trigger the other useEffect to load new translations
        }
        if (langFromStorage !== langFromQuery) {
          localStorage.setItem('gameLanguage', langFromQuery)
        }
      } else if (langFromStorage && (langFromStorage === 'en' || langFromStorage === 'ja')) {
        if (language !== langFromStorage) {
          setCurrentLanguage(langFromStorage)
        }
        // Optionally set URL param if missing and storage has value
        // const url = new URL(window.location.href);
        // url.searchParams.set('lang', langFromStorage);
        // window.history.replaceState({}, '', url.toString());
      }
      // If neither query nor storage has it, initial useState already handled browser/default.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only once on mount to sync URL/localStorage/state

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.')
      let AText: any = translations
      try {
        for (const k of keys) {
          AText = AText[k]
          if (AText === undefined) throw new Error('not found')
        }
        if (typeof AText !== 'string') {
          return key
        }

        let result = AText
        if (params) {
          Object.entries(params).forEach(([paramKey, value]) => {
            const escapedParamKey = paramKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            result = result.replace(new RegExp(`{${escapedParamKey}}`, 'g'), String(value))
          })
        }
        return result
      } catch (e) {
        return key
      }
    },
    [translations]
  )

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
