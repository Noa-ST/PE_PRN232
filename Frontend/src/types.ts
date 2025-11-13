export type Movie = {
  id: number
  title: string
  genre?: string | null
  rating?: number | null
  posterImageUrl?: string | null
  description?: string | null
  createdAt: string
  updatedAt: string
}

export type MovieCreateDto = {
  title: string
  genre?: string | null
  rating?: number | null
  posterImageUrl?: string | null
  description?: string | null
}

export type MovieUpdateDto = {
  title: string
  genre?: string | null
  rating?: number | null
  posterImageUrl?: string | null
  description?: string | null
}