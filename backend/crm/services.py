from .models import Inquiry, Contact, Company, Lead, Deal, CustomUser


def convert_inquiry(inquiry: Inquiry, department_assignments=None):
    """
    Преобразует данные из Inquiry в Contact, Company, Lead, Deal(ы).
    """
    # 1. Обработка Company: если в обращении есть company_name, пытаемся найти или создать компанию.
    company = None

    if inquiry.company_name:
        company, _ = Company.objects.get_or_create(
            name=inquiry.company_name,
            defaults={
                "site": inquiry.company_site or "",
                # Здесь можно добавить дополнительные поля, если нужно
            }
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

    # 3. Создание лида
    lead = Lead.objects.create(
        contact=contact,
        name=f"{contact} ({company})",
        need=inquiry.need_description,
        department_assignments=department_assignments,
        status="new"
    )

    # 4. Создание Deal(ов) для каждого продукта
    products_list = inquiry.departments if isinstance(inquiry.departments, list) else []
    for department in products_list:
        responsible_id = None
        if department_assignments and department in department_assignments:
            try:
                responsible_id = department_assignments[department]
            except CustomUser.DoesNotExist:
                responsible_id = None

        Deal.objects.create(
            lead_id=lead.pk,
            product=department,  # здесь можно переименовать поле в department, если нужно
            validated_need="",
            status="open",
            responsible_id=responsible_id  # назначенный сотрудник
        )

    # (Необязательно) Обновляем статус обращения, например, помечаем его как "закрыто"
    inquiry.status = "in_progress"
    inquiry.save()

    return lead  # или можно вернуть все созданные объекты

