from django.urls import path
from .views import (
    CustomTokenObtainPairView, ClientLoginView, RegisterView, ServiceListView,
    PublicDevisCreateView, HistoriqueListView, HistoriqueCreateView,
    ClientListCreateView, ClientDetailView, DevisListCreateView, DevisDetailView,
    FactureListCreateView, FactureDetailView, FactureOCRView, FacturePDFView,
    PaymentIntentView, PaymentConfirmView, DevisListView, DevisUpdateView,
    ClientFactureListView, PayPalPaymentCreateView, PayPalPaymentExecuteView, PayPalPaymentCancelView, ChatView
)

urlpatterns = [
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('client/token/', ClientLoginView.as_view(), name='client_token'),
    path('register/', RegisterView.as_view(), name='register'),
    path('services/', ServiceListView.as_view(), name='service-list'),
    path('public/devis/create/', PublicDevisCreateView.as_view(), name='public-devis-create'),
    path('historique/<int:client_id>/', HistoriqueListView.as_view(), name='historique-list'),
    path('historique/create/', HistoriqueCreateView.as_view(), name='historique-create'),
    path('clients/', ClientListCreateView.as_view(), name='client-list-create'),
    path('clients/<int:pk>/', ClientDetailView.as_view(), name='client-detail'),
    path('devis/', DevisListCreateView.as_view(), name='devis-list-create'),
    path('devis/<int:pk>/', DevisDetailView.as_view(), name='devis-detail'),
    path('factures/', FactureListCreateView.as_view(), name='facture-list-create'),
    path('factures/<int:pk>/', FactureDetailView.as_view(), name='facture-detail'),
    path('facture/ocr/', FactureOCRView.as_view(), name='facture-ocr'),
    path('facture/<int:pk>/pdf/', FacturePDFView.as_view(), name='facture-pdf'),
    path('payment/<int:facture_id>/intent/', PaymentIntentView.as_view(), name='payment-intent'),
    path('payment/<int:payment_id>/confirm/', PaymentConfirmView.as_view(), name='payment-confirm'),
    path('devis/list/', DevisListView.as_view(), name='devis-list'),
    path('devis/<int:pk>/update/', DevisUpdateView.as_view(), name='devis-update'),
    path('factures/client/', ClientFactureListView.as_view(), name='client-facture-list'),
    path('payment/<int:facture_id>/paypal/create/', PayPalPaymentCreateView.as_view(), name='paypal-payment-create'),
    path('payment/paypal/execute/', PayPalPaymentExecuteView.as_view(), name='paypal-payment-execute'),
    path('payment/paypal/cancel/', PayPalPaymentCancelView.as_view(), name='paypal-payment-cancel'),
    path('chat/', ChatView.as_view(), name='chat'),
]