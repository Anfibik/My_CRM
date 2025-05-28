from rest_framework import serializers
from .models import Company, Contact, Lead, Deal, Inquiry, DealEvent, NextStep, CustomUser, Task, TaskDiscussion, TaskChangeLog, TaskAttachment
from .models import ROLE_CHOICES
from django.utils import timezone
from .services import get_workday_task_interval, get_next_workday_date


class CustomUserSerializer(serializers.ModelSerializer):
    is_admin = serializers.SerializerMethodField()
    
    def get_is_admin(self, obj):
        return obj.username == 'admin' and obj.is_superuser
    
    class Meta:
        model = CustomUser
        fields = ['id', 'full_name', 'department', 'role', 'is_admin']


class ContactShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ['id', 'name']


class CompanySerializer(serializers.ModelSerializer):
    main_contact = ContactShortSerializer(read_only=True)

    class Meta:
        model = Company
        fields = '__all__'  # Включаем все поля модели


class ContactSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)

    class Meta:
        model = Contact
        fields = '__all__'


class LeadSerializer(serializers.ModelSerializer):
    contact = ContactSerializer(read_only=True)
    converted_by = CustomUserSerializer(source='inquiry.responsible', read_only=True)
    department_names = serializers.SerializerMethodField()
    participants = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=CustomUser.objects.all(),
        required=False
    )
    participants_details = CustomUserSerializer(
        source='participants',
        many=True,
        read_only=True
    )

    class Meta:
        model = Lead
        fields = '__all__'

    def get_department_names(self, obj):
        if obj.department_assignments:
            return list(obj.department_assignments.keys())
        return []


class InquirySerializer(serializers.ModelSerializer):
    responsible = CustomUserSerializer(read_only=True)

    def create(self, validated_data):
        inquiry = super().create(validated_data)
        contact = getattr(inquiry, 'contact', None)
        if contact and contact.company:
            company = contact.company
            company.main_contact = contact
            company.save()
        return inquiry

    class Meta:
        model = Inquiry
        fields = '__all__'


class DealEventSerializer(serializers.ModelSerializer):
    next_step_details = serializers.SerializerMethodField()
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    pipeline_display = serializers.SerializerMethodField()

    class Meta:
        model = DealEvent
        fields = '__all__'  # можно явно перечислить поля, если требуется

    def get_next_step_details(self, obj):
        if obj.next_step:
            return NextStepSerializer(obj.next_step).data
        return None

    def get_pipeline_display(self, obj):
        # Возвращаем сохраненную при событии стадию сделки
        return obj.get_pipeline_display()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['pipeline_display'] = self.get_pipeline_display(instance)
        return data


class NextStepSerializer(serializers.ModelSerializer):
    event = serializers.PrimaryKeyRelatedField(queryset=DealEvent.objects.all(), write_only=True)

    class Meta:
        model = NextStep
        fields = '__all__'

    def create(self, validated_data):
        event = validated_data.pop('event', None)
        step = super().create(validated_data)
        if event:
            event.next_step = step
            event.save()
        return step


