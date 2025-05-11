from django.contrib import admin
from .models import Company, Contact, Lead, Deal, Inquiry, DealEvent, CustomUser
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