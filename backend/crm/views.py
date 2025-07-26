from django.contrib.auth import get_user_model, authenticate, login
from rest_framework import generics, viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.db import IntegrityError
from django.db.models import Q
from django.utils import timezone
import traceback

from .models import Company, Contact, Lead, Deal, Inquiry, DealEvent, NextStep, CustomUser
from .models import Task, TaskDiscussion, TaskChangeLog, TaskAttachment
from .permissions import IsDealAccess, NotCallOperator, CanAccessTask
from .serializers import CompanySerializer, ContactSerializer, LeadSerializer, DealSerializer, InquirySerializer, \
    DealEventSerializer, NextStepSerializer, CustomUserSerializer, UserRegistrationSerializer, ManualLeadCreateSerializer
from .serializers import TaskSerializer, TaskDiscussionSerializer, TaskChangeLogSerializer, TaskAttachmentSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .services import convert_inquiry, create_lead_manually


class CompanyListCreateView(generics.ListCreateAPIView):
    queryset = Company.objects.all()  # Получаем все компании
    serializer_class = CompanySerializer  # Используем наш сериализатор
    permission_classes = [IsAuthenticated, NotCallOperator]


class CompanyDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated, NotCallOperator]


class ContactListCreateView(generics.ListCreateAPIView):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated, NotCallOperator]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ContactDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated, NotCallOperator]


class DealViewSet(viewsets.ModelViewSet):
    queryset = Deal.objects.all()
    serializer_class = DealSerializer
    permission_classes = [IsAuthenticated, NotCallOperator, IsDealAccess]

    def get_queryset(self):
        user = self.request.user
        qs = Deal.objects.all()
        if user.role in ('owner', 'top_manager'):
            return qs
        # Включаем сделки, где пользователь является ответственным, участником или аккаунтом
        return qs.filter(Q(responsible=user) | Q(participants=user) | Q(account=user)).distinct()


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticated, NotCallOperator]


class ManualLeadCreateAPIView(APIView):
    """
    APIView для ручного создания лида.
    Принимает POST запросы с данными для создания лида, контакта, компании и связанных сделок.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = ManualLeadCreateSerializer(data=request.data)
        if serializer.is_valid():
            try:
                lead = create_lead_manually(serializer.validated_data, request.user)
                response_serializer = LeadSerializer(lead, context={'request': request})
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                print(f"!!!!!!!!!!!! An error occurred in ManualLeadCreateAPIView: {e}") # For debugging
                traceback.print_exc() # For detailed traceback
                return Response({"error": "Internal server error during lead creation", "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InquiryViewSet(viewsets.ModelViewSet):
    queryset = Inquiry.objects.all()
    serializer_class = InquirySerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        """Сохраняем ответственного оператора при создании обращения"""
        serializer.save(responsible=self.request.user)


# Для событий
class DealEventListCreateView(generics.ListCreateAPIView):
    queryset = DealEvent.objects.all()
    serializer_class = DealEventSerializer
    permission_classes = [IsAuthenticated, NotCallOperator, IsDealAccess]

    def get_queryset(self):
        user = self.request.user
        qs = DealEvent.objects.all()
        # Фильтруем события по текущей сделке
        deal_id = self.request.query_params.get('deal')
        if deal_id:
            qs = qs.filter(deal_id=deal_id)
        if user.role in ('owner', 'top_manager'):
            return qs.order_by('-created_at')
        # Учитываем также аккаунт-менеджера по сделке
        return qs.filter(
            Q(deal__responsible=user) | Q(deal__participants=user) | Q(deal__account=user)
        ).distinct().order_by('-created_at')


class DealEventDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DealEvent.objects.all()
    serializer_class = DealEventSerializer
    permission_classes = [IsAuthenticated, NotCallOperator, IsDealAccess]

    def get_queryset(self):
        user = self.request.user
        qs = DealEvent.objects.all()
        if user.role in ('owner', 'top_manager'):
            return qs
        return qs.filter(Q(deal__responsible=user) | Q(deal__participants=user) | Q(deal__account=user)).distinct()


# Для следующего шага
class NextStepListCreateView(generics.ListCreateAPIView):
    queryset = NextStep.objects.all()
    serializer_class = NextStepSerializer
    permission_classes = [IsAuthenticated, NotCallOperator, IsDealAccess]

    def get_queryset(self):
        user = self.request.user
        qs = NextStep.objects.all()
        if user.role in ('owner', 'top_manager'):
            return qs
        return qs.filter(Q(deal__responsible=user) | Q(deal__participants=user) | Q(deal__account=user)).distinct()


class NextStepDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = NextStep.objects.all()
    serializer_class = NextStepSerializer
    permission_classes = [IsAuthenticated, NotCallOperator, IsDealAccess]

    def get_queryset(self):
        user = self.request.user
        qs = NextStep.objects.all()
        if user.role in ('owner', 'top_manager'):
            return qs
        return qs.filter(Q(deal__responsible=user) | Q(deal__participants=user) | Q(deal__account=user)).distinct()


class UserRegistrationView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = CustomUser.objects.all()
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'full_name': user.full_name,
                    'role': user.role,
                    'department': user.department
                }
            }, status=status.HTTP_201_CREATED)
        except IntegrityError as e:
            # Ловим уникальное ограничение и возвращаем красивую ошибку
            return Response(
                {"work_email": ["Пользователь с такой рабочей почтой уже существует."]},
                status=status.HTTP_400_BAD_REQUEST
            )


class UserLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        email = request.data.get("email")  # Изменено с work_email на email
        password = request.data.get("password")
        
        if not email or not password:
            return Response(
                {"error": "Необходимо указать email и пароль"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=email, password=password)
        if user:
            login(request, user)  # Создаем сессию для пользователя
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                "token": token.key,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "department": user.department
                }
            }, status=status.HTTP_200_OK)
        return Response(
            {"error": "Неверный email или пароль"},
            status=status.HTTP_401_UNAUTHORIZED
        )


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "department": user.department
        })


# --- UserViewSet for employee selection in modal ---
class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        department = self.request.query_params.get('department')
        if department:
            queryset = queryset.filter(department=department)
        return queryset


# ----- Задачи и связанные сущности -----

class TaskViewSet(viewsets.ModelViewSet):
    """
