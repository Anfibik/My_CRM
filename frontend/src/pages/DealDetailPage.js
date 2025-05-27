import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/config';
import ContractAmountPopup from '../components/deals/ContractAmountPopup';
import NextStepPopup from '../components/deals/NextStepPopup';
import DealSidebar from '../components/deals/DealSidebar';
import { getUsers } from '../api/users';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import { Grid, Box, Tabs, Tab, Typography } from '@mui/material';
import CentralWorkBar from '../components/deals/CentralWorkBar.jsx';
import FileBar from '../components/common/FileBar';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import DealHistory from '../components/deals/DealHistory';
import MyEvents from '../components/common/MyEvents.jsx';
import GeneralFeed from '../components/common/GeneralFeed';
import eventBus from '../utils/eventBus';
import { createTask } from '../components/tasks/TaskCreator';

const DealDetailPage = () => {
  const { id } = useParams();         // Считываем ID сделки из URL
  const navigate = useNavigate();      // Для переходов (например, кнопка "Назад")

  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showAmountPopup, setShowAmountPopup] = useState(false);
  const [selectedStage, setSelectedStage] = useState('');
  const [amount, setAmount] = useState('');

  // Попап для обновления потребности
  const [showNeedPopup, setShowNeedPopup] = useState(false);
  const [needText, setNeedText] = useState('');

  // Для сохранения комментария
  const [eventType, setEventType] = useState("comment");  // выбранное событие
  const [eventText, setEventText] = useState("");         // текст комментария
  const [showNextStepPopup, setShowNextStepPopup] = useState(false);

  const [lastEventText, setLastEventText] = useState("");
  const [lastEventId, setLastEventId] = useState(null);

  const [users, setUsers] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [dealEvents, setDealEvents] = useState([]);
  const [lastEventCreatedAt, setLastEventCreatedAt] = useState(null);
  const [lastNextStepDue, setLastNextStepDue] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    fetchDeal();
    fetchUsers();
    fetchDealEvents();

    const handleDealUpdateEvent = (updatedDeal) => {
      // Проверяем, что событие относится к текущей сделке
      // id из useParams - строка, updatedDeal.id может быть числом
      if (updatedDeal && updatedDeal.id === parseInt(id, 10)) {
        // console.log('DealDetailPage: Received dealUpdated event, updating state.', updatedDeal);
        setDeal(updatedDeal);
        // Обновляем также selectedParticipants, если это необходимо для консистентности
        // (хотя setDeal(updatedDeal) должно перерендерить DealSidebar, который использует deal.participants_details)
        if (updatedDeal.participants_details) {
          setSelectedParticipants(updatedDeal.participants_details.map(u => u.id));
        }
        if (updatedDeal.account_details || updatedDeal.account) {
            setSelectedAccount(updatedDeal.account_details?.id || updatedDeal.account || null);
        }
      }
    };

    eventBus.on('dealUpdated', handleDealUpdateEvent);

    // Очистка подписки при размонтировании компонента
    return () => {
      eventBus.remove('dealUpdated', handleDealUpdateEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Добавляем id как зависимость, чтобы переподписываться при изменении id (хотя для детальной страницы это редкость)

  useEffect(() => {
    if (deal) {
      setSelectedParticipants(deal.participants_details.map(u => u.id));
    }
  }, [deal]);

  useEffect(() => {
    if (deal) setSelectedAccount(deal.account_details?.id || deal.account || null);
  }, [deal]);

  useEffect(() => {
    if (deal) setNeedText(deal.validated_need || deal.lead.need || '');
  }, [deal]);

  const fetchDeal = async () => {
    try {
      // Загружаем данные сделки по адресу /api/deals/:id/
      const response = await api.get(`/api/deals/${id}/`);
      setDeal(response.data);
    } catch (error) {
      console.error("Ошибка при загрузке сделки:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Ошибка при получении пользователей:', error);
    }
  };

  const fetchDealEvents = async () => {
    try {
      const response = await api.get(`/api/deal-events/?deal=${id}`);
      const events = Array.isArray(response.data)
        ? response.data
        : response.data.results || [];
      setDealEvents(events);
      setLastEventCreatedAt(events.length ? events[events.length - 1].created_at : null);
    } catch (error) {
      console.error('Ошибка при получении событий сделки:', error);
    }
  };

  const submitDealEvent = () => {
    if (!eventText.trim()) {
      console.error("Пожалуйста, введите текст события.");
      return;
    }
    // Только открываем попап для следующего шага, событие будет создано из попапа
    setShowNextStepPopup(true);
  };

  // Функция обновления статуса сделки
  const handleStageClick = (stage) => {
    if (stage === deal.status) return;

    // при переходе из стадии 'Выявление потребности' вызываем попап обновления потребности
    if (deal.status === 'identifying_need') {
      setShowNeedPopup(true);
      setSelectedStage(stage);
      return;
    }

    // проверка условия для показа попапа
    if (Number(deal.contract_amount) === 0 && deal.status === "solution") {
      setShowAmountPopup(true);
      setSelectedStage(stage);
      return;
    }

    updateDealStatus(stage);
  };

  const updateDealStatus = async (newStatus, contractAmount = null) => {
    try {
      const dataToUpdate = { status: newStatus };
      if (contractAmount !== null) {
        dataToUpdate.contract_amount = contractAmount;
      }

      const response = await api.patch(`/api/deals/${id}/`, dataToUpdate);
      setDeal(response.data);
    } catch (error) {
      console.error("Ошибка обновления статуса:", error);
    }
  };

  // Обновить потребность и статус сделки
  const updateNeedAndStatus = async (newStatus, validatedNeed) => {
    try {
      const response = await api.patch(`/api/deals/${id}/`, { status: newStatus, validated_need: validatedNeed });
      setDeal(response.data);
    } catch (error) {
      console.error("Ошибка обновления потребности:", error);
    }
  };

  // Обновление участников, может принимать список (для очистки/сохранения)
  const updateParticipants = async (participantsList = null) => {
    try {
      const participants = participantsList !== null ? participantsList : selectedParticipants;
      const response = await api.patch(`/api/deals/${id}/`, { participants });
      setDeal(response.data);
      console.log('Участники обновлены');
    } catch (error) {
      console.error('Ошибка обновления участников:', error);
    }
  };

  // Обновление аккаунт-менеджера сделки
  const updateAccount = async (accountId = null) => {
    try {
      const response = await api.patch(`/api/deals/${id}/`, { account: accountId });
      setDeal(response.data);
    } catch (error) {
      console.error('Ошибка обновления аккаунта:', error);
    }
  };

  if (loading) {
    return <p className="p-6">Загрузка сделки...</p>;
  }

  if (!deal) {
    return <p className="p-6">Сделка не найдена</p>;
  }

  // Если сериализатор вложенный, у deal могут быть: deal.lead, deal.lead.contact, deal.lead.contact.company и т.д.
  const lead = deal.lead;
  const contact = lead?.contact;
  const company = contact?.company;

  // Список стадий воронки
  const stages = [
    { value: "need", label: "Не обработана" },
    { value: "identifying_need", label: "Выявление потребности" },
    { value: "solution", label: "Подготовка решения" },
    { value: "commercial_offer", label: "Презентация КП" },
    { value: "objections", label: "Работа с возражениями" },
    { value: "auction", label: "Торг" },
    { value: "contract", label: "Подписание договора" },
    { value: "prepay", label: "Получение предоплаты" },
    { value: "partners", label: "Работа с подрядчиками" },
    { value: "logistics", label: "Логистика" },
    { value: "implementation", label: "Реализация" },
    { value: "closing", label: "Закрытие сделаки" },
  ];

  // Получаем индекс текущей стадии по значению deal.status
  const currentIndex = stages.findIndex(stage => stage.value === deal.status);

  return (
    <div className="deal-page-container h-[800px] bg-red-100 flex flex-col">
      {deal && (
        <header className="bg-white shadow p-2 m-2">
          {/* Информационная строка состояния (жёлтая) */}
          <div className="bg-yellow-100 p-1 mb-1 flex justify-between items-center">
            <div className="flex space-x-6 items-center">
              <h2 className="text-xl font-bold">{deal.name || "Без названия"}</h2>
            </div>
            <div>
              {deal.created_at
                ? new Date(deal.created_at).toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
                : "Неизвестная дата"}
            </div>
          </div>
          {/* Полоса воронки (красная) */}
          <div className="flex space-x-1 p-1">
            {stages.map((stage, index) => {
              const actualIndex = currentIndex === -1 ? 0 : currentIndex;
              let bgClass = "bg-gray-300 text-gray-500";
              let flexClass = "flex-1";
              if (index < actualIndex) {
                bgClass = "bg-blue-200";
              } else if (index === actualIndex) {
                bgClass = "bg-green-400 font-bold";
                flexClass = "flex-[2]";
              }
              return (
                <div
                  key={stage.value}
                  className={`${bgClass} ${flexClass} px-2 rounded cursor-pointer transition-all duration-150 ease-in-out hover:flex-[2.5] hover:bg-green-300 overflow-hidden`}
                  onClick={() => handleStageClick(stage.value)}
                >
                  <p className="whitespace-nowrap overflow-hidden text-ellipsis text-center text-sm">{stage.label}</p>
                </div>
              );
            })}
          </div>
        </header>
      )}
      {/* ОСНОВНОЕ ТЕЛО (Grid-контейнер) */}
      <Box sx={{ flex: 1, backgroundColor: 'grey.50', p: 0.5, m: 1, borderRadius: 1, boxShadow: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', width: '100%' }}>

          {/* Блок SideBar - боковая панель с информацией */}
          <Box sx={{ width: '22%', pr: 0.5 }}>
            {deal && (
              <DealSidebar
                deal={deal}
                users={users}
                selectedParticipants={selectedParticipants}
                onParticipantsChange={setSelectedParticipants}
                onUpdateParticipants={updateParticipants}
                selectedAccount={selectedAccount}
                onAccountChange={setSelectedAccount}
                onUpdateAccount={updateAccount}
              />
            )}
          </Box>

          {/* Блок CentralWorkBar */}
          <Box sx={{ width: '68%', px: 0.5 }}>
            <CentralWorkBar
              deal={deal}
              eventType={eventType}
              eventText={eventText}
              setEventType={setEventType}
              setEventText={setEventText}
              submitDealEvent={submitDealEvent}
              lastEventCreatedAt={lastEventCreatedAt}
              lastNextStepDue={lastNextStepDue}
            />
          </Box>

          {/* Блок FileBar */}
          <Box sx={{ width: '10%', pl: 0.5 }}>
            <FileBar />
          </Box>

        </Box>
      </Box>

      {/* Лента событий сделки */}
      <Box sx={{ backgroundColor: 'grey.200', p: 2, m: 1, borderRadius: 1, boxShadow: 1 }}>
        <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)} indicatorColor="primary" textColor="primary">
          <Tab label="История сделки" />
          <Tab label="Мои события" />
          <Tab label="Общая лента" />
        </Tabs>
        <Box sx={{ maxHeight: '60vh', overflowY: 'auto', mt: 1 }}>
          {selectedTab === 0 && <DealHistory dealEvents={dealEvents} deal={deal} />}
          {selectedTab === 1 && <MyEvents />}
          {selectedTab === 2 && <GeneralFeed />}
        </Box>
      </Box>

      <ContractAmountPopup
        isOpen={showAmountPopup}
        onClose={() => setShowAmountPopup(false)}
        onSubmit={(amount) => {
          updateDealStatus(selectedStage, amount);
          setShowAmountPopup(false);
        }}
      />

      <NextStepPopup
        isOpen={showNextStepPopup}
        onClose={() => setShowNextStepPopup(false)}
        onSubmit={async (nextStepText, nextStepDateTime) => {
          try {
            // Сначала создаём событие сделки
            const eventResponse = await api.post("/api/deal-events/", {
              deal: deal.id,
              pipeline: deal.status,
              event_type: eventType,
              content: eventText,
            });
            const eventId = eventResponse.data.id;
            // Затем создаём следующий шаг
            const nextStepResponse = await api.post("/api/next-steps/", {
              deal: deal.id,
              description: nextStepText,
              deadline: nextStepDateTime, // Исходная строка от datetime-local
              event: eventId,
            });
            // Обновляем локальные данные
            setLastEventText(eventText);
            setLastEventId(eventId);
            setDeal((prev) => ({
              ...prev,
              last_event: eventText,
              last_next_step: nextStepResponse.data.description,
              last_next_step_due: nextStepDateTime,
            }));
            setLastNextStepDue(nextStepDateTime);
            await fetchDealEvents();

            // ---- НАЧАЛО НОВОГО КОДА ДЛЯ СОЗДАНИЯ ЗАДАЧИ ----
            try {
              const taskDetails = {
                title: `${deal.name} - Следующий шаг`,
                description: nextStepText,
                dealId: deal.id,
                taskType: 'step',
                deadline: nextStepDateTime ? new Date(nextStepDateTime).toISOString() : null,
                executorId: deal.responsible?.id, // Используем deal.responsible.id
                priority: 'low',
                status: 'not_accepted',
              };
              const createdTask = await createTask(taskDetails);
              
              // Отправляем событие для TasksArea, чтобы он обновил список задач
              if (createdTask && createdTask.id && deal && deal.id) {
                eventBus.dispatch('taskAutomaticallyCreated', { 
                  dealId: deal.id, // Используем deal.id из текущего контекста DealDetailPage
                  taskId: createdTask.id 
                });
              } else {
                if (deal && deal.id) {
                    eventBus.dispatch('taskAutomaticallyCreated', { 
                        dealId: deal.id,
                        taskId: createdTask?.id || null 
                    });
                } else {
                    console.error('DealDetailPage: Не удалось отправить событие taskAutomaticallyCreated. Отсутствует deal.id.');
                }
              }

            } catch (taskError) {
              console.error("Ошибка при автоматическом создании задачи для следующего шага:", taskError);
            }
            // ---- КОНЕЦ НОВОГО КОДА ДЛЯ СОЗДАНИЯ ЗАДАЧИ ----

            // Сброс формы и закрытие попапа
            setEventText("");
            setEventType("comment");
            setShowNextStepPopup(false);
          } catch (error) {
            console.error("Ошибка создания события и следующего шага:", error);
          }
        }}
      />

      {/* Попап обновления потребности */}
      <Dialog open={showNeedPopup} onClose={() => setShowNeedPopup(false)} fullWidth>
        <DialogTitle>Обновите потребность</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={needText}
            onChange={(e) => setNeedText(e.target.value)}
            placeholder="Введите уточнённую потребность"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNeedPopup(false)}>Отмена</Button>
          <Button
            variant="contained"
            disabled={!needText.trim()}
            onClick={() => {
              updateNeedAndStatus(selectedStage, needText);
              setShowNeedPopup(false);
            }}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

    </div>
  );
};

export default DealDetailPage;
