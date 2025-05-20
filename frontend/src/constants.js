// g:\Programming\My_python_project\My_CRM\frontend\src\constants.js

// Object maps for direct label lookup
export const MESSENGER_LABELS = {
  telegram: "Telegram",
  viber: "Viber",
  whatsapp: "WatsApp", // As provided by user
  signal: "Signal",
};

export const ROLE_LABELS = {
  owner: 'Собственник',
  sales_manager: 'Менеджер по продажам',
  project_manager: 'Проектный менеджер',
  account_manager: 'Аккаунт менеджер',
  logistic: 'Логист',
  engineer: 'Инженер',
  warehouse_worker: 'Кладовщик',
  accountant: 'Бухгалтер',
  lawyer: 'Юрист',
  top_manager: 'ТОП Менеджер',
  call_operator: 'Оператор кол-центра'
};

export const DEPARTMENT_LABELS = {
  warehouses: "ШМБ",
  racks: "Стеллажные системы",
  warehouses_machines: "Складская техника",
  plastic_containers: "Пластиковая тара",
  trash_bins: "Мусорные баки",
  sorting_systems: "Системы сортировки",
  automation: "Автоматизация",
  services: "Сервисные услуги",
  administrations: "Администрация",
  logistics: "Логистика",
  finance: "Финансы и бухгалтерия",
  marketing: "Маркетинг",
};

export const DEAL_STATUS_LABELS = {
  need: "Не обработана",
  identifying_need: "Выявление потребности",
  solution: "Подготовка решения",
  commercial_offer: "Презентация КП",
  objections: "Работа с возражениями",
  auction: "Торг",
  contract: "Подписание договора",
  prepay: "Получение предоплаты",
  partners: "Работа с подрядчиками",
  logistics: "Логистика", 
  implementation: "Реализация",
  closing: "Закрытие сделки",
};

export const TASK_TYPE_LABELS = {
  approval: "Согласование",
  payment: "Оплата",
  delivery: "Доставка",
  universal: "Общая",
};

export const PRIORITY_LABELS = {
  low: "Стандартный",
  high: "Высокий",
};

export const STATUS_LABELS = { // For tasks
  not_accepted: "Не принята",
  pending: "В ожидании",
  accepted: "Принята",
  in_progress: "В работе",
  completed: "Выполнена",
  closed: "Закрыта",
};

// Создаем новый объект для ВЫБИРАЕМЫХ статусов, исключая 'not_accepted'
const selectableLabels = { ...STATUS_LABELS };
delete selectableLabels.not_accepted;

export const SELECTABLE_STATUS_LABELS = selectableLabels;

// Arrays of objects for populating select/dropdown options
const createOptionsArray = (labelsObject) => 
  Object.entries(labelsObject).map(([value, label]) => ({ value, label }));

export const MESSENGER_OPTIONS = createOptionsArray(MESSENGER_LABELS);
export const ROLE_OPTIONS = createOptionsArray(ROLE_LABELS);
export const DEPARTMENT_OPTIONS = createOptionsArray(DEPARTMENT_LABELS);
export const DEAL_STATUS_OPTIONS = createOptionsArray(DEAL_STATUS_LABELS);
export const TASK_TYPE_OPTIONS = createOptionsArray(TASK_TYPE_LABELS);
export const PRIORITY_OPTIONS = createOptionsArray(PRIORITY_LABELS);

// Используется для отображения ВСЕХ статусов, включая "Не принята" (если где-то нужно, например, для отображения лейбла)
export const ALL_STATUS_OPTIONS = createOptionsArray(STATUS_LABELS); 

// Используется для выпадающих списков ВЫБОРА статуса (без "Не принята")
export const SELECTABLE_STATUS_OPTIONS = createOptionsArray(SELECTABLE_STATUS_LABELS);
