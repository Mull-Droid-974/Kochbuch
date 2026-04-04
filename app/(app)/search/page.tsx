import { TopBar } from '@/components/layout/TopBar'
import { IngredientSearch } from '@/components/search/IngredientSearch'

export default function SearchPage() {
  return (
    <>
      <TopBar title="Zutatensuche" />
      <main className="flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full">
        <IngredientSearch />
      </main>
    </>
  )
}