class DealSerializer(serializers.ModelSerializer):
    lead = LeadSerializer(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    last_event = serializers.SerializerMethodField()
    last_next_step = serializers.SerializerMethodField()
    responsible = CustomUserSerializer(read_only=True)
    participants = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=CustomUser.objects.all(),
        required=False
    )
    participants_details = CustomUserSerializer(source='participants', many=True, read_only=True)
    account = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(role='account_manager'),
        required=False,
        allow_null=True
    )
    account_details = CustomUserSerializer(source='account', read_only=True)
    depth_count = serializers.SerializerMethodField()
    open_tasks_count = serializers.SerializerMethodField()
    has_open_task_due_current_working_day = serializers.SerializerMethodField()
    has_open_task_due_next_working_day = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = [
            # Основные поля модели из Deal
            'id', 
            'name', 
            'contract_amount',  # Ранее 'budget', теперь соответствует модели
            'status',
            'validated_need',   
            'created_at',       
            'department',       
            
            # Явно объявленные вложенные сериализаторы и SerializerMethodFields (эти остаются)
            'lead',
            'responsible',
            'participants',
            'participants_details',
            'account',
            'account_details',
            'last_event',
            'last_next_step',
            'depth_count',
            'open_tasks_count',
            'has_open_task_due_current_working_day',
            'has_open_task_due_next_working_day'
        ]

    def get_last_event(self, obj):
        last_event = DealEvent.objects.filter(deal=obj).order_by('-created_at').first()
        return last_event.content if last_event else None

    def get_last_next_step(self, obj):
        last_step = NextStep.objects.filter(deal=obj).order_by('-created_at').first()
        return last_step.description if last_step else None

    def get_depth_count(self, obj):
        return DealEvent.objects.filter(deal=obj, next_step__isnull=False).count()

    def get_open_tasks_count(self, obj):
        return Task.objects.filter(deal=obj).exclude(status='closed').count()

    def get_has_open_task_due_current_working_day(self, obj):
        today_local = timezone.localdate(timezone.now())
        current_workday_interval = get_workday_task_interval(today_local)

        if current_workday_interval:
            start_dt, end_dt = current_workday_interval
            return Task.objects.filter(
                deal=obj, 
                deadline__gte=start_dt, 
                deadline__lt=end_dt
            ).exclude(status='closed').exists()
        return False

    def get_has_open_task_due_next_working_day(self, obj):
        today_local = timezone.localdate(timezone.now())
        next_workday = get_next_workday_date(today_local)
        next_workday_interval = get_workday_task_interval(next_workday)

        if next_workday_interval: 
            start_dt, end_dt = next_workday_interval
            return Task.objects.filter(
                deal=obj, 
                deadline__gte=start_dt, 
                deadline__lt=end_dt
            ).exclude(status='closed').exists()
        return False


class UserRegistrationSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(write_only=True, label='Подтверждение пароля')
    role = serializers.ChoiceField(choices=ROLE_CHOICES, label='Роль')

    class Meta:
        model = CustomUser
        fields = [
            'full_name',
            'work_phone',
            'work_email',
            'role',
            'password',
            'password2',
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'work_phone': {'label': 'Рабочий телефон'},
            'work_email': {'label': 'Рабочая почта'},
            'full_name': {'label': 'Полное имя'},
        }

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Пароли должны совпадать!")
        # Дополнительно проверяем уникальность username (он будет равен work_email)
        if CustomUser.objects.filter(username=data['work_email']).exists():
            raise serializers.ValidationError({"work_email": "Пользователь с такой рабочей почтой уже существует."})
        return data

    def validate_work_email(self, value):
        if CustomUser.objects.filter(work_email=value).exists():
            raise serializers.ValidationError("Пользователь с такой рабочей почтой уже существует.")
        return value

    def create(self, validated_data):
        validated_data.pop('password2')
        # Подставляем рабочую почту как username, если поле есть в модели
        validated_data['username'] = validated_data.get('work_email')
        user = CustomUser.objects.create_user(**validated_data)
        return user


class TaskAttachmentSerializer(serializers.ModelSerializer):
    """Сериализатор для вложений к задачам"""
    uploaded_by_details = CustomUserSerializer(source='uploaded_by', read_only=True)

    class Meta:
        model = TaskAttachment
        fields = '__all__'


class TaskDiscussionSerializer(serializers.ModelSerializer):
    """Сериализатор для обсуждений задачи"""
    author_details = CustomUserSerializer(source='author', read_only=True)

    class Meta:
        model = TaskDiscussion
        fields = '__all__'


class TaskChangeLogSerializer(serializers.ModelSerializer):
    """Сериализатор для логов изменений задачи"""
    user_details = CustomUserSerializer(source='user', read_only=True)

    class Meta:
        model = TaskChangeLog
        fields = '__all__'


class TaskSerializer(serializers.ModelSerializer):
    """Сериализатор для задач"""
    author_details = CustomUserSerializer(source='author', read_only=True)
    executor_details = CustomUserSerializer(source='executor', read_only=True)
    participants_details = CustomUserSerializer(source='participants', many=True, read_only=True)
    observers_details = CustomUserSerializer(source='observers', many=True, read_only=True)
    discussions = TaskDiscussionSerializer(many=True, read_only=True)
    attachments = TaskAttachmentSerializer(many=True, read_only=True)
    task_type_display = serializers.CharField(source='get_task_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    deal_details = DealSerializer(source='deal', read_only=True)
    
    class Meta:
        model = Task
        fields = '__all__'
        
    def to_representation(self, instance):
        """Расширяем представление для API - добавляем количество обсуждений и вложений"""
        data = super().to_representation(instance)
        data['discussions_count'] = instance.discussions.count()
        data['attachments_count'] = instance.attachments.count()
        return data
