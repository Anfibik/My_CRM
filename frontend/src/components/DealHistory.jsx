import React from 'react';
import { Box, Typography, Divider } from '@mui/material';

const DealHistory = ({ dealEvents, deal }) => {
  // Базовое время: либо время последнего события, либо время создания сделки
  const baseTime = dealEvents.length > 0 ? dealEvents[dealEvents.length - 1].created_at : deal?.created_at;
  // Есть ли уже созданные шаги
  const hasSteps = dealEvents.some(ev => ev.next_step_details);
  // Синтетический первый шаг, если шагов нет
  const initialSynthetic = deal && !hasSteps
    ? [{
        created_at: baseTime,
        pipeline_display: '',
        event_type_display: '',
        content: deal.last_event || 'Переданно от оператора',
        next_step_details: {
          description: deal.last_next_step || 'Связаться с клиентом',
          deadline: new Date(new Date(baseTime).getTime() + 2 * 60 * 60 * 1000).toISOString(),
        },
      }]
    : [];
  const eventsToShow = deal ? [...initialSynthetic, ...dealEvents] : dealEvents;

  return (
    <Box mt={2}>
      {eventsToShow.map((ev, idx) => (
        <Box
          key={idx}
          sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, borderBottom: '1px solid #ccc' }}
        >
          {/* Левая часть */}
          <Box sx={{ flex: 1, pr: 2 }}>
            <Typography variant="caption" color="text.disabled">
              [{`${new Date(ev.created_at).toLocaleDateString('ru-RU', {day: '2-digit', month: '2-digit', year: 'numeric'})} - ${new Date(ev.created_at).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}`}] {ev.pipeline_display} - {ev.event_type_display || ev.event_type}:
            </Typography>
            <Typography variant="body2" textAlign="justify" sx={{ mt: 0.5, color: 'grey.900' }}>
              {ev.content}
            </Typography>
          </Box>
          {/* Правая часть */}
          <Box sx={{ flex: 1, pl: 2 }}>
            <Typography variant="caption" color="text.disabled">
              [{ev.next_step_details?.deadline
                ? `${new Date(ev.next_step_details.deadline).toLocaleDateString('ru-RU', {day: '2-digit', month: '2-digit', year: 'numeric'})} - ${new Date(ev.next_step_details.deadline).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}`
                : '—'}] Следующий шаг:
            </Typography>
            <Typography variant="body2" textAlign="justify" sx={{ mt: 0.5, color: 'grey.900' }}>
              {ev.next_step_details?.description || '—'}
            </Typography>
          </Box>
        </Box>
      ))}
      <Divider />
    </Box>
  );
};

export default DealHistory;
