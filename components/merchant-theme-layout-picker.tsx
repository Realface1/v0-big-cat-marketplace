'use client'

import { WEBSITE_THEMES, WEBSITE_LAYOUTS, type WebsiteTheme, type WebsiteLayout } from '@/lib/merchant-website'

interface MerchantThemeLayoutPickerProps {
  selectedTheme: WebsiteTheme
  selectedLayout: WebsiteLayout
  onThemeChange: (theme: WebsiteTheme) => void
  onLayoutChange: (layout: WebsiteLayout) => void
}

export function MerchantThemeLayoutPicker({
  selectedTheme,
  selectedLayout,
  onThemeChange,
  onLayoutChange,
}: MerchantThemeLayoutPickerProps) {
  return (
    <div className="space-y-8 rounded-lg border border-gray-200 p-6 bg-white">
      {/* Theme Section */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-1">Store Theme</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose a color scheme that reflects your brand. Each theme is optimized for readability and conversion.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {WEBSITE_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onThemeChange(theme.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedTheme === theme.id
                  ? 'border-emerald-600 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Theme color preview */}
              <div className={`w-full h-12 rounded mb-2 bg-gradient-to-r ${getThemeGradient(theme.id)} shadow-sm`} />
              <p className="text-xs font-semibold text-gray-900">{theme.label}</p>
              <p className="text-xs text-gray-600 mt-1">{theme.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Layout Section */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="font-semibold text-gray-900 mb-1">Store Layout</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select how products and content are arranged. Find a layout that matches your store's style.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {WEBSITE_LAYOUTS.map((layout) => (
            <button
              key={layout.id}
              onClick={() => onLayoutChange(layout.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedLayout === layout.id
                  ? 'border-emerald-600 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Layout preview icon */}
              <div className="w-full h-12 rounded mb-2 bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
                {getLayoutPreviewIcon(layout.id)}
              </div>
              <p className="text-xs font-semibold text-gray-900">{layout.label}</p>
              <p className="text-xs text-gray-600 mt-1">{layout.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Info section */}
      <div className="border-t border-gray-200 pt-6 bg-emerald-50 p-4 rounded-lg">
        <p className="text-sm text-emerald-900">
          <strong>💡 Pro tip:</strong> Choose a theme that matches your brand colors. Combine with a layout that highlights your best products.
        </p>
      </div>
    </div>
  )
}

function getThemeGradient(themeId: WebsiteTheme): string {
  const gradients: Record<WebsiteTheme, string> = {
    emerald: 'from-emerald-600 via-green-600 to-lime-500',
    midnight: 'from-slate-900 via-slate-800 to-indigo-900',
    sunset: 'from-orange-500 via-rose-500 to-fuchsia-600',
    sapphire: 'from-blue-600 via-cyan-500 to-teal-500',
    rose: 'from-rose-500 via-pink-500 to-red-500',
    gold: 'from-yellow-600 via-amber-500 to-orange-500',
    slate: 'from-gray-700 via-gray-600 to-gray-800',
    violet: 'from-violet-600 via-purple-600 to-fuchsia-500',
    teal: 'from-teal-600 via-cyan-500 to-blue-500',
  }
  return gradients[themeId] || gradients.emerald
}

function getLayoutPreviewIcon(layoutId: WebsiteLayout): string {
  const icons: Record<WebsiteLayout, string> = {
    classic: '||',
    minimal: '|',
    bold: '█',
    modern: '◻◻',
    elegant: '≈',
    playful: '◯',
    professional: '▦',
    showcase: '❖',
  }
  return icons[layoutId] || '||'
}
