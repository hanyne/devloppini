from django.db import models
from django.contrib.auth.models import User  # Ajout de l'importation
from django.utils import timezone

# Modèle pour stocker le rôle de l'utilisateur
class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('client', 'Client'),
        ('admin', 'Admin'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='client')

    def __str__(self):
        return f"{self.user.username} - {self.role}"

# Modèles existants
class Service(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=[
        ('web', 'Développement Web'),
        ('mobile', 'Développement Mobile'),
        ('design', 'Design Graphique'),
        ('other', 'Autre'),
    ])
    price_range = models.CharField(max_length=50, help_text="Ex: 500-1000 TND")
    features = models.TextField(help_text="Liste des fonctionnalités, séparées par des virgules")
    icon = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
class Client(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15)
    password = models.CharField(max_length=128)

    def set_password(self, raw_password):
        from django.contrib.auth.hashers import make_password
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.password)

    def __str__(self):
        return self.name
class Historique(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='historique')
    action = models.CharField(max_length=255)
    date = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.client.name} - {self.action} - {self.date}"

class ProduitDetail(models.Model):
    devis = models.ForeignKey('Devis', on_delete=models.CASCADE, related_name='produit_details')
    type_site = models.CharField(max_length=50, choices=[
        ('vitrine', 'Site Vitrine'),
        ('ecommerce', 'Site E-commerce'),
        ('blog', 'Blog'),
        ('portfolio', 'Portfolio'),
        ('autre', 'Autre'),
    ])
    fonctionnalites = models.TextField(blank=True, help_text="Liste des fonctionnalités souhaitées, séparées par des virgules")
    design_personnalise = models.BooleanField(default=False, help_text="Design personnalisé requis ?")
    integration_seo = models.BooleanField(default=False, help_text="Intégration SEO souhaitée ?")
    autre_details = models.TextField(blank=True, null=True, help_text="Autres détails ou spécifications")

    def __str__(self):
        return f"Détails pour Devis #{self.devis.id} - {self.type_site}"
class Devis(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='devis')
    description = models.TextField()
    details = models.TextField(blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[('pending', 'En attente'), ('approved', 'Approuvé'), ('rejected', 'Rejeté')], default='pending')

    def __str__(self):
        return f"Devis pour {self.client.name} - {self.amount} TND"

class Facture(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='factures')
    devis = models.ForeignKey(Devis, on_delete=models.SET_NULL, null=True, blank=True, related_name='factures')
    invoice_number = models.CharField(max_length=20, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[('unpaid', 'Impayée'), ('paid', 'Payée'), ('overdue', 'En retard')], default='unpaid')
    image = models.ImageField(upload_to='factures/', null=True, blank=True)

    def __str__(self):
        return f"Facture #{self.invoice_number} - {self.amount} TND"

class LigneFacture(models.Model):
    facture = models.ForeignKey(Facture, on_delete=models.CASCADE, related_name='lignes')
    designation = models.CharField(max_length=100)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=3)
    quantite = models.IntegerField()
    total = models.DecimalField(max_digits=10, decimal_places=3, editable=False)

    def save(self, *args, **kwargs):
        self.total = self.prix_unitaire * self.quantite
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.designation} - {self.facture.invoice_number}"

class Payment(models.Model):
    facture = models.ForeignKey(Facture, on_delete=models.CASCADE, related_name='payments')
    stripe_payment_intent_id = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=3)
    currency = models.CharField(max_length=3, default='TND')
    status = models.CharField(max_length=20, default='pending')
    risk_level = models.CharField(max_length=20, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.stripe_payment_intent_id} for Facture {self.facture.invoice_number}"
class Quote(models.Model):
    STATUS_CHOICES = (
        ('pending', 'En attente'),
        ('accepted', 'Accepté'),
        ('rejected', 'Rejeté'),
    )
    PAYMENT_STATUS_CHOICES = (
        ('pending', 'En attente'),
        ('completed', 'Complété'),
        ('failed', 'Échoué'),
    )

    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quotes')
    project_type = models.CharField(max_length=100)
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    details = models.TextField()
    type_site = models.CharField(max_length=50)
    fonctionnalites = models.TextField(blank=True)
    design_personnalise = models.BooleanField(default=False)
    integration_seo = models.BooleanField(default=False)
    autre_details = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Devis #{self.id} - {self.project_type}"