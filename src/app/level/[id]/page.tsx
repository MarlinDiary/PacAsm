import { notFound } from 'next/navigation'

interface LevelPageProps {
  params: { id: string }
}

export default function LevelPage({ params }: LevelPageProps) {
  // Only allow level 1
  if (params.id !== '1') {
    notFound()
  }

  return (
    <div>
      Level {params.id}
    </div>
  )
}