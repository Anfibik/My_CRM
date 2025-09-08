import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../api/config';
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
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allUsers, setAllUsers] = useState([]); // Состояние для хранения всех пользователей
  const navigate = useNavigate();

  // Загрузка всех пользователей при монтировании компонента
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const response = await api.get('/api/users/'); // Эндпоинт для получения всех пользователей
        setAllUsers(response.data || []);
      } catch (err) {
        console.error("Ошибка при загрузке всех пользователей:", err);
        setAllUsers([]); // В случае ошибки устанавливаем пустой массив
      }
    };
    fetchAllUsers();
  }, []); // Пустой массив зависимостей для выполнения один раз

  const fetchTasks = useCallback(async (dealId) => {
    if (!dealId) {
      setTasks([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/tasks/?deal=${dealId}`);
      const sortedTasks = (response.data || []).sort((a, b) => {
        const aDeadline = a.deadline ? new Date(a.deadline) : null;
        const bDeadline = b.deadline ? new Date(b.deadline) : null;
        if (!aDeadline && !bDeadline) return 0;
        if (!aDeadline) return -1;
        if (!bDeadline) return 1;
        return aDeadline - bDeadline;
      });
      setTasks(sortedTasks);
    } catch (err) {
      console.error("Ошибка при загрузке задач:", err);
      setError("Не удалось загрузить задачи. Попробуйте позже.");
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks(deal?.id);
  }, [deal?.id, fetchTasks]);

  const handleTaskUpdate = (updatedTask) => {
    setTasks(prevTasks =>
      prevTasks.map(task => (task.id === updatedTask.id ? updatedTask : task))
    );
  };

  const handleTaskCreated = (createdTask) => {
    setTasks(prevTasks => [createdTask, ...prevTasks]);
  };

  const handleNavigateToTask = useCallback((task) => {
    if (task && task.id) {
      navigate(`/tasks/${task.id}`);
    }
  }, [navigate]);

  const textAreaRef = useRef(null);
  useEffect(() => {
    const ta = textAreaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    }
  }, [eventText]);

  const activeTasks = tasks.filter(task => !['completed', 'closed'].includes(task.status));
  const completedTasks = tasks.filter(task => task.status === 'completed');
  const closedTasks = tasks.filter(task => task.status === 'closed');

  return (
    <Box sx={{ width: '100%', px: 0.5 }}>
      <main className="p-2 m-1 rounded shadow">
        <div className="flex items-start">
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
        <TasksArea
          key="active-tasks"
          deal={deal}
          title="Активные задачи"
          tasks={activeTasks}
          isLoading={isLoading}
          error={error}
          onTaskUpdate={handleTaskUpdate}
          onTaskCreated={handleTaskCreated}
          CardComponent={TaskCard}
          users={allUsers} // Передача списка всех пользователей
        />
        <TasksArea
          key="completed-tasks"
          deal={deal}
          title="Выполненные задачи"
          tasks={completedTasks}
          isLoading={isLoading}
          error={error}
          onTaskUpdate={handleTaskUpdate}
          onTaskCreated={handleTaskCreated}
          CardComponent={TaskCard}
          showAddTaskButton={false}
        />
        <TasksArea
          key="archive-tasks"
          deal={deal}
          title="Архив задач"
          tasks={closedTasks}
          isLoading={isLoading}
          error={error}
          onTaskUpdate={handleTaskUpdate}
          onTaskCreated={handleTaskCreated}
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