import React from 'react'
import {createRoot} from 'react-dom/client'
import '@fontsource-variable/golos-text/index.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './style.css'
import {I18nProvider} from './i18n'
import App from './App'

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
  <React.StrictMode>
    <I18nProvider>
      <App/>
    </I18nProvider>
  </React.StrictMode>,
)