API для управления задачами. Поддерживает CRUD-операции.  
    
    list:  
        Возвращает список задач с возможностью фильтрации.  
        Параметры запроса:  
        - deal: ID сделки (для фильтрации задач по сделке)  
        - status: статус задачи (not_accepted, pending, accepted, in_progress, completed, closed)  
        - priority: приоритет задачи (low, medium, high)  
        - task_type: тип задачи (approval, payment, delivery, universal)  
    """
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, NotCallOperator, CanAccessTask]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Фильтр по сделке
        deal_id = self.request.query_params.get('deal')
        if deal_id:
            queryset = queryset.filter(deal_id=deal_id)
            
        # Фильтр по статусу
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
            
        # Фильтр по приоритету
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
            
        # Фильтр по типу задачи
        task_type = self.request.query_params.get('task_type')
        if task_type:
            queryset = queryset.filter(task_type=task_type)
        
        # Для владельцев и топ-менеджеров отображаем все задачи
        if user.role in ('owner', 'top_manager'):
            return queryset.order_by('-created_at')
            
        # Остальные пользователи видят только задачи, в которых они участвуют
        return queryset.filter(
            Q(author=user) | Q(executor=user) | Q(participants=user) | Q(observers=user)
        ).distinct().order_by('-created_at')
    
    def perform_create(self, serializer):
        # Автоматически устанавливаем текущего пользователя как автора
        serializer.save(author=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        task = self.get_object()
        user = request.user
        new_status = request.data.get('status')

        if new_status and new_status != task.status:  # Проверяем, только если статус действительно меняется
            if new_status == 'closed':
                if not task.user_can_close(user):
                    raise PermissionDenied(
                        {"detail": "Только автор может закрыть задачу."}
                    )
            else:  # Любой другой статус, кроме 'closed'
                if not task.user_can_change_status(user):
                    raise PermissionDenied(
                        {"detail": f"У вас нет прав на изменение статуса этой задачи на '{new_status}'."}
                    )
        
        return super().partial_update(request, *args, **kwargs)
        
    def perform_update(self, serializer):
        # Фиксируем изменения в TaskChangeLog
        old_instance = Task.objects.get(pk=serializer.instance.pk)
        instance = serializer.save()
        
        # Проверяем изменения в основных полях
        changed_fields = []
        for field_name in ['title', 'description', 'status', 'priority', 'task_type', 'executor']:
            old_value = getattr(old_instance, field_name)
            new_value = getattr(instance, field_name)
            
            if old_value != new_value:
                # Создаем запись в логе изменений
                TaskChangeLog.objects.create(
                    task=instance,
                    user=self.request.user,
                    field_name=field_name,
                    old_value=str(old_value) if old_value is not None else '',
                    new_value=str(new_value) if new_value is not None else ''
                )
                changed_fields.append(field_name)
                
                # Если статус изменился на 'закрыта', фиксируем дату закрытия
                if field_name == 'status' and new_value == 'closed' and old_value != 'closed':
                    instance.closed_at = timezone.now()
                    instance.save()
                    
        # Если произошли изменения, создаем системное сообщение в обсуждении
        if changed_fields:
            changes_text = ', '.join([f'{field}' for field in changed_fields])
            # Создаем системное сообщение в обсуждении
            TaskDiscussion.objects.create(
                task=instance,
                author=self.request.user,
                content=f'Изменены поля: {changes_text}',
                is_system=True
            )


class UserKanbanTasksView(generics.ListAPIView):
    """
    API view to get tasks for the user's Kanban board.
    Filters tasks based on user role (owner/top_manager see all)
    or user involvement (author, executor, participant, observer).
    """
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, NotCallOperator]

    def get_queryset(self):
        user = self.request.user
        if user.role in ('owner', 'top_manager'):
            return Task.objects.all().order_by('-created_at') # Show newest first for admins
        
        user_tasks_filter = (
            Q(author=user) |
            Q(executor=user) |
            Q(participants=user) |
            Q(observers=user)
        )
        return Task.objects.filter(user_tasks_filter).distinct().order_by('status', '-priority', 'deadline', 'created_at')


class MyKanbanTasksView(generics.ListAPIView):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Оптимизируем запросы к связанным моделям
        # Сортировку по умолчанию лучше убрать отсюда, чтобы ее можно было переопределить в сериализаторе или на фронте
        base_queryset = Task.objects.select_related('author', 'executor', 'deal').prefetch_related('participants', 'observers')

        if hasattr(user, 'role') and user.role in ['owner', 'top_manager']:
            return base_queryset.all().order_by('-created_at') # Сортировка здесь добавлена для примера
        else:
            # Фильтр для обычных пользователей: задачи, где они автор, исполнитель, участник или наблюдатель
            query_filter = Q(author=user) | Q(executor=user) | Q(participants=user) | Q(observers=user)
            return base_queryset.filter(query_filter).distinct().order_by('-created_at')


class TaskDiscussionViewSet(viewsets.ModelViewSet):
    """
    API для управления обсуждениями задач.  
    
    list:  
        Возвращает список сообщений для конкретной задачи.  
        Параметры запроса:  
        - task: ID задачи (обязательный параметр)  
    """
    queryset = TaskDiscussion.objects.all()
    serializer_class = TaskDiscussionSerializer
    permission_classes = [IsAuthenticated, NotCallOperator]
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by('created_at')
        # Фильтрация по задаче (обязательный параметр)
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        else:
            # Если задача не указана, возвращаем пустой QuerySet
            queryset = queryset.none()
        return queryset
    
    def perform_create(self, serializer):
        # Сохраняем комментарий и получаем его объект
        discussion = serializer.save(author=self.request.user, is_system=False)
        
        # Получаем задачу
        task = discussion.task
        
        # Получаем слой каналов для отправки сообщения
        channel_layer = get_channel_layer()
        group_name = f'task_{task.id}' # Имя группы соответствует задаче
        
        # Сериализуем новый комментарий, чтобы отправить его данные
        # Убедимся, что используем тот же контекст, что и при обычном запросе
        discussion_data = TaskDiscussionSerializer(discussion, context={'request': self.request}).data
        
        # Формируем сообщение для WebSocket
        message = {
            'type': 'data_update', # Тип события для consumer
            'payload': {
                'model': 'discussion',
                'data': discussion_data
            }
        }
        
        # Асинхронно отправляем сообщение в группу
        async_to_sync(channel_layer.group_send)(
            group_name,
            message
        )


class TaskAttachmentViewSet(viewsets.ModelViewSet):
    """
    API для управления вложениями к задачам.  
    
    list:  
        Возвращает список вложений для конкретной задачи.  
        Параметры запроса:  
        - task: ID задачи (обязательный параметр)  
    """
    queryset = TaskAttachment.objects.all()
    serializer_class = TaskAttachmentSerializer
    permission_classes = [IsAuthenticated, NotCallOperator]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Фильтрация по задаче
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        else:
            # Если задача не указана, возвращаем пустой QuerySet
            queryset = queryset.none()
        return queryset
    
    def perform_create(self, serializer):
        # Автоматически устанавливаем текущего пользователя как автора вложения
        serializer.save(uploaded_by=self.request.user)


class TaskChangeLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API для просмотра истории изменений задачи (только чтение).  
    
    list:  
        Возвращает историю изменений конкретной задачи.  
        Параметры запроса:  
        - task: ID задачи (обязательный параметр)  
    """
    queryset = TaskChangeLog.objects.all()
    serializer_class = TaskChangeLogSerializer
    permission_classes = [IsAuthenticated, NotCallOperator]
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by('-change_date')
        # Фильтрация по задаче
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        else:
            # Если задача не указана, возвращаем пустой QuerySet
            queryset = queryset.none()
        return queryset


