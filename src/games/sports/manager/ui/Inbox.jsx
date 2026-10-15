import React, { useEffect, useState } from 'react';
import { Mail, MailOpen, ArrowRight, Inbox as InboxIcon } from 'lucide-react';
import { useManager } from './context.jsx';
import { Empty, SectionTitle, Tabs } from './components.jsx';
import { shortDate } from './format.js';
import { inboxText } from './texts.js';
import { markRead } from '../career/inbox.js';

const FILTERS = {
  all: () => true,
  transfers: (m) => ['negotiation', 'offer', 'deadline-day', 'expiring-contracts'].includes(m.kind),
  squad: (m) => ['injury', 'event', 'promise-broken', 'youth-report'].includes(m.kind),
  club: (m) => ['welcome', 'board-objectives', 'board-warning', 'sacked', 'job-offer', 'season-review', 'new-season', 'stage'].includes(m.kind),
  scouting: (m) => ['scout-report', 'mission-done'].includes(m.kind),
  national: (m) => ['call-up', 'tournament-draw', 'qualified', 'not-qualified'].includes(m.kind),
};

export default function Inbox() {
  const { career, lang, t, act, go, setSheet, setMoments } = useManager();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const list = career.inbox.filter(FILTERS[filter]);
  const item = career.inbox.find((m) => m.id === selected) || null;

  useEffect(() => { if (item && !item.read) act((c) => markRead(c, item.id)); }, [item, act]);

  const open = (text, message) => {
    if (text.cta === 'negotiation') setSheet({ type: 'negotiation', id: text.negotiation });
    else if (text.cta === 'offer') setMoments((m) => [...m, { type: 'offer', offer: text.offer }]);
    else if (text.cta === 'event') setMoments((m) => [...m, { type: 'event', event: text.event }]);
    else if (text.cta === 'review') setMoments((m) => [...m, { type: 'review' }]);
    else if (text.cta) go(text.cta);
    void message;
  };

  const tabs = [
    { id: 'all', label: t('Todo', 'All') }, { id: 'transfers', label: t('Fichajes', 'Transfers') }, { id: 'squad', label: t('Vestuario', 'Squad') },
    { id: 'club', label: t('Club', 'Club') }, { id: 'scouting', label: t('Ojeo', 'Scouting') },
    ...(career.national ? [{ id: 'national', label: t('Selección', 'National') }] : []),
  ];

  return (
    <div className="mg-inbox">
      <SectionTitle kicker={t('Bandeja de entrada', 'Inbox')} title={t('Mensajes', 'Messages')}>
        <button type="button" className="mg-btn mg-btn--ghost mg-btn--sm" onClick={() => act((c) => c.inbox.forEach((m) => { m.read = true; }))}>{t('Marcar todo leído', 'Mark all read')}</button>
      </SectionTitle>
      <Tabs tabs={tabs} value={filter} onChange={setFilter} label={t('Filtros', 'Filters')} />
      <div className={`mg-inbox__split ${item ? 'has-detail' : ''}`}>
        <ul className="mg-inbox__list">
          {list.map((message) => {
            const text = inboxText(career, message, lang);
            return (
              <li key={message.id}>
                <button type="button" className={`${message.read ? '' : 'is-unread'} ${selected === message.id ? 'is-active' : ''}`} onClick={() => setSelected(message.id)}>
                  {message.read ? <MailOpen size={16} aria-hidden="true" /> : <Mail size={16} aria-hidden="true" />}
                  <span><small>{text.from}</small><strong>{text.subject}</strong></span>
                  <em>{shortDate(message.date, lang)}</em>
                </button>
              </li>
            );
          })}
          {!list.length && <Empty icon={InboxIcon} title={t('Nada por aquí', 'Nothing here')} />}
        </ul>
        {item && (() => {
          const text = inboxText(career, item, lang);
          return (
            <article className="mg-inbox__detail mg-enter">
              <button type="button" className="mg-link mg-inbox__back" onClick={() => setSelected(null)}>← {t('Volver', 'Back')}</button>
              <small>{text.from} · {shortDate(item.date, lang)}</small>
              <h3>{text.subject}</h3>
              <p>{text.body}</p>
              {text.cta && (
                <button type="button" className="mg-btn mg-btn--primary" onClick={() => open(text, item)}>
                  {{ negotiation: t('Abrir negociación', 'Open talks'), offer: t('Ver oferta', 'See offer'), event: t('Decidir', 'Decide'), review: t('Ver balance', 'See review') }[text.cta] || t('Ir', 'Go')}
                  <ArrowRight size={16} />
                </button>
              )}
            </article>
          );
        })()}
      </div>
    </div>
  );
}
