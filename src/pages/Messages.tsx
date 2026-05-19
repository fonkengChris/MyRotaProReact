import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { messagesApi, usersApi } from '@/lib/api'
import { Message, MessageConversationSummary, UserRole } from '@/types'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'

function formatRoleLabel(role: UserRole | string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatListTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'd MMM')
}

function formatBubbleTime(iso: string | null): string {
  if (!iso) return ''
  return format(new Date(iso), 'HH:mm')
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEEE, d MMMM')
}

function groupMessagesByDay(messages: Message[]): { label: string; messages: Message[] }[] {
  const groups: { label: string; messages: Message[] }[] = []
  for (const m of messages) {
    const created = m.created_at ?? ''
    const last = groups[groups.length - 1]
    const lastMsg = last?.messages[last.messages.length - 1]
    if (last && lastMsg?.created_at && created && isSameDay(new Date(lastMsg.created_at), new Date(created))) {
      last.messages.push(m)
    } else {
      groups.push({ label: dayLabel(created), messages: [m] })
    }
  }
  return groups
}

function UserAvatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const initial = name?.trim().charAt(0)?.toUpperCase() || '?'
  const sizes = {
    sm: 'h-9 w-9 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-12 w-12 text-base',
  }
  return (
    <div
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 font-semibold text-white shadow-sm ring-2 ring-white dark:ring-neutral-800',
        sizes[size],
        className
      )}
    >
      {initial}
    </div>
  )
}

type ListRow =
  | MessageConversationSummary
  | (MessageConversationSummary & { isPlaceholder: true })

