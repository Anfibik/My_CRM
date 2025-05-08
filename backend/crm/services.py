from .models import Inquiry, Contact, Company, Lead, Deal, CustomUser


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
        Deal.objects.create(
            lead=lead,
            department=department,
            validated_need="",
            status="need",
            responsible=responsible
        )

    # (Необязательно) Обновляем статус обращения, например, помечаем его как "закрыто"
    inquiry.status = "in_progress"
    inquiry.save()

    return lead  # или можно вернуть все созданные объекты