import logging # Добавляем импорт logging в начале файла или перед функцией, если его еще нет

logger = logging.getLogger(__name__) # Инициализируем логгер для этого модуля

@api_view(['POST'])
def convert_inquiry_view(request, pk):
    """
    Принимает POST /api/inquiries/<pk>/convert/
    Конвертирует указанное обращение в Contact, Company, Lead, Deal
    """
    logger.info(f"Attempting to convert inquiry with pk={pk}. Request data: {request.data}")
    try:
        inquiry = Inquiry.objects.get(pk=pk)
        logger.info(f"Inquiry pk={pk} found: {inquiry.full_name}")

        # Проверка, есть ли у обращения телефонные номера (для отладки)
        if not inquiry.phone_numbers.exists():
            logger.warning(f"Inquiry pk={pk} ({inquiry.full_name}) has NO phone numbers associated before conversion attempt.")
        else:
            phone_numbers_details = [
                f'{pn.phone_number} ({pn.get_phone_type_display()})' 
                for pn in inquiry.phone_numbers.all()
            ]
            logger.info(f"Inquiry pk={pk} ({inquiry.full_name}) has phone numbers: {phone_numbers_details}")

        # Если лид для этого обращения уже создан
        try:
            inquiry.lead
            logger.warning(f"Inquiry pk={pk} ({inquiry.full_name}) already converted. Lead ID: {inquiry.lead.id if hasattr(inquiry, 'lead') and inquiry.lead else 'N/A'}")
            return Response({"detail": "Данное обращение уже конвертировано"}, status=status.HTTP_400_BAD_REQUEST)
        except Lead.DoesNotExist:
            logger.info(f"Inquiry pk={pk} ({inquiry.full_name}) not yet converted. Proceeding with conversion.")
            pass

        # Используем конвертацию через сервис
        department_assignments = request.data.get("department_assignments", {})
        logger.info(f"Department assignments for inquiry pk={pk} ({inquiry.full_name}): {department_assignments}")
        
        logger.info(f"Calling convert_inquiry service for inquiry pk={pk} ({inquiry.full_name})...")
        lead = convert_inquiry(inquiry, department_assignments)
        logger.info(f"convert_inquiry service finished for inquiry pk={pk} ({inquiry.full_name}). Lead object: {lead}")
        contact = lead.contact
        deals = list(lead.deals.values_list('id', flat=True))
        logger.info(f"Inquiry pk={pk} ({inquiry.full_name}) successfully converted. Lead ID: {lead.id}, Contact ID: {contact.id if contact else 'N/A'}, Company ID: {contact.company.id if contact and contact.company else 'N/A'}, Deal IDs: {deals}")
        return Response({
            "detail": "Обращение успешно конвертировано",
            "contact_id": contact.id if contact else None,
            "company_id": contact.company.id if contact and contact.company else None,
            "lead_id": lead.id,
            "deal_ids": deals
        }, status=status.HTTP_200_OK)
    except Inquiry.DoesNotExist:
        logger.error(f"Inquiry with pk={pk} not found during conversion attempt.")
        return Response({"detail": "Обращение не найдено."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error during inquiry conversion (pk={pk}, name: {inquiry.full_name if 'inquiry' in locals() else 'N/A'}): {str(e)}", exc_info=True)
        return Response({"detail": f"Ошибка при конвертации: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)