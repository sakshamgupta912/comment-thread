'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import {
  createDOMRenderer,
  FluentProvider,
  RendererProvider,
  renderToStyleElements,
  SSRProvider,
  webLightTheme,
} from '@fluentui/react-components'

export function Providers({ children }: { children: ReactNode }) {
  const [renderer] = useState(() => createDOMRenderer())
  useServerInsertedHTML(() => <>{renderToStyleElements(renderer)}</>)
  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider theme={webLightTheme}>{children}</FluentProvider>
      </SSRProvider>
    </RendererProvider>
  )
}
