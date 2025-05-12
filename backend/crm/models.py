from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.core.validators import RegexValidator

MESSENGER_CHOICES = [
    ("telegram", "Telegram"),
    ("viber", "Viber"),
    ("whatsapp", "WatsApp"),
    ("signal", "Signal"),
]

ROLE_CHOICES = [
    ('owner', 'Собственник'),
    ('sales_manager', 'Менеджер по продажам'),
    ('project_manager', 'Проектный менеджер'),
    ('account_manager', 'Аккаунт менеджер'),
    ('logistic', 'Логист'),
    ('engineer', 'Инженер'),
    ('warehouse_worker', 'Кладовщик'),
    ('accountant', 'Бухгалтер'),
    ('lawyer', 'Юрист'),
    ('top_manager', 'ТОП Менеджер'),
    ('call_operator', 'Оператор кол-центра')
]

DEPARTMENT_CHOICES = [
    ("warehouses", "ШМБ"),
    ("racks", "Стеллажные системы"),
    ("warehouses_machines", "Складская техника"),
    ("plastic_containers", "Пластиковая тара"),
    ("trash_bins", "Мусорные баки"),
    ("sorting_systems", "Системы сортировки"),
    ("automation", "Автоматизация"),
    ("services", "Сервисные услуги"),
    ("administrations", "Администрация"),
    ("logistics", "Логистика"),
    ("finance", "Финансы и бухгалтерия"),
    ("marketing", "Маркетинг"),
]

phone_validator = RegexValidator(
    regex=r'^\+?1?\d{9,15}$',
    message="Номер телефона должен быть в формате: '+999999999'. До 15 цифр."
)


class CustomUser(AbstractUser):
    full_name = models.CharField(max_length=255, verbose_name="Полное ФИО")
    home_phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="Домашний телефон",
        validators=[phone_validator]
    )
    work_phone = models.CharField(
        max_length=20,
        verbose_name="Рабочий телефон",
        validators=[phone_validator]
    )
    work_email = models.EmailField(
        unique=True,
        verbose_name="Рабочая почта"
    )
    home_email = models.EmailField(
        blank=True,
        null=True,
        verbose_name="Домашняя почта"
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='sales_manager',
        verbose_name="Роль"
    )
    department = models.CharField(
        max_length=50,
        choices=DEPARTMENT_CHOICES,
        default='administrations',
        verbose_name="Департамент"
    )

    def __str__(self):
        return self.full_name


class Contact(models.Model):
    name = models.CharField(max_length=255, verbose_name="ФИО Контакта")
    phone = models.CharField(max_length=20, verbose_name="Телефон", blank=True, null=True, validators=[phone_validator])
    email = models.EmailField(verbose_name="Email", blank=True, null=True)
    messenger = models.CharField(
        max_length=100,
        verbose_name="Мессенджер",
        choices=MESSENGER_CHOICES,
        blank=True,
        null=True
    )
    company = models.ForeignKey("Company",
                                on_delete=models.SET_NULL, related_name="contacts", verbose_name="Компания",
                                null=True,
                                blank=True)

    def __str__(self):
        return f"{self.name}"


class Company(models.Model):
    name = models.CharField(max_length=255, verbose_name="Название компании")
    site = models.URLField(verbose_name="Сайт компании", blank=True, null=True)
    phone = models.CharField(max_length=20, verbose_name="Телефон компании", blank=True, null=True, validators=[phone_validator])
    email = models.EmailField(verbose_name="Email компании", blank=True, null=True)
    industry = models.CharField(max_length=255, verbose_name="Направленность", blank=True, null=True)
    description = models.TextField(verbose_name="Описание компании", blank=True, null=True)
    main_contact = models.ForeignKey(
        'Contact',
        on_delete=models.SET_NULL,
        related_name='main_for_companies',
        verbose_name='Главный контакт',
        null=True,
        blank=True
    )

    def save(self, *args, **kwargs):
        if self.name and not (self.name.startswith('"') and self.name.endswith('"')):
            self.name = f'"{self.name}"'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Lead(models.Model):
    contact = models.ForeignKey(
        Contact,
        on_delete=models.CASCADE,
        related_name="leads",
        verbose_name="Контакт"
    )
    inquiry = models.OneToOneField(
        "Inquiry",
        on_delete=models.CASCADE,
        related_name="lead",
        null=True,
        blank=True,
        verbose_name="Обращение"
    )
    need = models.TextField(verbose_name="Потребность")
    name = models.CharField(
        max_length=255,
        verbose_name="Название лида",
        blank=True
    )
    department_assignments = models.JSONField(verbose_name="Ответственные", blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ("new", "Новый"),
            ("in_progress", "В работе"),
            ("non_active", "Не активен")
        ],
        default="new",
        verbose_name="Статус"
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='leads_participating',
        verbose_name='Участники'
    )

    def save(self, *args, **kwargs):
        self.name = f"{self.contact} ({self.contact.company.name})"
        super().save(*args, **kwargs)

    def __str__(self):
        company_name = self.contact.company.name if self.contact.company else "Без компании"
        return f"Лид \"{company_name}\" {self.contact.name}"


