import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'

interface RowActionsProps {
  onEdit: () => void
  onDelete: () => void
}

export function RowActions({ onEdit, onDelete }: RowActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={onEdit} title="Edit">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onDelete} title="Delete" className="text-destructive hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