const Messages: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedOtherId, setSelectedOtherId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list')
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [newRecipientId, setNewRecipientId] = useState('')
  const [newFirstMessage, setNewFirstMessage] = useState('')
  const threadEndRef = useRef<HTMLDivElement>(null)
  const composeInputRef = useRef<HTMLTextAreaElement>(null)

  const { data: recipients = [], isLoading: recipientsLoading } = useQuery({
    queryKey: ['users', 'messages-recipients', user?.id],
    queryFn: () => usersApi.getAll({ is_active: true }),
    enabled: !!user,
    select: (data) =>
      (Array.isArray(data) ? data : [])
        .filter((u) => u.is_active && u.id !== user?.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
  })

  const { data: conversations = [], isLoading: convLoading } = useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: () => messagesApi.getConversations(),
    enabled: !!user,
    refetchInterval: 20_000,
    select: (data) => (Array.isArray(data) ? data : []),
  })

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ['messages', 'thread', selectedOtherId],
    queryFn: () => messagesApi.getThread(selectedOtherId!),
    enabled: !!user && !!selectedOtherId,
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
    onError: () => toast.error('Could not send message'),
  })

  const startFirstConversation = useMutation({
    mutationFn: ({ to_user_id, body }: { to_user_id: string; body: string }) =>
      messagesApi.send(to_user_id, body),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages', 'thread', vars.to_user_id] })
      setSelectedOtherId(vars.to_user_id)
      setShowCompose(false)
      setNewRecipientId('')
      setNewFirstMessage('')
      setMobileView('thread')
    },
    onError: () => toast.error('Could not send message'),
  })

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread?.messages?.length, selectedOtherId])

  useEffect(() => {
    if (showCompose) {
      const t = setTimeout(() => composeInputRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
  }, [showCompose])

  const conversationByOtherId = useMemo(() => {
    const m = new Map<string, MessageConversationSummary>()
    for (const c of conversations) m.set(c.other_user.id, c)
    return m
  }, [conversations])

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unread_count, 0),
    [conversations]
  )

  const listRows = useMemo((): ListRow[] => {
    const fromConv = [...conversations]
    const idsInConv = new Set(fromConv.map((c) => c.other_user.id))
    const placeholders = recipients
      .filter((r) => !idsInConv.has(r.id))
      .map((r) => ({
        other_user: { id: r.id, name: r.name, email: r.email, role: r.role },
        last_body: 'Tap to start chatting',
        last_at: new Date(0).toISOString(),
        last_from_me: false,
        unread_count: 0,
        isPlaceholder: true as const,
      }))
    return [...fromConv, ...placeholders].sort((a, b) => {
      const ap = 'isPlaceholder' in a && a.isPlaceholder
      const bp = 'isPlaceholder' in b && b.isPlaceholder
      if (ap && !bp) return 1
      if (!ap && bp) return -1
      return new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
    })
  }, [conversations, recipients])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return listRows
    return listRows.filter(
      (row) =>
        row.other_user.name.toLowerCase().includes(q) ||
        row.other_user.email.toLowerCase().includes(q)
    )
  }, [listRows, search])

  const messageGroups = useMemo(
    () => groupMessagesByDay(thread?.messages ?? []),
    [thread?.messages]
  )

  const openThread = (otherId: string) => {
    setSelectedOtherId(otherId)
    setMobileView('thread')
    setShowCompose(false)
  }

  const headerName =
    thread?.other_user?.name ??
    conversationByOtherId.get(selectedOtherId ?? '')?.other_user.name ??
    recipients.find((r) => r.id === selectedOtherId)?.name

  const headerRole =
    thread?.other_user?.role ??
    conversationByOtherId.get(selectedOtherId ?? '')?.other_user.role ??
    recipients.find((r) => r.id === selectedOtherId)?.role

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!selectedOtherId || !draft.trim() || sendMutation.isPending) return
    sendMutation.mutate({ to_user_id: selectedOtherId, body: draft.trim() })
  }

  const handleNewConversation = (e: React.FormEvent) => {
    e.preventDefault()
    const body = newFirstMessage.trim()
    if (!newRecipientId || !body || startFirstConversation.isPending) return
    startFirstConversation.mutate({ to_user_id: newRecipientId, body })
  }

  if (!user) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const shellHeight =
    'h-[calc(100dvh-5.5rem)] sm:h-[calc(100dvh-6.25rem)] lg:h-[calc(100vh-13.5rem)]'

  const composeSheet = (
    <>
      <button
        type="button"
        aria-label="Close compose"
        className={cn(
          'fixed inset-0 z-40 bg-neutral-900/50 backdrop-blur-sm transition-opacity',
          showCompose ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setShowCompose(false)}
      />
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[min(90dvh,32rem)] flex-col rounded-t-2xl border border-neutral-200 bg-white shadow-2xl transition-transform duration-300 ease-out dark:border-neutral-700 dark:bg-neutral-800',
          'lg:absolute lg:inset-auto lg:right-4 lg:top-20 lg:max-h-[28rem] lg:w-full lg:max-w-sm lg:rounded-2xl lg:shadow-xl',
          showCompose ? 'translate-y-0' : 'pointer-events-none translate-y-full lg:translate-y-2 lg:opacity-0'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-title"
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600 lg:hidden" />
        <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <h2 id="compose-title" className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            New message
          </h2>
          <button
            type="button"
            onClick={() => setShowCompose(false)}
            className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleNewConversation} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div>
            <label htmlFor="compose-to" className="form-label">
              To
            </label>
            <select
              id="compose-to"
              className="input w-full min-h-[44px] text-base"
              value={newRecipientId}
              onChange={(e) => setNewRecipientId(e.target.value)}
              disabled={recipientsLoading || startFirstConversation.isPending}
            >
              <option value="">Choose a colleague…</option>
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {formatRoleLabel(r.role)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="compose-body" className="form-label">
              Message
            </label>
            <textarea
              id="compose-body"
              ref={composeInputRef}
              className="input min-h-[120px] w-full resize-none text-base leading-relaxed"
              value={newFirstMessage}
              onChange={(e) => setNewFirstMessage(e.target.value)}
              placeholder="Say hello…"
              maxLength={8000}
            />
          </div>
          <Button
            type="submit"
            className="w-full min-h-[48px] text-base"
            disabled={!newRecipientId || !newFirstMessage.trim() || startFirstConversation.isPending}
          >
            {startFirstConversation.isPending ? 'Sending…' : 'Send message'}
          </Button>
        </form>
      </div>
    </>
  )

  const listPanel = (
    <div
      className={cn(
        'flex min-h-0 flex-col bg-white dark:bg-neutral-800',
        'lg:rounded-xl lg:border lg:border-neutral-200 lg:shadow-sm dark:lg:border-neutral-700',
        mobileView === 'thread' ? 'hidden lg:flex' : 'flex flex-1 lg:flex-none lg:w-[min(100%,22rem)] xl:w-80'
      )}
    >
      {/* List header */}
      <div className="shrink-0 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-800/95">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-display lg:hidden">
              Messages
            </h1>
            <p className="hidden text-sm text-neutral-500 lg:block">Your conversations</p>
            {totalUnread > 0 && (
              <p className="mt-0.5 text-xs font-medium text-primary-600 dark:text-primary-400">
                {totalUnread} unread
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCompose(true)
              setNewRecipientId('')
              setNewFirstMessage('')
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-600 text-white shadow-md transition hover:bg-primary-700 active:scale-95 lg:h-10 lg:w-10"
            aria-label="New message"
          >
            <PencilSquareIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="relative mt-3">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search colleagues…"
            className="input w-full min-h-[44px] rounded-full border-neutral-200 bg-neutral-50 pl-10 pr-4 text-base dark:border-neutral-600 dark:bg-neutral-900/50"
            aria-label="Search conversations"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {convLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
              <ChatBubbleLeftRightIcon className="h-7 w-7 text-neutral-400" />
            </div>
            <p className="font-medium text-neutral-800 dark:text-neutral-200">
              {search ? 'No matches' : 'No conversations yet'}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {search ? 'Try a different name or email.' : 'Tap the pencil to message a colleague.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-700/80">
            {filteredRows.map((row) => {
              const oid = row.other_user.id
              const active = selectedOtherId === oid
              const placeholder = Boolean('isPlaceholder' in row && row.isPlaceholder)
              const hasUnread = !placeholder && row.unread_count > 0
              const preview = placeholder
                ? row.last_body
                : row.last_from_me
                  ? `You: ${row.last_body}`
                  : row.last_body

              return (
                <li key={oid}>
                  <button
                    type="button"
                    onClick={() => openThread(oid)}
                    className={cn(
                      'flex w-full gap-3 px-4 py-3.5 text-left transition-colors active:bg-neutral-100 dark:active:bg-neutral-700/50',
                      active && 'bg-primary-50/80 dark:bg-primary-950/40',
                      hasUnread && !active && 'bg-primary-50/30 dark:bg-primary-950/20'
                    )}
                  >
                    <UserAvatar name={row.other_user.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className={cn(
                            'truncate text-[15px] text-neutral-900 dark:text-neutral-100',
                            hasUnread ? 'font-bold' : 'font-semibold'
                          )}
                        >
                          {row.other_user.name}
                        </span>
                        {!placeholder && row.last_at && (
                          <span className="shrink-0 text-xs text-neutral-500">{formatListTime(row.last_at)}</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            'truncate text-sm',
                            placeholder
                              ? 'italic text-neutral-400'
                              : hasUnread
                                ? 'font-medium text-neutral-800 dark:text-neutral-200'
                                : 'text-neutral-500 dark:text-neutral-400'
                          )}
                        >
                          {preview}
                        </p>
                        {hasUnread && (
                          <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-primary-500 px-1.5 text-[11px] font-bold text-white">
                            {row.unread_count > 9 ? '9+' : row.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )

  const threadPanel = (
    <div
      className={cn(
        'flex min-h-0 min-w-0 flex-1 flex-col bg-neutral-50 dark:bg-neutral-900/40',
        'lg:rounded-xl lg:border lg:border-neutral-200 lg:shadow-sm dark:lg:border-neutral-700',
        mobileView === 'list' ? 'hidden lg:flex' : 'flex'
      )}
    >
      {!selectedOtherId ? (
        <div className="hidden flex-1 flex-col items-center justify-center px-8 text-center lg:flex">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">Select a conversation</p>
          <p className="mt-2 max-w-xs text-sm text-neutral-500">
            Pick someone from the list or start a new message with the compose button.
          </p>
        </div>
      ) : (
        <>
          {/* Thread header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-neutral-200 bg-white/95 px-3 py-2.5 backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-800/95 sm:px-4">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700 lg:hidden"
              aria-label="Back to conversations"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <UserAvatar name={headerName ?? '?'} size="md" className="lg:ml-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {headerName ?? 'Messages'}
              </p>
              {headerRole && (
                <p className="truncate text-xs capitalize text-neutral-500">{formatRoleLabel(headerRole)}</p>
              )}
            </div>
          </div>

          {/* Messages */}
          {threadLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
                {(thread?.messages ?? []).length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-neutral-500">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messageGroups.map((group) => (
                      <div key={group.label}>
                        <div className="mb-3 flex justify-center">
                          <span className="rounded-full bg-neutral-200/90 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-neutral-600 dark:bg-neutral-700/90 dark:text-neutral-300">
                            {group.label}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {group.messages.map((m) => {
                            const mine = m.from_user_id === user.id
                            return (
                              <div
                                key={m.id}
                                className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                              >
                                <div
                                  className={cn(
                                    'max-w-[min(85%,20rem)] px-3.5 py-2 shadow-sm',
                                    mine
                                      ? 'rounded-2xl rounded-br-md bg-primary-600 text-white'
                                      : 'rounded-2xl rounded-bl-md border border-neutral-200/80 bg-white text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100'
                                  )}
                                >
                                  <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                                    {m.body}
                                  </p>
                                  <p
                                    className={cn(
                                      'mt-1 text-right text-[10px]',
                                      mine ? 'text-primary-200' : 'text-neutral-400'
                                    )}
                                  >
                                    {formatBubbleTime(m.created_at)}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    <div ref={threadEndRef} className="h-1" />
                  </div>
                )}
              </div>

              {/* Composer — safe area for mobile home indicator */}
              <form
                onSubmit={handleSend}
                className="shrink-0 border-t border-neutral-200 bg-white/95 p-3 backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-800/95 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
              >
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Message…"
                    maxLength={8000}
                    rows={1}
                    className="input max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border-neutral-200 bg-neutral-50 py-3 text-base leading-snug dark:border-neutral-600 dark:bg-neutral-900/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    onInput={(e) => {
                      const el = e.currentTarget
                      el.style.height = 'auto'
                      el.style.height = `${Math.min(el.scrollHeight, 128)}px`
                    }}
                    aria-label="Message text"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sendMutation.isPending}
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition',
                      draft.trim()
                        ? 'bg-primary-600 text-white shadow-md hover:bg-primary-700 active:scale-95'
                        : 'bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500'
                    )}
                    aria-label="Send message"
                  >
                    <PaperAirplaneIcon className="h-5 w-5 -rotate-45 translate-x-px" />
                  </button>
                </div>
                <p className="mt-1.5 hidden text-center text-[10px] text-neutral-400 sm:block">
                  Enter to send · Shift+Enter for a new line
                </p>
              </form>
            </>
          )}
        </>
      )}
    </div>
  )

  return (
    <div className={cn('flex flex-col', shellHeight, '-mx-3 sm:-mx-4 lg:mx-0 max-lg:max-w-none')}>
      {/* Desktop page intro */}
      <header className={cn('mb-4 hidden shrink-0 lg:block', mobileView === 'thread' && '')}>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 font-display">Messages</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Direct messages with any active colleague.
        </p>
      </header>

      <div
        className={cn(
          'flex min-h-0 flex-1 overflow-hidden',
          'max-lg:rounded-none max-lg:border-0 max-lg:shadow-none',
          'lg:gap-0 lg:rounded-xl lg:border lg:border-neutral-200 lg:shadow-md dark:lg:border-neutral-700'
        )}
      >
        {listPanel}
        {threadPanel}
      </div>

      {composeSheet}
    </div>
  )
}

export default Messages
