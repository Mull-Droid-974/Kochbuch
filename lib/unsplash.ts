interface UnsplashPhoto {
  url: string
  alt: string
  credit: string
}

export async function fetchFoodPhoto(query: string): Promise<UnsplashPhoto | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return null

  try {
    const searchQuery = encodeURIComponent(`${query} food`)
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=1&orientation=landscape`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
        next: { revalidate: 3600 }, // cache for 1 hour
      }
    )

    if (!res.ok) return null

    const data = await res.json()
    const photo = data.results?.[0]
    if (!photo) return null

    return {
      url: photo.urls.regular,
      alt: photo.alt_description ?? query,
      credit: photo.user.name,
    }
  } catch {
    return null
  }
}
