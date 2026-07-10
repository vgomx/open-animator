export type Acknowledgment = {
  name: string
  url: string
  license: string
}

export const ACKNOWLEDGMENTS: Acknowledgment[] = [
  { name: 'React', url: 'https://react.dev/', license: 'MIT License' },
  { name: 'Radix UI', url: 'https://www.radix-ui.com/', license: 'MIT License' },
  { name: 'shadcn/ui', url: 'https://ui.shadcn.com/', license: 'MIT License' },
  { name: 'Tailwind CSS', url: 'https://tailwindcss.com/', license: 'MIT License' },
  { name: 'Zustand', url: 'https://zustand.docs.pmnd.rs/', license: 'MIT License' },
  { name: 'Vite', url: 'https://vite.dev/', license: 'MIT License' },
  { name: 'Lucide', url: 'https://lucide.dev/', license: 'ISC License' },
  {
    name: 'Geist (Fontsource)',
    url: 'https://fontsource.org/fonts/geist',
    license: 'SIL Open Font License 1.1',
  },
]
