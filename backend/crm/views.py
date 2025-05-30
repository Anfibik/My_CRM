from django.contrib.auth import authenticate
from rest_framework import generics, viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from django.db import IntegrityError
from django.db.models import Q
from django.utils import timezone

from .models import Company, Contact, Lead, Deal, Inquiry, DealEvent, NextStep, CustomUser
from .models import Task, TaskDiscussion, TaskChangeLog, TaskAttachment
from .permissions import IsDealAccess, NotCallOperator
from .serializers import CompanySerializer, ContactSerializer, LeadSerializer, DealSerializer, InquirySerializer, \
    DealEventSerializer, NextStepSerializer, CustomUserSerializer, UserRegistrationSerializer
from .serializers import TaskSerializer, TaskDiscussionSerializer, TaskChangeLogSerializer, TaskAttachmentSerializer
from .services import convert_inquiry


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
        if user is not None:
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
    permission_classes = [IsAuthenticated, NotCallOperator]
    
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
        # Автоматически устанавливаем текущего пользователя как автора сообщения
        serializer.save(author=self.request.user, is_system=False)


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


@api_view(['POST'])
def convert_inquiry_view(request, pk):
    """
    Принимает POST /api/inquiries/<pk>/convert/
    Конвертирует указанное обращение в Contact, Company, Lead, Deal
    """
    try:
        inquiry = Inquiry.objects.get(pk=pk)

        # Если лид для этого обращения уже создан
        try:
            inquiry.lead
            return Response({"detail": "Данное обращение уже конвертировано"}, status=status.HTTP_400_BAD_REQUEST)
        except Lead.DoesNotExist:
            pass

        # Используем конвертацию через сервис
        department_assignments = request.data.get("department_assignments", {})
        lead = convert_inquiry(inquiry, department_assignments)
        contact = lead.contact
        deals = list(lead.deals.values_list('id', flat=True))
        return Response({
            "detail": "Обращение успешно конвертировано",
            "contact_id": contact.id,
            "company_id": contact.company.id if contact.company else None,
            "lead_id": lead.id,
            "deal_ids": deals
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"detail": f"Ошибка при конвертации: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)