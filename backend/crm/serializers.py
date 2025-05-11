from rest_framework import serializers
from .models import Company, Contact, Lead, Deal, Inquiry, DealEvent, NextStep, CustomUser
from .models import ROLE_CHOICES, DEPARTMENT_CHOICES


class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'full_name', 'department', 'role']


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

    class Meta:
        model = Deal
        fields = '__all__'

    def get_last_event(self, obj):
        last_event = DealEvent.objects.filter(deal=obj).order_by('-created_at').first()
        return last_event.content if last_event else None

    def get_last_next_step(self, obj):
        last_step = NextStep.objects.filter(deal=obj).order_by('-created_at').first()
        return last_step.description if last_step else None


class UserRegistrationSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(write_only=True, label='Подтверждение пароля')
    role = serializers.ChoiceField(choices=ROLE_CHOICES, label='Роль')
    department = serializers.ChoiceField(choices=DEPARTMENT_CHOICES, label='Департамент')

    class Meta:
        model = CustomUser
        fields = [
            'full_name',
            'work_phone',
            'work_email',
            'role',
            'department',
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
