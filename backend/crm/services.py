from .models import Inquiry, Contact, Company, Lead, Deal, DealEvent, NextStep, CustomUser, Task
import datetime
from django.utils import timezone


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

    # 2. Обработка Contact: ищем по телефону или email, если не нашли – создаем.
    contact = None
    if inquiry.phone:
        contact = Contact.objects.filter(phone=inquiry.phone).first()
    if not contact and inquiry.email:
        contact = Contact.objects.filter(email=inquiry.email).first()

    if contact:
        # Обновляем данные контакта
        contact.name = inquiry.full_name
        contact.messenger = inquiry.messenger
        if company:
            contact.company = company
        contact.save()
    else:
        # Создаем новый контакт
        contact = Contact.objects.create(
            name=inquiry.full_name,
            phone=inquiry.phone or "",
            email=inquiry.email or "",
            messenger=inquiry.messenger,
            company=company
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
    products_list = department_assignments.keys() if isinstance(department_assignments, dict) else []
    for department in products_list:
        responsible = None
        user_id = department_assignments.get(department)
        if user_id:
            responsible = CustomUser.objects.filter(id=user_id).first()
        deal = Deal.objects.create(
            lead=lead,
            department=department,
            validated_need="",
            status="need",
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
