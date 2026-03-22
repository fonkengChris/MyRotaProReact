import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { messagesApi, usersApi } from '@/lib/api'
import { extractUserDefaultHomeId, MessageConversationSummary } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  UserPlusIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import { format, isToday, isYesterday } from 'date-fns'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'

function formatMessageTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return `Yesterday ${format(d, 'HH:mm')}`
  return format(d, 'd MMM yyyy, HH:mm')
}

const Messages: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userHomeId = user ? extractUserDefaultHomeId(user) : undefined
  const [selectedOtherId, setSelectedOtherId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list')
  const [draft, setDraft] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newRecipientId, setNewRecipientId] = useState('')
  const [newFirstMessage, setNewFirstMessage] = useState('')
  const threadEndRef = useRef<HTMLDivElement>(null)

  const canUseMessaging = !!user && (user.role === 'admin' || !!userHomeId)

  const { data: recipients = [], isLoading: recipientsLoading } = useQuery({
    queryKey: ['users', 'messages-recipients', user?.id, userHomeId],
    queryFn: () =>
      user!.role === 'admin'
        ? usersApi.getAll({ is_active: true })
        : usersApi.getAll({ home_id: userHomeId!, is_active: true }),
    enabled: canUseMessaging,
    select: (data) =>
      (Array.isArray(data) ? data : [])
        .filter((u) => u.is_active && u.id !== user?.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
  })

  const { data: conversations = [], isLoading: convLoading } = useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: () => messagesApi.getConversations(),
    enabled: !!user && canUseMessaging,
    refetchInterval: 20_000,
    select: (data) => (Array.isArray(data) ? data : []),
  })

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ['messages', 'thread', selectedOtherId],
    queryFn: () => messagesApi.getThread(selectedOtherId!),
    enabled: !!selectedOtherId && canUseMessaging,
    refetchInterval: 15_000,
  })

  const sendMutation = useMutation({
    mutationFn: ({ to_user_id, body }: { to_user_id: string; body: string }) =>
      messagesApi.send(to_user_id, body),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages', 'thread', vars.to_user_id] })
      setDraft('')
    },
    onError: () => {
      toast.error('Could not send message')
    },
  })

  const startFirstConversation = useMutation({
    mutationFn: ({ to_user_id, body }: { to_user_id: string; body: string }) =>
      messagesApi.send(to_user_id, body),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages', 'thread', vars.to_user_id] })
      setSelectedOtherId(vars.to_user_id)
      setShowNew(false)
      setNewRecipientId('')
      setNewFirstMessage('')
      setMobileView('thread')
    },
    onError: () => {
      toast.error('Could not send message')
    },
  })

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread?.messages?.length, selectedOtherId])

  const conversationByOtherId = useMemo(() => {
    const m = new Map<string, MessageConversationSummary>()
    for (const c of conversations) {
      m.set(c.other_user.id, c)
    }
    return m
  }, [conversations])

  const openThread = (otherId: string) => {
    setSelectedOtherId(otherId)
    setMobileView('thread')
    setShowNew(false)
  }

  const headerName =
    thread?.other_user?.name ??
    conversationByOtherId.get(selectedOtherId ?? '')?.other_user.name ??
    recipients.find((r) => r.id === selectedOtherId)?.name

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOtherId || !draft.trim() || sendMutation.isPending) return
    sendMutation.mutate({ to_user_id: selectedOtherId, body: draft.trim() })
  }

  const handleNewConversation = (e: React.FormEvent) => {
    e.preventDefault()
    const body = newFirstMessage.trim()
    if (!newRecipientId || !body || startFirstConversation.isPending) return
    startFirstConversation.mutate({ to_user_id: newRecipientId, body })
  }

  const listRows = useMemo(() => {
    const fromConv = [...conversations]
    const idsInConv = new Set(fromConv.map((c) => c.other_user.id))
    const extras = recipients
      .filter((r) => !idsInConv.has(r.id))
      .map((r) => ({
        other_user: { id: r.id, name: r.name, email: r.email, role: r.role },
        last_body: '',
        last_at: '',
        last_from_me: false,
        unread_count: 0,
        isPlaceholder: true as const,
      }))
    const placeholders = extras.map((e) => ({
      ...e,
      last_body: 'No messages yet — tap to start',
      last_at: new Date(0).toISOString(),
    }))
    return [...fromConv, ...placeholders].sort((a, b) => {
      const ap = 'isPlaceholder' in a && a.isPlaceholder
      const bp = 'isPlaceholder' in b && b.isPlaceholder
      if (ap && !bp) return 1
      if (!ap && bp) return -1
      return new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
    })
  }, [conversations, recipients])

  if (!user) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!canUseMessaging) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="h-6 w-6" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-600 dark:text-neutral-400">
            You need a home assignment to exchange messages with colleagues. Ask an administrator to add you to a
            home, or use an admin account.
          </p>
        </CardContent>
      </Card>
    )
  }

  const listPanel = (
    <Card className={cn('flex flex-col h-[min(70vh,640px)] lg:h-[calc(100vh-12rem)]', mobileView === 'thread' && 'hidden lg:flex')}>
      <CardHeader className="pb-2 border-b border-neutral-200 dark:border-neutral-700 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
            Conversations
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowNew((s) => !s)
              if (!showNew) setNewRecipientId('')
            }}
          >
            <UserPlusIcon className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
        {showNew && (
          <form onSubmit={handleNewConversation} className="mt-4 space-y-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-3 border border-neutral-200 dark:border-neutral-700">
            <div>
              <label className="form-label">To</label>
              <select
                className="input w-full"
                value={newRecipientId}
                onChange={(e) => setNewRecipientId(e.target.value)}
                disabled={recipientsLoading || startFirstConversation.isPending}
              >
                <option value="">Select a colleague…</option>
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Message</label>
              <textarea
                className="input min-h-[80px] w-full resize-y"
                value={newFirstMessage}
                onChange={(e) => setNewFirstMessage(e.target.value)}
                placeholder="Write your first message…"
                maxLength={8000}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!newRecipientId || !newFirstMessage.trim() || startFirstConversation.isPending}>
                {startFirstConversation.isPending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </form>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        {convLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : listRows.length === 0 ? (
          <p className="p-4 text-sm text-neutral-600 dark:text-neutral-400">No colleagues found for messaging.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {listRows.map((row) => {
              const oid = row.other_user.id
              const active = selectedOtherId === oid
              const placeholder = Boolean('isPlaceholder' in row && row.isPlaceholder)
              return (
                <li key={oid}>
                  <button
                    type="button"
                    onClick={() => openThread(oid)}
                    className={cn(
                      'w-full text-left px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/80',
                      active && 'bg-primary-50 dark:bg-primary-950/30 border-l-4 border-l-primary-500'
                    )}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate">{row.other_user.name}</span>
                      {!placeholder && row.unread_count > 0 && (
                        <span className="shrink-0 rounded-full bg-primary-500 text-white text-xs font-semibold px-2 py-0.5 min-w-[1.25rem] text-center">
                          {row.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate mt-0.5">
                      {placeholder ? row.last_body : row.last_from_me ? `You: ${row.last_body}` : row.last_body}
                    </p>
                    {!placeholder && row.last_at && (
                      <p className="text-xs text-neutral-500 mt-1">{formatMessageTime(row.last_at)}</p>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )

  const threadPanel = (
    <Card className={cn('flex flex-col h-[min(70vh,640px)] lg:h-[calc(100vh-12rem)]', mobileView === 'list' && 'hidden lg:flex')}>
      <CardHeader className="pb-2 border-b border-neutral-200 dark:border-neutral-700 shrink-0">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileView('list')}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <CardTitle className="text-lg truncate">
            {selectedOtherId ? headerName ?? 'Messages' : 'Select a conversation'}
          </CardTitle>
        </div>
        {selectedOtherId && thread?.other_user && (
          <p className="text-sm text-neutral-500 truncate">{thread.other_user.email}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        {!selectedOtherId ? (
          <div className="flex-1 flex items-center justify-center p-6 text-neutral-500 text-center">
            Choose someone from the list or start a new conversation.
          </div>
        ) : threadLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {(thread?.messages ?? []).map((m) => {
                const mine = m.from_user_id === user.id
                return (
                  <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                        mine
                          ? 'bg-primary-600 text-white rounded-br-md'
                          : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-bl-md'
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p
                        className={cn(
                          'text-[10px] mt-1 opacity-80',
                          mine ? 'text-primary-100' : 'text-neutral-500 dark:text-neutral-400'
                        )}
                      >
                        {formatMessageTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={threadEndRef} />
            </div>
            <form onSubmit={handleSend} className="border-t border-neutral-200 dark:border-neutral-700 p-3 flex gap-2 shrink-0 bg-neutral-50/80 dark:bg-neutral-900/40">
              <textarea
                className="input flex-1 min-h-[44px] max-h-32 resize-y"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                maxLength={8000}
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(e)
                  }
                }}
              />
              <Button type="submit" className="self-end shrink-0" disabled={!draft.trim() || sendMutation.isPending}>
                <PaperAirplaneIcon className="h-5 w-5" />
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 font-display">Messages</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1 text-sm">
          Chat with colleagues in your organisation. You can message people who share a home with you; administrators
          can message any active user.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">{listPanel}</div>
        <div className="lg:col-span-3">{threadPanel}</div>
      </div>
    </div>
  )
}

export default Messages
