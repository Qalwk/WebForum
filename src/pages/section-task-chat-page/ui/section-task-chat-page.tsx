import { useCallback, useEffect, useState } from 'react'

import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { getTasks } from '../../../entities/message/api/messages-api'

import type { TaskMessageResponse } from '../../../entities/message/model/types'

import { getCurrentUser } from '../../../entities/user/api/user-api'

import type { CurrentUserResponse } from '../../../entities/user/model/types'

import { getThemeById, getThemeSections } from '../../../entities/theme/api/theme-api'

import { getSectionMeta } from '../../../entities/theme/lib/section-meta'


import { useSession } from '../../../entities/session/model/session-context'

import { PageState } from '../../../shared/ui/page-state'

import { useTelegramBackButton } from '../../../shared/hooks/use-telegram-back-button'

import { TaskMessageCard } from './task-message-card'

import { TaskCreatePanel } from './task-create-panel'



type LocationState = {

  themeTitle?: string

  sectionCode?: string

}



export function SectionTaskChatPage() {

  const navigate = useNavigate()

  const { search, hash, state: rawState } = useLocation()

  const state = rawState as LocationState | null

  const { themeId, sectionId } = useParams<{

    themeId: string

    sectionId: string

  }>()

  const { token, isTelegram, authError, authStatus } = useSession()



  const [themeTitle, setThemeTitle] = useState(() => state?.themeTitle ?? '')

  const [sectionCode, setSectionCode] = useState(() => state?.sectionCode ?? '')

  const [loadError, setLoadError] = useState('')

  const [messages, setMessages] = useState<TaskMessageResponse[]>([])

  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null)



  function goHome() {

    navigate({ pathname: '/', search, hash })

  }



  useTelegramBackButton(isTelegram, goHome)



  const reloadTasks = useCallback(async () => {

    if (!themeId || !sectionId || !token) {

      return

    }

    const rows = await getTasks(themeId, sectionId, token, {

      limit: 100,

      offset: 0,

    })

    setMessages(rows)

  }, [themeId, sectionId, token])



  useEffect(() => {

    if (!themeId || !sectionId || !token) {

      return

    }

    const tid = themeId

    const sid = sectionId



    let active = true



    async function run() {

      setLoadError('')



      try {

        const sections = await getThemeSections(tid, token)

        const mySection = sections.find((s) => s.section_id === sid)

        if (!active) {

          return

        }

        if (!mySection) {

          setLoadError('Секция не найдена в этой теме.')

          return

        }

        if (mySection.section_code !== 'chat_tasks') {

          setLoadError('Этот раздел открыт не в режиме чата задач.')

          return

        }

        setSectionCode(mySection.section_code)



        if (state?.themeTitle) {

          setThemeTitle(state.themeTitle)

        } else {

          const t = await getThemeById(tid, token)

          if (active) {

            setThemeTitle(t.title)

          }

        }



        const me = await getCurrentUser(token)

        if (active) {

          setCurrentUser(me)

        }



        const rows = await getTasks(tid, sid, token, {

          limit: 100,

          offset: 0,

        })

        if (active) {

          setMessages(rows)

        }

      } catch (error) {

        if (!active) {

          return

        }

        if (error instanceof Error) {

          setLoadError(error.message)

        } else {

          setLoadError('Не удалось загрузить чат задач.')

        }

      }

    }



    void run()

    return () => {

      active = false

    }

  }, [token, themeId, sectionId, state])



  if (!themeId || !sectionId) {

    return (

      <PageState

        title="Неверный маршрут"

        description="Не указаны тема или секция."

        action={{ label: 'На главный', onClick: goHome }}

      />

    )

  }



  if (authStatus === 'checking_telegram' || authStatus === 'authenticating') {

    return (

      <PageState

        title="Секунду"

        description="Соединяю с Telegram…"

      />

    )

  }



  if (!token) {

    return (

      <PageState

        title="Нет доступа"

        description={

          authError ??

          'Войдите через Telegram Mini App или задайте VITE_API_BEARER_TOKEN для разработки.'

        }

        action={{ label: 'На главный', onClick: goHome }}

      />

    )

  }



  if (loadError) {

    return (

      <PageState

        title="Раздел"

        description={loadError}

        action={{ label: 'Назад', onClick: goHome }}

      />

    )

  }



  const label =

    (sectionCode ? getSectionMeta(sectionCode).title : null) || 'Чат задач'

  const headerTitle = themeTitle || 'Тема'

  const hasTasks = messages.length > 0



  return (

    <div className="page page--section-chat section-task-chat">

      <header className="section-chat__header">

        <button

          className="section-chat__back"

          type="button"

          onClick={goHome}

        >

          <span className="section-chat__back-chevron" aria-hidden>

            ‹

          </span>

          Назад

        </button>

        <h1 className="section-chat__title">{label}</h1>

        <p className="section-chat__subtitle">{headerTitle}</p>

      </header>



      <div

        className="section-chat__list section-chat__list--with-wizard"

        role="feed"

        aria-label="Список задач"

      >

        {!hasTasks ? (

          <div className="section-chat__empty-block">

            <p className="section-chat__empty-line">

              Нет опубликованных задач. Придумайте название задачи и сформулируйте её.

            </p>

          </div>

        ) : null}



        {messages.map((m) => (

          <TaskMessageCard

            key={m.id}

            task={m}

            token={token}

            themeId={themeId}

            sectionId={sectionId}

            currentUserId={currentUser?.id ?? null}

          />

        ))}

      </div>



      <TaskCreatePanel

        themeId={themeId}

        sectionId={sectionId}

        token={token}

        hasTasks={hasTasks}

        onCreated={() => {

          void reloadTasks()

        }}

      />

    </div>

  )

}


