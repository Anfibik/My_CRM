from django.contrib import admin
from .models import Company, Contact, Lead, Deal, Inquiry, DealEvent, CustomUser
from .models import Task, TaskDiscussion, TaskChangeLog, TaskAttachment
from django import forms


class CompanyAdminForm(forms.ModelForm):
    class Meta:
        model = Company
        fields = '__all__'

    def clean_main_contact(self):
        main_contact = self.cleaned_data.get('main_contact')
        if main_contact:
            exists = Company.objects.filter(main_contact=main_contact).exclude(pk=self.instance.pk).exists()
            if exists:
                raise forms.ValidationError('Этот контакт уже является главным в другой компании.')
        return main_contact


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "description")
    search_fields = ("name",)
    form = CompanyAdminForm


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "email", "company")
    search_fields = ("name", "phone", "email")
    list_filter = ("company",)


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "contact", "company_name", "need", "status", "department_assignments")
    search_fields = ("contact__name", "need")
    list_filter = ("status",)

    def company_name(self, obj):
        if obj.contact and obj.contact.company:
            return obj.contact.company.name
        return "Без компании"

    company_name.short_description = "Компания"


@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ("name", "lead", "responsible", "department_verbose", "contract_amount", "status")
    search_fields = ("name", "lead__company__name")
    list_filter = ("status",)
    list_editable = ("contract_amount",)

    def department_verbose(self, obj):
        return obj.get_department_display()
    department_verbose.short_description = "Департамент"


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone', 'email', 'messenger', 'company_name', 'created_at', 'status')
    search_fields = ('full_name', 'phone', 'email', 'company_name')
    list_filter = ('status', 'messenger', 'created_at')


@admin.register(DealEvent)
class DealEvent(admin.ModelAdmin):
    list_display = ('deal', 'event_type', 'content', 'created_by', 'created_at', 'next_step')


@admin.register(CustomUser)
class CustomUser(admin.ModelAdmin):
    list_display = ('id', 'username', 'full_name', 'work_phone', 'work_email', 'role', 'department')
    list_editable = ('username', 'full_name', 'work_phone', 'work_email', 'role', 'department')

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.filter(is_superuser=False)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'deal', 'author', 'executor', 'created_at', 'deadline', 'task_type', 'priority', 'status')
    list_filter = ('status', 'priority', 'task_type', 'created_at')
    search_fields = ('title', 'description', 'author__username', 'executor__username')
    date_hierarchy = 'created_at'
    list_editable = ('status', 'priority')
    filter_horizontal = ('participants', 'observers')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Основная информация', {
            'fields': ('title', 'description', 'deal', 'author', 'created_at')
        }),
        ('Назначения', {
            'fields': ('executor', 'participants', 'observers')
        }),
        ('Параметры', {
            'fields': ('task_type', 'priority', 'status', 'deadline')
        }),
    )


@admin.register(TaskDiscussion)
class TaskDiscussionAdmin(admin.ModelAdmin):
    list_display = ('id', 'task', 'author', 'created_at', 'is_system', 'content_preview')
    list_filter = ('created_at', 'is_system')
    search_fields = ('content', 'author__username', 'task__title')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at',)
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Содержание'


@admin.register(TaskChangeLog)
class TaskChangeLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'task', 'user', 'change_date', 'field_name', 'old_value_preview', 'new_value_preview')
    list_filter = ('change_date', 'field_name')
    search_fields = ('task__title', 'user__username', 'field_name')
    date_hierarchy = 'change_date'
    readonly_fields = ('task', 'user', 'change_date', 'field_name', 'old_value', 'new_value')
    
    def old_value_preview(self, obj):
        return obj.old_value[:30] + '...' if len(obj.old_value) > 30 else obj.old_value
    old_value_preview.short_description = 'Старое значение'
    
    def new_value_preview(self, obj):
        return obj.new_value[:30] + '...' if len(obj.new_value) > 30 else obj.new_value
    new_value_preview.short_description = 'Новое значение'


@admin.register(TaskAttachment)
class TaskAttachmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'task', 'filename', 'uploaded_by', 'uploaded_at')
    list_filter = ('uploaded_at',)
    search_fields = ('filename', 'task__title', 'uploaded_by__username')
    date_hierarchy = 'uploaded_at'
    readonly_fields = ('uploaded_at',)