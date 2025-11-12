export type Post = {
  id: number
  name: string
  description: string
  imageUrl?: string | null
  createdAt: string
  updatedAt: string
}

export type PostCreateDto = {
  name: string
  description: string
  imageUrl?: string | null
}

export type PostUpdateDto = {
  name: string
  description: string
  imageUrl?: string | null
}