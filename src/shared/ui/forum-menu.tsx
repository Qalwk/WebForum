import { useEffect, useRef } from 'react'

type ForumMenuProps = {
  onClose: () => void
}

type MenuItem = {
  icon: string
  label: string
  value?: string
  action?: 'close'
  trailing?: 'chevron' | 'toggle' | 'none'
}

const MENU_ITEMS: MenuItem[] = [
  { icon: '/menu-icons/person.webp', label: 'Мой профиль' },
  {
    icon: '/menu-icons/telegram.webp',
    label: 'Выкл уведомления в TG',
    trailing: 'toggle',
  },
  { icon: '/menu-icons/wallet.webp', label: 'Кошелек' },
  {
    icon: '/menu-icons/language.webp',
    label: 'Язык / Language',
    value: 'Русский',
  },
  { icon: '/menu-icons/message.webp', label: 'Написать нам' },
  { icon: '/menu-icons/about.webp', label: 'О ресурсе' },
  { icon: '/menu-icons/home.webp', label: 'На главную', action: 'close' },
  { icon: '/menu-icons/project.webp', label: 'Управление проектом' },
]

function StaticToggle() {
  return (
    <span className="forum-menu__toggle" aria-hidden="true">
      <span className="forum-menu__toggle-thumb" />
    </span>
  )
}

export function ForumMenu({ onClose }: ForumMenuProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <section
      className="forum-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Меню пользователя"
    >
      <header className="forum-menu__profile-header">
        <button
          ref={closeButtonRef}
          className="forum-menu__close"
          type="button"
          aria-label="Закрыть меню"
          onClick={onClose}
        >
          ×
        </button>

        <div className="forum-menu__profile">
          <img
            className="forum-menu__avatar"
            src="/menu-icons/avatar.webp"
            alt=""
            width={58}
            height={58}
          />
          <div className="forum-menu__identity">
            <strong className="forum-menu__name">Jacob W.</strong>
            <div className="forum-menu__rank">
              <span>Топ 100</span>
              <img src="/menu-icons/star.webp" alt="" width={28} height={28} />
            </div>
            <span className="forum-menu__username">@jacob_d</span>
          </div>
        </div>

        <div className="forum-menu__stats" aria-label="Статистика пользователя">
          <span className="forum-menu__role">Участник</span>
          <span className="forum-menu__score">1483</span>
          <span className="forum-menu__stat forum-menu__stat--positive">1555</span>
          <span className="forum-menu__stat forum-menu__stat--negative">72</span>
        </div>
      </header>

      <div className="forum-menu__list">
        {MENU_ITEMS.map((item) => {
          const content = (
            <>
              <span className="forum-menu__item-main">
                <img src={item.icon} alt="" width={30} height={30} />
                <span>{item.label}</span>
              </span>
              <span className="forum-menu__item-trailing">
                {item.value ? (
                  <span className="forum-menu__value">{item.value}</span>
                ) : null}
                {item.trailing === 'toggle' ? <StaticToggle /> : null}
                {item.trailing !== 'toggle' && item.trailing !== 'none' ? (
                  <span className="forum-menu__chevron" aria-hidden="true">
                    ›
                  </span>
                ) : null}
              </span>
            </>
          )

          return item.action === 'close' ? (
            <button
              className="forum-menu__item forum-menu__item--button"
              type="button"
              onClick={onClose}
              key={item.label}
            >
              {content}
            </button>
          ) : (
            <div className="forum-menu__item" key={item.label}>
              {content}
            </div>
          )
        })}
      </div>

      <div className="forum-menu__version" aria-label="Версия интерфейса">
        <span className="forum-menu__version-label forum-menu__version-label--active">
          Моб. версия
        </span>
        <span className="forum-menu__version-switch" aria-hidden="true">
          <span />
        </span>
        <span className="forum-menu__version-label">Пк. версия</span>
      </div>

      <div className="forum-menu__logout">
        <img src="/menu-icons/exit.webp" alt="" width={32} height={32} />
        <span>Выход</span>
      </div>
    </section>
  )
}
