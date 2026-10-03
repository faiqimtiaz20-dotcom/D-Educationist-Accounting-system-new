import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isApiMode } from '@/lib/api-client'
import { displayRoleLabel } from '@/lib/api-auth-types'
import { changeMyPassword, updateMyProfile } from '@/lib/profile-api'
import { useCurrentUser } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/auth-store'
import { useDataStore } from '@/store/data-store'
import { Loader2, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function ProfilePage() {
  const api = isApiMode()
  const user = useCurrentUser()
  const apiUser = useAuthStore((s) => s.apiUser)
  const setApiUser = useAuthStore((s) => s.setApiUser)
  const updateUser = useDataStore((s) => s.updateUser)

  const [fullName, setFullName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(apiUser?.phone ?? '')
  const [busyProfile, setBusyProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busyPassword, setBusyPassword] = useState(false)

  useEffect(() => {
    setFullName(user?.name ?? '')
    setEmail(user?.email ?? '')
    setPhone(apiUser?.phone ?? '')
  }, [user?.name, user?.email, apiUser?.phone])

  const roleLabel = displayRoleLabel(user?.role ?? '', {
    isCrmAdmin: Boolean(apiUser?.isCrmAdmin),
    roleName: apiUser?.roleName,
  })

  const saveProfile = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error('Name must be at least 2 characters')
      return
    }
    if (!email.trim()) {
      toast.error('Email is required')
      return
    }
    setBusyProfile(true)
    try {
      if (api) {
        const res = await updateMyProfile({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
        })
        setApiUser(res.user)
        toast.success('Profile updated')
      } else if (user) {
        updateUser(user.id, {
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
        })
        toast.success('Profile updated (local)')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusyProfile(false)
    }
  }

  const savePassword = async () => {
    if (!currentPassword) {
      toast.error('Enter your current password')
      return
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match')
      return
    }
    setBusyPassword(true)
    try {
      if (api) {
        const res = await changeMyPassword({
          currentPassword,
          newPassword,
        })
        toast.success(res.message ?? 'Password updated')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.success('Password updated (local demo — not persisted to server)')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Password change failed')
    } finally {
      setBusyPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="Update your name, contact details, and password"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserRound className="h-4 w-4" /> Account details
            </CardTitle>
            <CardDescription>
              {roleLabel}
              {apiUser?.branchName ? ` · ${apiUser.branchName}` : ''}
              {apiUser?.tenantName ? ` · ${apiUser.tenantName}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full name</Label>
              <Input
                id="profile-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 …"
                autoComplete="tel"
                disabled={!api}
              />
              {!api ? (
                <p className="text-xs text-muted-foreground">
                  Phone requires API mode.
                </p>
              ) : null}
            </div>
            <Button disabled={busyProfile} onClick={() => void saveProfile()}>
              {busyProfile ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save profile
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change password</CardTitle>
            <CardDescription>
              Other sessions will be signed out after a successful change.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button
              disabled={busyPassword}
              onClick={() => void savePassword()}
            >
              {busyPassword ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Update password
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
