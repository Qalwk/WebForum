import { IKR_SUBSECTION_CODES, type IkrSubsectionCode } from './section-routing'

export function isIkrSubsection(sectionCode: string): sectionCode is IkrSubsectionCode {
  return IKR_SUBSECTION_CODES.includes(sectionCode as IkrSubsectionCode)
}

/** Пустой экран под ТЗ 13.2 (без GPT): подсказки для трёх подвкладок ИКР. */
export function getIkrPostEmptyCopy(
  sectionCode: string,
  themeTitle: string,
): { lead: string; hint: string } | null {
  const name = themeTitle.trim() || 'раздела'

  if (sectionCode === 'desirable_effects') {
    return {
      lead: `Желаемый эффект для «${name}» ещё не сформулирован.`,
      hint:
        'Лаконично опишите желаемый эффект, выраженный в функциях. Например: идеальная система преобразует входную энергию в нужный результат, компактна, устойчива к среде и предсказуема в работе.',
    }
  }

  if (sectionCode === 'technical_modeling') {
    return {
      lead: `Техническое моделирование для «${name}» ещё не заполнено.`,
      hint:
        'Опишите модель решения: состав функций, элементы системы и связи между ними так, чтобы по тексту можно было понять архитектуру без лишних оборотов.',
    }
  }

  if (sectionCode === 'undesirable_effects') {
    return {
      lead: `Нежелательные эффекты для «${name}» ещё не зафиксированы.`,
      hint:
        'Оформляйте обсуждение: каждый комментарий к теме можно трактовать как отдельный нежелательный эффект — опишите риск и контекст кратко.',
    }
  }

  return null
}
