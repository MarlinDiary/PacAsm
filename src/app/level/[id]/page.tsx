import { notFound } from 'next/navigation'

interface LevelPageProps {
  params: Promise<{ id: string }>
}

export default async function LevelPage({ params }: LevelPageProps) {
  const { id } = await params
  
  // Only allow level 1
  if (id !== '1') {
    notFound()
  }

  return (
    <div>
      Level {id}
    </div>
  )
}