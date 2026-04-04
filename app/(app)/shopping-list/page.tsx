import { TopBar } from '@/components/layout/TopBar'
import { ShoppingListView } from '@/components/shopping/ShoppingListView'

export default function ShoppingListPage() {
  return (
    <>
      <TopBar title="Einkaufsliste" />
      <main className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full">
        <ShoppingListView />
      </main>
    </>
  )
}
