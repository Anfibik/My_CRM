from .models import Company, Contact, Lead, Deal, Inquiry, DealEvent, NextStep, CustomUser, DEPARTMENT_CHOICES, \
    PhoneNumber, Task
import datetime
from django.utils import timezone
from django.db import transaction
from .models import PhoneNumber

# Создаем глобальный словарь для обратного преобразования
# { "ШМБ": "warehouses", "Стеллажные системы": "shelving_systems", ... }
REVERSE_DEPARTMENT_MAP = {label: value for value, label in DEPARTMENT_CHOICES}

def convert_inquiry(inquiry: Inquiry, department_assignments=None):
    """
    Преобразует данные из Inquiry в Contact, Company, Lead, Deal(ы).
    """
    # 1. Обработка Company: если в обращении есть company_name, пытаемся найти или создать компанию.
    company = None

    if inquiry.company_name:
        # Проверяем наличие компании по имени raw и в кавычках, чтобы избежать дублирования
        company = Company.objects.filter(name__iexact=inquiry.company_name).first()
        if not company:
            quoted = f'"{inquiry.company_name}"'
            company = Company.objects.filter(name__iexact=quoted).first()
        if not company:
            company = Company.objects.create(
                name=inquiry.company_name,
                site=inquiry.company_site or ""
            )

    # 2. Обработка Contact: ищем по телефонным номерам из Inquiry или по email, если не нашли – создаем.
    contact = None
    
    # Сначала пытаемся найти контакт по телефонным номерам из Inquiry
    # Предполагается, что модель PhoneNumber импортирована (from .models import PhoneNumber)
    if inquiry.phone_numbers.exists():
        for inquiry_phone_obj in inquiry.phone_numbers.all():
            # Ищем контакт, у которого есть такой же номер телефона
            # (предполагаем, что Contact связан с моделью PhoneNumber через related_name 'phone_numbers')
            existing_contact = Contact.objects.filter(phone_numbers__phone_number=inquiry_phone_obj.phone_number).first()
            if existing_contact:
                contact = existing_contact
                break 
                
    # Если не нашли по телефону, ищем по email
    if not contact and inquiry.email:
        contact = Contact.objects.filter(email__iexact=inquiry.email).first()

    if contact:
        # Контакт найден, обновляем его данные
        contact.name = inquiry.full_name
        contact.messenger = inquiry.messenger or contact.messenger # Обновляем, если есть новое значение, иначе оставляем старое
        if company and not contact.company: # Присваиваем компанию, если у контакта ее нет
            contact.company = company
        contact.save()

        # Обновляем/добавляем телефонные номера для существующего контакта
        # Получаем множество существующих у контакта номеров для быстрой проверки
        existing_contact_phone_numbers_set = set(pn.phone_number for pn in contact.phone_numbers.all())
        for inquiry_phone_obj in inquiry.phone_numbers.all():
            if inquiry_phone_obj.phone_number not in existing_contact_phone_numbers_set:
                PhoneNumber.objects.create(
                    contact=contact,
                    phone_number=inquiry_phone_obj.phone_number,
                    phone_type=inquiry_phone_obj.phone_type # Переносим тип телефона
                )
    else:
        # Контакт не найден, создаем новый
        contact = Contact.objects.create(
            name=inquiry.full_name,
            email=inquiry.email or "",
            messenger=inquiry.messenger or "",
            company=company
        )
        # Добавляем все телефонные номера из Inquiry к новому контакту
        for inquiry_phone_obj in inquiry.phone_numbers.all():
            PhoneNumber.objects.create(
                contact=contact,
                phone_number=inquiry_phone_obj.phone_number,
                phone_type=inquiry_phone_obj.phone_type # Переносим тип телефона
            )

    # После создания/обновления контакта, назначаем его главным в компании
    if company:
        company.main_contact = contact
        company.save()

    # 3. Создание лида
    lead = Lead.objects.create(
        contact=contact,
        inquiry=inquiry,
        need=inquiry.need_description,
        department_assignments=department_assignments,
        status="new"
    )

    # 4. Создание Deal(ов) для каждого продукта
    # Ключи в department_assignments - это отображаемые имена департаментов
    assigned_display_departments = department_assignments.keys() if isinstance(department_assignments, dict) else []
    
    for display_name in assigned_display_departments:
        responsible = None
        user_id = department_assignments.get(display_name)
        if user_id:
            responsible = CustomUser.objects.filter(id=user_id).first()

        # Получаем техническое имя департамента
        technical_department_name = REVERSE_DEPARTMENT_MAP.get(display_name)

        if not technical_department_name:
            # Если по какой-то причине отображаемое имя не найдено в наших CHOICES,
            # нужно решить, что делать. Можно пропустить, записать как есть с предупреждением, или выдать ошибку.
            # Для начала, можно вывести предупреждение и пропустить создание такой сделки.
            print(f"ПРЕДУПРЕЖДЕНИЕ: Техническое имя для департамента '{display_name}' не найдено. Сделка для этого департамента не будет создана.")
            continue 

        deal = Deal.objects.create(
            lead=lead,
            department=technical_department_name, # Используем техническое имя
            validated_need="", # Это поле, возможно, тоже нужно будет заполнять осмысленно
            status="need", # Начальный статус сделки
            responsible=responsible
        )
        # Создаем следующий шаг
        next_step = NextStep.objects.create(
            deal=deal,
            description="Связаться с клиентом",
            deadline=deal.created_at + datetime.timedelta(hours=2)
        )
        # Формируем контент для DealEvent и Task
        deal_event_content = f"Переданно от колл-центра. {inquiry.need_description}"

        # Создаем событие по сделке
        DealEvent.objects.create(
            deal=deal,
            pipeline=deal.status,
            event_type="first_contact",
            content=deal_event_content, 
            next_step=next_step,
            created_by=inquiry.responsible
        )
        
        # Создаем задачу по аналогии со следующим шагом
        if deal.responsible: 
            Task.objects.create(
                deal=deal,
                title=f"{next_step.description}",
                description=deal_event_content,        
                deadline=next_step.deadline,           
                task_type="step",                      
                priority="high",                       
                status="pending",                      
                author=inquiry.responsible,            
                executor=deal.responsible              
            )

    # (Необязательно) Обновляем статус обращения, например, помечаем его как "закрыто"
    inquiry.status = "in_progress"
    inquiry.save()

    return lead  


