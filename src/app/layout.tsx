import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MEMORY FORGE — 54-Card PAO Memory Training System',
  description:
    'Master your custom 54-card Person-Action-Object memory system with genuine spaced repetition, 3-card mental triad visualization, and precision recall analytics.',
  keywords: [
    'PAO Memory',
    'Person Action Object',
    'Spaced Repetition',
    'Memory Palace',
    'Card Memorization',
    'Cognitive Training',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#07090e] text-[#E2E8F0] antialiased min-h-screen selection:bg-indigo-600 selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
