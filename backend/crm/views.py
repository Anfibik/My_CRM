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

from .models import Company, Contact, Lead, Deal, Inquiry, DealEvent, NextStep, CustomUser
from .permissions import IsDealAccess, NotCallOperator
from .serializers import CompanySerializer, ContactSerializer, LeadSerializer, DealSerializer, InquirySerializer, \
    DealEventSerializer, NextStepSerializer, CustomUserSerializer, UserRegistrationSerializer
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