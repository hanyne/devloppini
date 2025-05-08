from django.contrib import admin
from .models import Client, Devis, Facture, Historique, LigneFacture, Payment, Service, ProduitDetail, UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role')
    search_fields = ('user__username', 'role')

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price_range', 'created_at')
    search_fields = ('name', 'description')
    list_filter = ('category',)

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone')
    search_fields = ('name', 'email', 'phone')

@admin.register(Historique)
class HistoriqueAdmin(admin.ModelAdmin):
    list_display = ('client', 'action', 'date')
    search_fields = ('client__name', 'action')
    list_filter = ('date',)

@admin.register(ProduitDetail)
class ProduitDetailAdmin(admin.ModelAdmin):
    list_display = ('devis', 'type_site', 'design_personnalise', 'integration_seo')
    search_fields = ('type_site', 'fonctionnalites')
    list_filter = ('type_site', 'design_personnalise', 'integration_seo')

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
    search_fields = ('designation', 'facture__invoice_number')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('facture', 'paypal_order_id', 'amount', 'currency', 'status', 'created_at')
    search_fields = ('paypal_order_id', 'facture__invoice_number')
    list_filter = ('status', 'currency', 'created_at')