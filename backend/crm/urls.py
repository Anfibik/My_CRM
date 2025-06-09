from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DealViewSet, LeadViewSet, InquiryViewSet,
    CompanyListCreateView, ContactListCreateView,
    CompanyDetailView, ContactDetailView,
    convert_inquiry_view, DealEventListCreateView, DealEventDetailView,
    NextStepListCreateView, NextStepDetailView,
    UserRegistrationView, UserLoginView, UserProfileView, UserViewSet,
    # Новые представления для задач
    TaskViewSet, TaskDiscussionViewSet, TaskAttachmentViewSet, TaskChangeLogViewSet,
    MyKanbanTasksView,
    ManualLeadCreateAPIView, # Добавляем наш новый APIView
)


router = DefaultRouter()
router.register(r'deals', DealViewSet, basename='deal')
router.register(r'leads', LeadViewSet, basename='lead')
router.register(r'inquiries', InquiryViewSet, basename='inquiry')
router.register(r'users', UserViewSet, basename='user')

# Регистрация маршрутов для задач и связанных сущностей
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'task-discussions', TaskDiscussionViewSet, basename='task-discussion')
router.register(r'task-attachments', TaskAttachmentViewSet, basename='task-attachment')
router.register(r'task-changelogs', TaskChangeLogViewSet, basename='task-changelog')


urlpatterns = [
    # Маршруты аутентификации
    path('auth/', include([
        path('login', UserLoginView.as_view(), name='user-login'),
        path('register', UserRegistrationView.as_view(), name='user-register'),
        path('me', UserProfileView.as_view(), name='user-profile'),
    ])),

    # Маршруты CRM
    path('companies/', CompanyListCreateView.as_view(), name='company-list-create'),
    path('companies/<int:pk>/', CompanyDetailView.as_view(), name='company-detail'),
    path('contacts/', ContactListCreateView.as_view(), name='contact-list-create'),
    path('contacts/<int:pk>/', ContactDetailView.as_view(), name='contact-detail'),

    path('leads/create_manual/', ManualLeadCreateAPIView.as_view(), name='lead-create-manual'),
    
    path('inquiries/<int:pk>/convert/', convert_inquiry_view, name='inquiry-convert'),
    
    # Маршруты для событий сделки
    path('deal-events/', DealEventListCreateView.as_view(), name='deal-event-list-create'),
    path('deal-events/<int:pk>/', DealEventDetailView.as_view(), name='deal-event-detail'),

    # Новый маршрут для Канбан-доски задач пользователя
    path('tasks/my-kanban/', MyKanbanTasksView.as_view(), name='my-kanban-tasks'),

    # Маршруты для следующего шага
    path('next-steps/', NextStepListCreateView.as_view(), name='next-step-list-create'),
    path('next-steps/<int:pk>/', NextStepDetailView.as_view(), name='next-step-detail'),

    path('', include(router.urls)),
]
