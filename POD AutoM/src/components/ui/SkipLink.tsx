// =====================================================
// SKIP LINK COMPONENT
// =====================================================
// Allows keyboard users to skip navigation and go directly
// to the main content. This is an important accessibility feature.

interface SkipLinkProps {
  targetId?: string
  children?: string
}

export function SkipLink({
  targetId = 'main-content',
  children = 'Zum Hauptinhalt springen',
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100]
                 focus:px-4 focus:py-2 focus:bg-violet-500 focus:text-white focus:rounded-lg
                 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2
                 focus:ring-offset-black"
    >
      {children}
    </a>
  )
}

export default SkipLink
