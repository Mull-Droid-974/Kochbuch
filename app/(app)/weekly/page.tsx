import { TopBar } from '@/components/layout/TopBar'
import { WeekPlanner } from '@/components/weekly/WeekPlanner'

export default function WeeklyPage() {
  return (
    <>
      <TopBar title="Wochenplan" />
      <main className="flex-1 p-4 md:p-6">
        <WeekPlanner />
      </main>
    </>
  )
}
