import './globals.css'
import type { Metadata } from 'next'
// Font removed to prevent hang

export const metadata: Metadata = {
  title: 'Trust Database Portal',
  description: 'Manage trust fund sponsorships for students',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