@transaction.atomic # Гарантирует, что все операции либо выполнятся, либо откатятся
def create_lead_manually(validated_data, creating_user: CustomUser):
    """
    Создает лид, компанию, контакт, сделки и задачи на основе данных, 
    полученных из ManualLeadCreateSerializer.
    """
    full_name = validated_data['fullName']
    phone_numbers_data = validated_data.get('phone_numbers', [])
    email = validated_data.get('email')
    messenger = validated_data.get('messenger')
    company_name = validated_data['companyName']
    company_site = validated_data.get('companySite')
    need_description = validated_data['needDescription']
    assignments = validated_data['assignments'] # { department_display_name: responsible_user_id }

    # 1. Обработка Company
    company = None
    if company_name:
        company, created = Company.objects.get_or_create(
            name__iexact=company_name,
            defaults={'name': company_name, 'site': company_site or ""}
        )
        if not created and company_site and not company.site:
            company.site = company_site
            company.save(update_fields=['site'])

    # 2. Обработка Contact
    contact = None
    # Сначала пытаемся найти контакт по email, если он предоставлен
    if email:
        contact = Contact.objects.filter(email__iexact=email).first()

    # Если контакт не найден по email, и есть телефонные номера,
    # пытаемся найти по одному из них (например, первый непустой)
    if not contact and phone_numbers_data:
        for phone_data in phone_numbers_data:
            if phone_data.get('phone_number'):
                contact_found_by_phone = Contact.objects.filter(
                    phone_numbers__phone_number=phone_data['phone_number']
                ).first()
                if contact_found_by_phone:
                    contact = contact_found_by_phone
                    break 
    
    if contact: # Если контакт найден (по email или телефону)
        contact.name = full_name # Обновляем имя, если нужно
        if messenger and contact.messenger != messenger:
            contact.messenger = messenger
        if company and contact.company != company:
            contact.company = company
        contact.save()

        # Обновляем телефонные номера: удаляем старые, создаем новые
        contact.phone_numbers.all().delete()
        for phone_data in phone_numbers_data:
            PhoneNumber.objects.create(contact=contact, **phone_data)
            
    else: # Если контакт не найден, создаем новый
        contact = Contact.objects.create(
            name=full_name,
            email=email or "",
            messenger=messenger or "",
            company=company
        )
        # Добавляем телефонные номера к новому контакту
        for phone_data in phone_numbers_data:
            PhoneNumber.objects.create(contact=contact, **phone_data)

    if company and not company.main_contact:
        company.main_contact = contact
        company.save(update_fields=['main_contact'])

    # 3. Создание лида
    lead = Lead.objects.create(
        contact=contact,
        need=need_description,
        department_assignments=assignments, 
        status="new",
        source='manual'
    )

    # 4. Создание Deal(ов), NextStep, DealEvent, Task
    department_map = {label: value for value, label in DEPARTMENT_CHOICES}

    for department_display_name, responsible_user_id in assignments.items():
        responsible_user = CustomUser.objects.filter(id=responsible_user_id).first()
        if not responsible_user:
            # Log this, should be caught by serializer
            continue

        department_value = department_map.get(department_display_name)
        if not department_value:
            # Log this, should be caught by serializer
            continue
        
        # deal_name = f"Сделка по '{department_display_name}' для '{company.name if company else contact.name}'"
        deal = Deal.objects.create(
            lead=lead,
            # name=deal_name,
            department=department_value,
            status="need",
            responsible=responsible_user
        )

        # Определяем дедлайн для следующего шага
        # Пример: следующий рабочий день в 10:00
        reference_time = timezone.now()
        next_business_day = get_next_workday_date(reference_time.date())
        due_date_next_step = timezone.make_aware(datetime.datetime.combine(next_business_day, datetime.time(10,0)), timezone.get_current_timezone())

        next_step_description = "Первичный контакт с клиентом"
        next_step = NextStep.objects.create(
            deal=deal,
            description=next_step_description,
            deadline=due_date_next_step,
            assigned_to=responsible_user,
            status="open"
        )
        
        deal_event_content = f"Лид и сделка созданы вручную. Направление: '{department_display_name}'. Потребность: {lead.need}"
        DealEvent.objects.create(
            deal=deal,
            pipeline=deal.status, # Начальный статус сделки, на момент создания события
            event_type='comment',
            content=deal_event_content,
            next_step=next_step,
            created_by=creating_user
        )
        
        if deal.responsible:
            Task.objects.create(
                deal=deal,
                title=f"{deal.name} - {next_step_description}",
                description=f"Детали: {deal_event_content}",
                deadline=next_step.deadline,
                task_type='call',
                priority='high',
                status='pending',
                author=creating_user,
                executor=deal.responsible
            )
    return lead


# Функции для определения рабочих дней и интервалов для задач
def get_workday_task_interval(target_date):
    """
    Если target_date - рабочий день (Пн-Пт), возвращает интервал [9:00, 18:00) этого дня.
    В противном случае возвращает None.
    Даты возвращаются с учетом текущей таймзоны Django.
    """
    if target_date.weekday() >= 5:  # 0-Пн, 1-Вт, ..., 5-Сб, 6-Вс
        return None

    current_tz = timezone.get_current_timezone()
    start_datetime_naive = datetime.datetime.combine(target_date, datetime.time(9, 0, 0))
    end_datetime_naive = datetime.datetime.combine(target_date, datetime.time(18, 0, 0))

    start_datetime_aware = timezone.make_aware(start_datetime_naive, current_tz)
    end_datetime_aware = timezone.make_aware(end_datetime_naive, current_tz)

    return start_datetime_aware, end_datetime_aware

def get_next_workday_date(reference_date):
    """
    Находит следующую дату, которая является рабочим днем (Пн-Пт), начиная с reference_date + 1 день.
    """
    next_day = reference_date + datetime.timedelta(days=1)
    while next_day.weekday() >= 5:
        next_day += datetime.timedelta(days=1)
    return next_day
