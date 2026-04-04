import { TopBar } from '@/components/layout/TopBar'
import { CookbooksView } from '@/components/cookbook/CookbooksView'

export default function CookbooksPage() {
  return (
    <>
      <TopBar title="Kochbücher" />
      <main className="flex-1 p-4 md:p-6">
        <CookbooksView />
      </main>
    </>
  )
}
