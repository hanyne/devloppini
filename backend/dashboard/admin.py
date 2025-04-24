from django.contrib import admin

# Register your models here.
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Client, Devis, Facture, Historique, LigneFacture, Payment, Service, UserProfile

# Inline pour UserProfile
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profil utilisateur'

# Étendre l'admin de User pour inclure UserProfile
class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)

# Déréférencer l'admin par défaut de User et réenregistrer avec notre version
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

# Enregistrement des autres modèles
@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'created_at')
    search_fields = ('name',)

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone')
    search_fields = ('name', 'email')

@admin.register(Historique)
class HistoriqueAdmin(admin.ModelAdmin):
    list_display = ('client', 'action', 'date')
    search_fields = ('client__name', 'action')
    list_filter = ('date',)

@admin.register(Devis)
class DevisAdmin(admin.ModelAdmin):
    list_display = ('client', 'description', 'amount', 'status', 'created_at')
    search_fields = ('client__name', 'description')
    list_filter = ('status', 'created_at')

@admin.register(Facture)
class FactureAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'client', 'amount', 'status', 'created_at')
    search_fields = ('invoice_number', 'client__name')
    list_filter = ('status', 'created_at')

@admin.register(LigneFacture)
class LigneFactureAdmin(admin.ModelAdmin):
    list_display = ('facture', 'designation', 'prix_unitaire', 'quantite', 'total')
    search_fields = ('facture__invoice_number', 'designation')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('facture', 'stripe_payment_intent_id', 'amount', 'status', 'created_at')
    search_fields = ('stripe_payment_intent_id', 'facture__invoice_number')
    list_filter = ('status', 'created_at')

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role')
    search_fields = ('user__username', 'role')
    list_filter = ('role',)