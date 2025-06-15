import React, { useRef, useEffect, useCallback } from 'react';
import { Box, Divider } from '@mui/material';
import TasksArea from '../tasks/TasksArea';
import TaskCard, { CompactTaskCard } from '../tasks/TaskCard';
import { useNavigate } from 'react-router-dom';

const CentralWorkBar = ({
  deal,
  eventType,
  setEventType,
  eventText,
  setEventText,
  submitDealEvent,
  lastEventCreatedAt,
  lastNextStepDue,
}) => {

  // Авто-скейлирующий textarea: минимум 4 строки, без ручного ресайза
  const textAreaRef = useRef(null);
  useEffect(() => {
    const ta = textAreaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    }
  }, [eventText]);

  const navigate = useNavigate();

  const handleNavigateToTask = useCallback((task) => {
    if (task && task.id) {
      navigate(`/tasks/${task.id}`);
    }
  }, [navigate]);

  // Фильтр для активных задач (все, что не 'closed')
  const activeTasksFilter = useCallback((task) => task.status !== 'closed' && task.status !== 'completed', []);
  const CompletedTasksFilter = useCallback((task) => task.status == 'completed', []);


  return (
    <Box sx={{ width: '100%', px: 0.5 }}>
      <main className="p-2 m-1 bg-green-50 rounded shadow">
        <div className="flex items-start">
          {/* Левая часть — Ввод результата шага */}
          <div className="w-1/2">
            <textarea
              ref={textAreaRef}
              value={eventText}
              onChange={(e) => setEventText(e.target.value)}
              rows={6}
              className="w-full p-2 border rounded mb-2 resize-none overflow-hidden"
              placeholder="Введите результат работы по текущему шагу..."
            ></textarea>
            <div className="flex items-center mb-2">
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="flex-1 px-2 py-1 border rounded mr-2 text-sm"
              >
                <option value="comment">Комментарий</option>
                <option value="phone">Телефонный разговор</option>
                <option value="client_response">Ответ клиента</option>
                <option value="meeting">Встреча</option>
                <option value="first_contact">Первый контакт</option>
              </select>
              <button
                onClick={submitDealEvent}
                className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700"
              >
                Сохранить
              </button>
            </div>
          </div>
          {/* Правая часть — Информация о результате и следующем шаге */}
          <div className="w-1/2 p-2 bg-blue-50 rounded shadow ml-2">
            <h3 className="font-bold text-lg mb-1 flex justify-between">
              <span>Крайний результат</span>
              <span className="text-sm text-gray-500">
                {lastEventCreatedAt
                  ? new Date(lastEventCreatedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date(lastEventCreatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </span>
            </h3>
            <p className="p-2 max-h-32 min-h-[3.75rem] overflow-y-auto text-justify text-sm">
              {deal.last_event || "Комментарий отсутствует"}
            </p>
            <Divider sx={{
              border: 'none',
              height: '1px',
              background: 'repeating-linear-gradient(to right, #ccc 0, #ccc 1px, transparent 1px, transparent 4px)',
              mb: 1,
            }} />
            <h3 className="font-bold text-lg mb-1 flex justify-between">
              <span>Запланированный шаг</span>
              <span className="text-sm text-gray-500">
                {lastNextStepDue
                  ? `${new Date(lastNextStepDue).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(lastNextStepDue).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
                  : deal
                    ? `${new Date(new Date(deal.created_at).getTime() + 2 * 60 * 60 * 1000).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(new Date(deal.created_at).getTime() + 2 * 60 * 60 * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
                    : '—'}
              </span>
            </h3>
            <p className="max-h-32 p-2 min-h-[3.75rem] overflow-y-auto text-justify text-sm">
              {deal.last_next_step || "Следующий шаг не установлен"}
            </p>
          </div>
        </div>
        {/* Область для активных задач */}
        <TasksArea 
          key="active-tasks"
          deal={deal} 
          title="Активные задачи" 
          clientSideFilter={activeTasksFilter} 
          CardComponent={TaskCard} 
        />

        {/* Область для выполненных задач */}
        <TasksArea 
          key="accept-tasks"
          deal={deal} 
          title="Выполненные задачи" 
          CardComponent={TaskCard} 
          showAddTaskButton={false}
          apiStatusFilter="completed"
        />

        {/* Область для закрытых задач (Архив) */}
        <TasksArea 
          key="archive-tasks"
          deal={deal} 
          title="Архив задач" 
          apiStatusFilter="closed" 
          CardComponent={CompactTaskCard} 
          onCardClick={handleNavigateToTask}
          showAddTaskButton={false}
          titleVariant='subtitle1'
          gridSpacing={1}
        />
      </main>
    </Box>
  );
};

export default CentralWorkBar;