class Deal(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания сделки")
    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name="deals",
        verbose_name="Лид"
    )
    department = models.CharField(
        max_length=50,
        choices=DEPARTMENT_CHOICES,
        verbose_name="Департамент"
    )
    responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="responsible_deals",
        verbose_name="Ответственный"
    )
    name = models.CharField(
        max_length=255,
        verbose_name="Название сделки",
        blank=True
    )
    validated_need = models.TextField(
        verbose_name="Проверенная потребность",
        blank=True,
        null=True
    )
    contract_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Стоимость контракта")
    status = models.CharField(
        max_length=20,
        choices=[
            ("need", "Не обработана"),
            ("identifying_need", "Выявление потребности"),
            ("solution", "Подготовка решения"),
            ("commercial_offer", "Презентация КП"),
            ("objections", "Работа с возражениями"),
            ("auction", "Торг"),
            ("contract", "Подписание договора"),
            ("prepay", "Получение предоплаты"),
            ("partners", "Работа с подрядчиками"),
            ("logistics", "Логистика"),
            ("implementation", "Реализация"),
            ("closing", "Закрытие сделки"),
        ],
        default="need",
        verbose_name="Статус"
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="deals_participating",
        verbose_name="Соучастники"
    )
    account = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="account_deals",
        verbose_name="Аккаунт"
    )

    def save(self, *args, **kwargs):
        self.name = f"{self.lead.name} ({self.department})"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Сделка: {self.name} ({self.get_status_display()})"


class Inquiry(models.Model):
    full_name = models.CharField(max_length=255, verbose_name="ФИО контакта")
    phone = models.CharField(max_length=20, verbose_name="Телефон", validators=[phone_validator])
    email = models.EmailField(verbose_name="Email", blank=True, null=True)
    messenger = models.CharField(
        max_length=100,
        verbose_name="Мессенджер",
        choices=MESSENGER_CHOICES,
        blank=True,
        null=True
    )
    company_name = models.CharField(
        max_length=255,
        verbose_name="Название компании клиента",
        blank=True,
        null=True
    )
    company_site = models.URLField(verbose_name="Сайт компании", blank=True, null=True)
    need_description = models.TextField(verbose_name="Описание потребности клиента")
    departments = models.JSONField(verbose_name="Выбранные направления", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата обращения")
    status = models.CharField(
        max_length=20,
        choices=[
            ("wait_conversion", "Ожидает конвертации"),
            ("pending", "В ожидании"),
            ("in_progress", "В работе"),
            ("archived", "В архиве")
        ],
        default="pending",
        verbose_name="Статус обращения"
    )
    responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='call_operator',
        verbose_name='Ответственный оператор'
    )

    def __str__(self):
        return f"{self.full_name} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class DealEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ("comment", "Комментарий"),
        ("phone", "Телефонный разговор"),
        ("client_response", "Ответ клиента"),
        ("meeting", "Встреча"),
        ("first_contact", "Первый контакт"),
    ]

    deal = models.ForeignKey(
        "Deal",
        on_delete=models.CASCADE,
        related_name="events",
        verbose_name="Сделка"
    )
    pipeline = models.CharField(
        max_length=20,
        choices=Deal._meta.get_field('status').choices,
        verbose_name="Стадия сделки при событии"
    )
    event_type = models.CharField(
        max_length=50,
        choices=EVENT_TYPE_CHOICES,
        verbose_name="Тип события"
    )
    content = models.TextField(verbose_name="Содержание события")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Автор"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    next_step = models.OneToOneField(
        "NextStep",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Следующий шаг"
    )

    def __str__(self):
        return f"{self.get_event_type_display()} для сделки {self.deal.id}"


