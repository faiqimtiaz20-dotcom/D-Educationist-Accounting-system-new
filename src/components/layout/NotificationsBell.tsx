import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { isApiMode } from '@/lib/api-client'
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/lib/notifications-api'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

function relativeTime(iso: string) {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function NotificationsBell() {
  const api = isApiMode()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)

  const refreshCount = useCallback(async () => {
    if (!api) return
    try {
      const res = await getUnreadNotificationCount()
      setUnread(res.count)
    } catch {
      /* ignore poll errors */
    }
  }, [api])

  const refreshList = useCallback(async () => {
    if (!api) return
    setLoading(true)
    try {
      const [list, countRes] = await Promise.all([
        listNotifications({ take: 25 }),
        getUnreadNotificationCount(),
      ])
      setItems(list)
      setUnread(countRes.count)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    if (!api) return
    void refreshCount()
    const id = window.setInterval(() => void refreshCount(), 45_000)
    return () => window.clearInterval(id)
  }, [api, refreshCount])

  useEffect(() => {
    if (open && api) void refreshList()
  }, [open, api, refreshList])

  const onOpenChange = (next: boolean) => {
    setOpen(next)
  }

  const onItemClick = async (n: AppNotification) => {
    try {
      if (!n.isRead) {
        await markNotificationRead(n.id)
        setItems((prev) =>
          prev.map((x) =>
            x.id === n.id
              ? { ...x, isRead: true, readAt: new Date().toISOString() }
              : x,
          ),
        )
        setUnread((c) => Math.max(0, c - 1))
      }
    } catch {
      /* still navigate */
    }
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  const onMarkAll = async () => {
    try {
      await markAllNotificationsRead()
      setItems((prev) =>
        prev.map((x) => ({
          ...x,
          isRead: true,
          readAt: x.readAt ?? new Date().toISOString(),
        })),
      )
      setUnread(0)
      toast.success('All notifications marked read')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  if (!api) {
    return (
      <Button variant="ghost" size="icon" title="Notifications (API mode)" disabled>
        <Bell className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unread > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => void onMarkAll()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <ScrollArea className="h-[320px]">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              No notifications yet
            </p>
          ) : (
            items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="cursor-pointer items-start gap-2 rounded-none px-3 py-2.5"
                onClick={() => void onItemClick(n)}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    n.isRead ? 'bg-transparent' : 'bg-primary'
                  }`}
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p
                    className={`text-sm leading-snug ${
                      n.isRead ? 'font-normal' : 'font-medium'
                    }`}
                  >
                    {n.title}
                  </p>
                  {n.body ? (
                    <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground">
                    {relativeTime(n.createdAt)}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
