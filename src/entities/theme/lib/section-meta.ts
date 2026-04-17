type SectionMeta = {
  title: string
  description: string
  actionLabel: string
}

const SECTION_META: Record<string, SectionMeta> = {
  discussion: {
    title: 'Обсуждения',
    description: 'Базовый раздел с публикациями по теме.',
    actionLabel: 'Открыть',
  },
  experience_exchange: {
    title: 'Обмен опытом',
    description: 'Практики, кейсы и подходы участников.',
    actionLabel: 'Открыть',
  },
  description: {
    title: 'Описание раздела',
    description: 'Информационный контент без реакций и комментариев.',
    actionLabel: 'Открыть описание',
  },
  perfect_result: {
    title: 'Идеальный результат',
    description: 'Верхний раздел для ИКР-сценариев и связанных материалов.',
    actionLabel: 'Скоро',
  },
  desirable_effects: {
    title: 'Желаемые эффекты',
    description: 'Дочерний раздел идеального результата.',
    actionLabel: 'Скоро',
  },
  technical_modeling: {
    title: 'Техническое моделирование',
    description: 'Дочерний раздел идеального результата.',
    actionLabel: 'Скоро',
  },
  undesirable_effects: {
    title: 'Нежелательные эффекты',
    description: 'Дочерний раздел идеального результата.',
    actionLabel: 'Скоро',
  },
  project_modules: {
    title: 'Модули проекта',
    description: 'Вход в управление темами и их организацией.',
    actionLabel: 'Открыть модуль',
  },
  chat_ideas: {
    title: 'Копилка идей',
    description: 'Чат идей для полной версии продукта.',
    actionLabel: 'Скоро',
  },
  chat_qa: {
    title: 'Чат вопросов',
    description: 'Вопросы и ответы по теме.',
    actionLabel: 'Скоро',
  },
  chat_publications: {
    title: 'Чат публикаций',
    description: 'Посты и публикации по теме.',
    actionLabel: 'Скоро',
  },
  chat_tasks: {
    title: 'Чат задач',
    description: 'Задачи и назначения исполнителей.',
    actionLabel: 'Скоро',
  },
  chat_experiments: {
    title: 'Лаборатория экспериментов',
    description: 'Эксперименты и исследовательские задачи.',
    actionLabel: 'Скоро',
  },
}

export function getSectionMeta(sectionCode: string): SectionMeta {
  return (
    SECTION_META[sectionCode] ?? {
      title: sectionCode,
      description: 'Раздел без настроенного отображения.',
      actionLabel: 'Открыть',
    }
  )
}
