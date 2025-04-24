from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Client, Devis, Facture, Historique, LigneFacture, Payment, ProduitDetail, Service, UserProfile

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add role to the token
        if user.is_superuser:
            token['role'] = 'admin'
        else:
            try:
                profile = UserProfile.objects.get(user=user)
                token['role'] = profile.role
            except UserProfile.DoesNotExist:
                token['role'] = 'client'
        return token

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name', 'description', 'category', 'price_range', 'features', 'icon', 'created_at']

class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'name', 'email', 'phone']

class HistoriqueSerializer(serializers.ModelSerializer):
    client = serializers.PrimaryKeyRelatedField(queryset=Client.objects.all())

    class Meta:
        model = Historique
        fields = ['id', 'client', 'action', 'date']

class ProduitDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProduitDetail
        fields = ['id', 'devis', 'type_site', 'fonctionnalites', 'design_personnalise', 'integration_seo', 'autre_details']

    def validate_type_site(self, value):
        valid_choices = [choice[0] for choice in ProduitDetail._meta.get_field('type_site').choices]
        if value not in valid_choices:
            raise serializers.ValidationError(f"Le type de site doit être l'un de : {', '.join(valid_choices)}")
        return value

class LigneFactureSerializer(serializers.ModelSerializer):
    class Meta:
        model = LigneFacture
        fields = ['id', 'designation', 'prix_unitaire', 'quantite', 'total']

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'facture', 'stripe_payment_intent_id', 'amount', 'currency', 'status', 'risk_level', 'created_at']

class DevisSerializer(serializers.ModelSerializer):
    client = ClientSerializer(read_only=True)
    produit_details = ProduitDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Devis
        fields = ['id', 'client', 'description', 'details', 'amount', 'created_at', 'status', 'produit_details']

    def validate_amount(self, value):
        print("Validation de amount:", value, type(value))
        if value is None:
            raise serializers.ValidationError("Le montant est requis.")
        try:
            float_value = float(value)
            if float_value <= 0:
                raise serializers.ValidationError("Le montant doit être un nombre positif.")
            return float_value
        except (TypeError, ValueError):
            raise serializers.ValidationError("Le montant doit être un nombre valide.")

    def validate_description(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("La description ne peut pas être vide.")
        return value.strip()

    def validate(self, data):
        print("Données validées par DevisSerializer:", data)
        return data

class FactureSerializer(serializers.ModelSerializer):
    client = ClientSerializer(read_only=True)
    devis = DevisSerializer(read_only=True)
    client_id = serializers.PrimaryKeyRelatedField(queryset=Client.objects.all(), source='client', write_only=True)
    devis_id = serializers.PrimaryKeyRelatedField(queryset=Devis.objects.all(), source='devis', write_only=True, allow_null=True)
    lignes = LigneFactureSerializer(many=True, required=False)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Facture
        fields = ['id', 'client', 'client_id', 'devis', 'devis_id', 'invoice_number', 'amount', 'created_at', 'status', 'image', 'lignes', 'payments']

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes', [])
        facture = Facture.objects.create(**validated_data)
        for ligne_data in lignes_data:
            LigneFacture.objects.create(facture=facture, **ligne_data)
        return facture

    def update(self, instance, validated_data):
        lignes_data = validated_data.pop('lignes', [])
        instance.client = validated_data.get('client', instance.client)
        instance.devis = validated_data.get('devis', instance.devis)
        instance.invoice_number = validated_data.get('invoice_number', instance.invoice_number)
        instance.amount = validated_data.get('amount', instance.amount)
        instance.status = validated_data.get('status', instance.status)
        instance.save()

        instance.lignes.all().delete()
        for ligne_data in lignes_data:
            LigneFacture.objects.create(facture=instance, **ligne_data)
        return instance