class NextStep(models.Model):
    TASK_STATUS_CHOICES = [
        ("open", "Открыта"),
        ("in_progress", "В работе"),
        ("done", "Выполнена"),
        ("canceled", "Отменена"),
    ]

    deal = models.ForeignKey(
        "Deal",
        on_delete=models.CASCADE,
        related_name="next_steps",
        verbose_name="Сделка"
    )
    description = models.TextField(verbose_name="Описание следующего шага")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    deadline = models.DateTimeField(null=True, blank=True, verbose_name="Крайний срок")
    status = models.CharField(
        max_length=20,
        choices=TASK_STATUS_CHOICES,
        default="open",
        verbose_name="Статус следующего шага"
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Исполнитель"
    )

    def __str__(self):
        return f"Следующий шаг для сделки {self.deal.id}"


class Task(models.Model):
    """Модель задачи, привязанной к сделке"""
    TASK_TYPE_CHOICES = [
        ("approval", "Согласование"),
        ("payment", "Оплата"),
        ("delivery", "Доставка"),
        ("universal", "Универсальная"),
    ]
    
    PRIORITY_CHOICES = [
        ("low", "Низкий"),
        ("medium", "Средний"),
        ("high", "Высокий"),
    ]
    
    STATUS_CHOICES = [
        ("not_accepted", "Не принята"),
        ("pending", "В ожидании"),
        ("accepted", "Принята"),
        ("in_progress", "В работе"),
        ("completed", "Выполнена"),
        ("closed", "Закрыта"),
    ]
    
    # Основные поля
    title = models.CharField(max_length=255, verbose_name="Заголовок задачи")
    description = models.TextField(verbose_name="Описание задачи")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")
    deadline = models.DateTimeField(null=True, blank=True, verbose_name="Дедлайн")
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name="Дата закрытия")
    
    # Категоризация
    task_type = models.CharField(
        max_length=20,
        choices=TASK_TYPE_CHOICES,
        default="universal",
        verbose_name="Тип задачи"
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default="medium",
        verbose_name="Приоритет"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="not_accepted",
        verbose_name="Статус"
    )
    
    # Связи
    deal = models.ForeignKey(
        Deal,
        on_delete=models.CASCADE,
        related_name="tasks",
        verbose_name="Сделка"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_tasks",
        verbose_name="Автор"
    )
    executor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
        verbose_name="Исполнитель"
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="participating_tasks",
        blank=True,
        verbose_name="Участники"
    )
    observers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="observing_tasks",
        blank=True,
        verbose_name="Наблюдатели"
    )
    
    def __str__(self):
        return self.title


class TaskDiscussion(models.Model):
    """Модель для обсуждений (чат) задачи"""
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="discussions",
        verbose_name="Задача"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="task_messages",
        verbose_name="Автор"
    )
    content = models.TextField(verbose_name="Содержание сообщения")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    is_system = models.BooleanField(default=False, verbose_name="Системное сообщение")
    
    class Meta:
        ordering = ['created_at']
        verbose_name = "Обсуждение задачи"
        verbose_name_plural = "Обсуждения задач"
    
    def __str__(self):
        return f"Сообщение в задаче {self.task.title} от {self.author}"


class TaskChangeLog(models.Model):
    """Модель для логирования изменений в задаче"""
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="change_logs",
        verbose_name="Задача"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="task_changes",
        verbose_name="Пользователь"
    )
    field_name = models.CharField(max_length=100, verbose_name="Изменённое поле")
    old_value = models.TextField(blank=True, null=True, verbose_name="Старое значение")
    new_value = models.TextField(blank=True, null=True, verbose_name="Новое значение")
    change_date = models.DateTimeField(auto_now_add=True, verbose_name="Дата изменения")
    
    class Meta:
        ordering = ['-change_date']
        verbose_name = "Лог изменений задачи"
        verbose_name_plural = "Логи изменений задач"
    
    def __str__(self):
        return f"Изменение в задаче {self.task.title}: {self.field_name}"


class TaskAttachment(models.Model):
    """Модель для прикрепления файлов к задаче"""
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="attachments",
        verbose_name="Задача"
    )
    file = models.FileField(upload_to='task_attachments/', verbose_name="Файл")
    filename = models.CharField(max_length=255, verbose_name="Имя файла")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="task_attachments",
        verbose_name="Загрузил"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата загрузки")
    
    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = "Вложение к задаче"
        verbose_name_plural = "Вложения к задачам"
    
    def __str__(self):
        return self.filename
