import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'

interface PlaceholderPageProps {
  title: string
  subtitle?: string
}

export function PlaceholderPage({ title, subtitle }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle ?? 'Module coming soon'} />
      <EmptyState
        title="Under development"
        description="This module is part of the accounting system scope and will be implemented in a future sprint."
      />
    </div>
  )
}
