import uuid
import jwt
import logging
from django.core.mail import EmailMessage
from django.core.mail import send_mail
import re
from io import BytesIO
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import PasswordResetTokenGenerator
import requests
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django.conf import settings
from django.core.files.storage import default_storage
from django.http import FileResponse
from PIL import Image
import pytesseract
import stripe
import os
from pdf2image import convert_from_path
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from .models import Client, Devis, Facture, Historique, LigneFacture, Payment, Service, Testimonial, UserProfile
from .serializers import (
    ClientSerializer, DevisSerializer, FactureSerializer,
    HistoriqueSerializer, PaymentSerializer, LigneFactureSerializer, ProduitDetailSerializer, ServiceSerializer,
    CustomTokenObtainPairSerializer, TestimonialSerializer
)
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from twilio.rest import Client as TwilioClient
from twilio.base.exceptions import TwilioRestException

# Set up logging
logger = logging.getLogger(__name__)

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class ClientLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            email = request.data.get('email')
            password = request.data.get('password')

            if not email or not password:
                return Response({"error": "Email et mot de passe sont requis."}, status=status.HTTP_400_BAD_REQUEST)

            user = authenticate(username=email, password=password)
            if user is not None:
                if user.is_superuser:
                    profile, created = UserProfile.objects.get_or_create(user=user, defaults={'role': 'admin'})
                    if created:
                        logger.info(f"Created UserProfile for admin {email} with role 'admin'")
                    else:
                        if profile.role != 'admin':
                            profile.role = 'admin'
                            profile.save()
                            logger.info(f"Updated UserProfile role for {email} to 'admin'")

                    refresh = RefreshToken.for_user(user)
                    refresh['role'] = 'admin'
                    return Response({
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    }, status=status.HTTP_200_OK)
                else:
                    try:
                        client = Client.objects.get(email=email)
                        if not client.check_password(password):
                            return Response({"error": "Mot de passe incorrect."}, status=status.HTTP_400_BAD_REQUEST)

                        profile, created = UserProfile.objects.get_or_create(user=user, defaults={'role': 'client'})
                        if created:
                            logger.info(f"Created UserProfile for client {email} with role 'client'")
                        else:
                            if profile.role != 'client':
                                profile.role = 'client'
                                profile.save()
                                logger.info(f"Updated UserProfile role for {email} to 'client'")

                        refresh = RefreshToken.for_user(user)
                        refresh['client_id'] = client.id
                        refresh['role'] = 'client'

                        return Response({
                            'refresh': str(refresh),
                            'access': str(refresh.access_token),
                        }, status=status.HTTP_200_OK)

                    except Client.DoesNotExist:
                        return Response({"error": "Compte utilisateur trouvé mais pas de compte client associé."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                client = Client.objects.get(email=email)
                if not client.check_password(password):
                    return Response({"error": "Mot de passe incorrect."}, status=status.HTTP_400_BAD_REQUEST)

                user, created = User.objects.get_or_create(
                    username=email,
                    defaults={'email': email}
                )
                if created:
                    user.set_password(password)
                    user.save()
                    UserProfile.objects.create(user=user, role='client')
                    logger.info(f"Created new User and UserProfile for client {email}")
                else:
                    if not user.check_password(password):
                        user.set_password(password)
                        user.save()
                        logger.info(f"Updated password for existing User {email}")

                    profile, created = UserProfile.objects.get_or_create(user=user, defaults={'role': 'client'})
                    if created:
                        logger.info(f"Created UserProfile for client {email} with role 'client'")
                    else:
                        if profile.role != 'client':
                            profile.role = 'client'
                            profile.save()
                            logger.info(f"Updated UserProfile role for {email} to 'client'")

                refresh = RefreshToken.for_user(user)
                refresh['client_id'] = client.id
                refresh['role'] = 'client'

                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }, status=status.HTTP_200_OK)

            except Client.DoesNotExist:
                return Response({"error": "Aucun compte trouvé avec cet email."}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error in ClientLoginView: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            name = request.data.get('name')
            email = request.data.get('email')
            phone = request.data.get('phone')
            password = request.data.get('password')

            if not name or not email or not phone or not password:
                return Response({"error": "Tous les champs sont requis."}, status=status.HTTP_400_BAD_REQUEST)

            if Client.objects.filter(email=email).exists():
                return Response({"error": "Cet email est déjà utilisé."}, status=status.HTTP_400_BAD_REQUEST)

            client = Client(name=name, email=email, phone=phone)
            client.set_password(password)
            client.save()
            logger.info(f"Client created: {email}")

            user, created = User.objects.get_or_create(
                username=email,
                defaults={'email': email}
            )
            if created:
                user.set_password(password)
                user.save()
                UserProfile.objects.create(user=user, role='client')
                logger.info(f"User and UserProfile created for client: {email}")

            return Response({"message": "Client créé avec succès."}, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error in RegisterView: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ServiceListView(generics.ListAPIView):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [AllowAny]

class PublicDevisCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = request.headers.get('Authorization', '').split('Bearer ')[1]
            decoded_token = jwt.decode(token, options={"verify_signature": False})
            role = decoded_token.get('role')
            client_id = decoded_token.get('client_id')

            if role != 'client':
                return Response({"error": "Seuls les clients peuvent créer un devis."}, status=status.HTTP_403_FORBIDDEN)

            if not client_id:
                logger.error("client_id missing in token")
                return Response({"error": "Client non authentifié. client_id manquant dans le token."}, status=status.HTTP_401_UNAUTHORIZED)

            try:
                client = Client.objects.get(id=client_id)
                logger.info(f"Client found: {client.id} - {client.email}")
            except Client.DoesNotExist:
                logger.error(f"Client not found for client_id: {client_id}")
                return Response({"error": "Client non trouvé."}, status=status.HTTP_404_NOT_FOUND)

            devis_data = {
                'description': request.data.get('project_type'),
                'amount': float(request.data.get('budget', 0)),
                'details': request.data.get('details', ''),
                'status': 'pending',
                'client_id': client.id
            }
            logger.info(f"Devis data: {devis_data}")

            devis_serializer = DevisSerializer(data=devis_data)
            if not devis_serializer.is_valid():
                logger.error(f"Devis validation errors: {devis_serializer.errors}")
                return Response(devis_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            devis = devis_serializer.save()
            logger.info(f"Devis created with ID: {devis.id}, client_id: {devis.client.id}")

            produit_detail_data = {
                'devis': devis.id,
                'type_site': request.data.get('type_site', 'vitrine'),
                'fonctionnalites': request.data.get('fonctionnalites', ''),
                'design_personnalise': request.data.get('design_personnalise', False),
                'integration_seo': request.data.get('integration_seo', False),
                'autre_details': request.data.get('autre_details', ''),
            }
            produit_detail_serializer = ProduitDetailSerializer(data=produit_detail_data)
            if not produit_detail_serializer.is_valid():
                devis.delete()
                logger.error(f"ProduitDetail validation errors: {produit_detail_serializer.errors}")
                return Response(produit_detail_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            produit_detail_serializer.save()

            Historique.objects.create(
                client=client,
                action=f"Demande de devis soumise - {devis.description}",
            )

            return Response({
                'message': 'Demande de devis soumise avec succès.',
                'devis': devis_serializer.data,
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error in PublicDevisCreateView: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class HistoriqueListView(generics.ListAPIView):
    serializer_class = HistoriqueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        client_id = self.kwargs['client_id']
        return Historique.objects.filter(client_id=client_id)

class HistoriqueCreateView(generics.CreateAPIView):
    serializer_class = HistoriqueSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()

class ClientListCreateView(generics.ListCreateAPIView):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAdminUser]

class ClientDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAdminUser]

class DevisListCreateView(generics.ListCreateAPIView):
    serializer_class = DevisSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        token = self.request.headers.get('Authorization', '').split('Bearer ')[1]
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        role = decoded_token.get('role')
        client_id = decoded_token.get('client_id')

        if role == 'admin':
            return Devis.objects.all()
        elif role == 'client' and client_id:
            return Devis.objects.filter(client_id=client_id)
        else:
            return Devis.objects.none()

    def perform_create(self, serializer):
        token = self.request.headers.get('Authorization', '').split('Bearer ')[1]
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        role = decoded_token.get('role')
        client_id = decoded_token.get('client_id')

        logger.info(f"Creating Devis with role: {role}, client_id: {client_id}, request data: {self.request.data}")

        if role == 'client':
            if not client_id:
                raise serializers.ValidationError({"error": "Client ID manquant dans le token."})
            try:
                client = Client.objects.get(id=client_id)
                serializer.save(client=client)
            except Client.DoesNotExist:
                raise serializers.ValidationError({"error": "Client non trouvé."})
        elif role == 'admin':
            if 'client_id' not in self.request.data:
                raise serializers.ValidationError({"error": "client_id requis pour les administrateurs."})
            serializer.save()
        else:
            raise serializers.ValidationError({"error": "Rôle non autorisé pour créer un devis."})

class DevisDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Devis.objects.all()
    serializer_class = DevisSerializer
    permission_classes = [IsAuthenticated]

class FactureListCreateView(generics.ListCreateAPIView):
    serializer_class = FactureSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        token = self.request.headers.get('Authorization', '').split('Bearer ')[1]
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        role = decoded_token.get('role')
        client_id = decoded_token.get('client_id')

        if role == 'admin':
            return Facture.objects.all()
        elif role == 'client' and client_id:
            return Facture.objects.filter(client_id=client_id)
        else:
            return Facture.objects.none()

    def perform_create(self, serializer):
        token = self.request.headers.get('Authorization', '').split('Bearer ')[1]
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        role = decoded_token.get('role')
        client_id = decoded_token.get('client_id')

        logger.info(f"Creating Facture with role: {role}, client_id: {client_id}, request data: {self.request.data}")

        if role == 'client':
            if not client_id:
                raise serializers.ValidationError({"error": "Client ID manquant dans le token."})
            try:
                client = Client.objects.get(id=client_id)
                facture = serializer.save(client=client)
                self.send_sms_notification(facture)
            except Client.DoesNotExist:
                raise serializers.ValidationError({"error": "Client non trouvé."})
        elif role == 'admin':
            if 'client_id' not in self.request.data:
                raise serializers.ValidationError({"error": "client_id requis pour les administrateurs."})
            facture = serializer.save()
            self.send_sms_notification(facture)
        else:
            raise serializers.ValidationError({"error": "Rôle non autorisé pour créer une facture."})

    def send_sms_notification(self, facture):
        """Send SMS notification to client using Twilio."""
        try:
            if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_PHONE_NUMBER]):
                logger.error(f"Twilio configuration incomplete for facture #{facture.invoice_number}")
                return

            if not re.match(r'^\+\d{10,15}$', settings.TWILIO_PHONE_NUMBER):
                logger.error(f"Invalid TWILIO_PHONE_NUMBER {settings.TWILIO_PHONE_NUMBER} for facture #{facture.invoice_number}")
                return

            client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            phone = facture.client.phone.strip()
            if not re.match(r'^\+\d{10,15}$', phone):
                if re.match(r'^[2579]\d{7}$', phone):
                    phone = f"+216{phone}"
                    logger.info(f"Normalized phone number to {phone} for facture #{facture.invoice_number}")
                else:
                    logger.error(f"Invalid phone number {phone} for facture #{facture.invoice_number}")
                    return
            message_body = (
                f"Bonjour {facture.client.name}, Société Devloppini vous informe : votre devis #{facture.devis.id if facture.devis else 'N/A'} "
                f"est accepté. Consultez votre facture #{facture.invoice_number} de {facture.amount} TND. Payez pour démarrer."
            )
            message = client.messages.create(
                body=message_body,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=phone
            )
            logger.info(f"SMS sent to {phone} for facture #{facture.invoice_number}: {message.sid}")
        except TwilioRestException as e:
            if e.code == 21660:
                logger.error(
                    f"Twilio error 21660 for facture #{facture.invoice_number}: "
                    f"Mismatch between 'From' number {settings.TWILIO_PHONE_NUMBER} and account."
                )
            else:
                logger.error(f"Twilio error sending SMS for facture #{facture.invoice_number}: {str(e)}")
        except Exception as e:
            logger.error(f"Error sending SMS for facture #{facture.invoice_number}: {str(e)}")

class FactureDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            facture = Facture.objects.get(pk=pk)
            if request.user.profile.role != 'admin' and facture.client.user != request.user:
                return Response({"error": "Accès non autorisé"}, status=status.HTTP_403_FORBIDDEN)
            serializer = FactureSerializer(facture)
            return Response(serializer.data)
        except Facture.DoesNotExist:
            return Response({"error": "Facture non trouvée"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        try:
            facture = Facture.objects.get(pk=pk)
            if request.user.profile.role != 'admin' and facture.client.user != request.user:
                return Response({"error": "Accès non autorisé"}, status=status.HTTP_403_FORBIDDEN)
            facture.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Facture.DoesNotExist:
            return Response({"error": "Facture non trouvée"}, status=status.HTTP_404_NOT_FOUND)
    def put(self, request, pk):
        try:
            facture = Facture.objects.get(pk=pk)
            if request.user.profile.role != 'admin' and facture.client.user != request.user:
                return Response({"error": "Accès non autorisé"}, status=status.HTTP_403_FORBIDDEN)
            serializer = FactureSerializer(facture, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Facture.DoesNotExist:
            return Response({"error": "Facture non trouvée"}, status=status.HTTP_404_NOT_FOUND)
class FactureOCRView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        image = request.FILES.get('image')
        if not image:
            return Response({"error": "Aucune image ou PDF fourni"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client = Client.objects.first()
            if not client:
                return Response({"error": "Aucun client dans la base. Ajoutez un client via /clients ou l’admin."}, status=status.HTTP_400_BAD_REQUEST)

            file_path = default_storage.save('temp_file', image)
            full_path = os.path.join(default_storage.location, file_path)

            text = ""
            if image.name.lower().endswith('.pdf'):
                try:
                    images = convert_from_path(full_path, poppler_path=r"C:\poppler\bin")
                    for img in images:
                        text += pytesseract.image_to_string(img) + "\n"
                except Exception as pdf_error:
                    logger.error(f"PDF conversion error: {str(pdf_error)}")
                    return Response({"error": f"Erreur lors de la conversion PDF: {str(pdf_error)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                img = Image.open(full_path)
                text = pytesseract.image_to_string(img)

            if not text.strip():
                return Response({"error": "Aucun texte détecté dans le fichier"}, status=status.HTTP_400_BAD_REQUEST)

            invoice_number = "F0000"
            amount = 0.0
            status_value = "unpaid"

            invoice_match = re.search(r'F\d{4}-\d{3}', text)
            if invoice_match:
                invoice_number = invoice_match.group(0)

            amount_match = re.search(r'(\d+(?:[.,]\d{2})?)\s*TND', text)
            if amount_match:
                amount_str = amount_match.group(1).replace(',', '.')
                amount = float(amount_str)

            status_match = re.search(r'(Payée|Impayée|En retard)', text, re.IGNORECASE)
            if status_match:
                status_text = status_match.group(0).lower()
                status_value = {'payée': 'paid', 'impayée': 'unpaid', 'en retard': 'overdue'}.get(status_text, 'unpaid')

            facture = Facture(
                client=client,
                invoice_number=invoice_number,
                amount=amount,
                status=status_value,
                image=image
            )
            facture.save()

            default_storage.delete(file_path)
            serializer = FactureSerializer(facture)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"OCR processing error: {str(e)}")
            return Response({"error": f"Erreur lors du traitement OCR: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FacturePDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            facture = Facture.objects.get(pk=pk)
            file_path = f"facture_{facture.invoice_number}.pdf"
            c = canvas.Canvas(file_path, pagesize=letter)
            width, height = letter

            c.setFont("Helvetica-Bold", 14)
            c.setFillColor(colors.red)
            c.drawString(50, height - 40, "Ste Bonjour")
            c.setFont("Helvetica", 10)
            c.setFillColor(colors.black)
            c.drawString(50, height - 55, "Rue Salem Alaykom, Ariana Tunisie")
            c.drawString(50, height - 70, "Matricule Fiscale: XXXXXXXXXXXX")
            c.drawString(400, height - 40, "Tél: +216 XX XXX XXX")
            c.drawString(400, height - 55, "e-mail: Bonjour@gmail.com")
            c.drawString(400, height - 70, "Site: www.aaaaa.com")

            c.setFont("Helvetica", 10)
            c.drawString(50, height - 100, f"Date: {facture.created_at.strftime('%d/%m/%Y')}")
            c.setFont("Helvetica-Bold", 12)
            c.drawString(50, height - 115, f"Facture: {facture.invoice_number}")

            c.setFont("Helvetica", 10)
            c.drawString(400, height - 100, f"{facture.client.name}")
            c.drawString(400, height - 115, "Rue N°1, Ariana")
            c.drawString(400, height - 130, "Matricule Fiscale: XXXXXXXXXXXX")

            data = [["Désignation", "Prix unitaire", "Quantité", "Total"]]
            lignes = facture.lignes.all()
            if lignes.exists():
                for ligne in lignes:
                    data.append([
                        ligne.designation,
                        f"{ligne.prix_unitaire:,.2f} TND",
                        str(ligne.quantite),
                        f"{ligne.total:,.2f} TND"
                    ])

            table = Table(data, colWidths=[200, 100, 80, 100])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('GRID', (0, 0), (-1, 0), 1, colors.black),
                ('GRID', (0, -1), (-1, -1), 1, colors.black),
            ]))

            table_start_y = height - 180
            table_width, table_height = table.wrap(width - 100, table_start_y)
            table.drawOn(c, 50, table_start_y - table_height)

            y_position = table_start_y - table_height - 20
            total_ht = float(facture.amount)
            tva_rate = 0.13
            tva = total_ht * tva_rate
            timbre = 0.60
            total_ttc = total_ht + tva + timbre

            c.setFont("Helvetica", 10)
            c.drawRightString(width - 50, y_position, f"Total HT: {total_ht:,.2f} TND")
            c.drawRightString(width - 50, y_position - 15, f"TVA 13%: {tva:,.2f} TND")
            c.drawRightString(width - 50, y_position - 30, f"Timbre: {timbre:.2f} TND")
            c.setFont("Helvetica-Bold", 12)
            c.drawRightString(width - 50, y_position - 50, f"Total TTC: {total_ttc:,.2f} TND")

            c.showPage()
            c.save()

            return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_path)
        
        except Facture.DoesNotExist:
            return Response({"error": "Facture non trouvée"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in FacturePDFView: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

stripe.api_key = settings.STRIPE_SECRET_KEY

class PaymentIntentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, facture_id):
        try:
            facture = Facture.objects.get(id=facture_id)
            amount_usd = int(float(facture.amount) / 3.1 * 100)  # Convert TND to USD, multiply by 100 for cents

            payment_intent = stripe.PaymentIntent.create(
                amount=amount_usd,
                currency='usd',
                payment_method_types=['card'],
                metadata={'facture_id': facture.id},
                automatic_payment_methods={
                    'enabled': True,
                    'allow_redirects': 'never'
                },
            )

            payment = Payment.objects.create(
                facture=facture,
                paypal_order_id=f"stripe_{payment_intent.id}",  # Updated field
                amount=facture.amount,
                currency='USD',
                status='pending',
            )

            if payment_intent.get('risk_level'):
                payment.risk_level = payment_intent['risk_level']
                payment.save()

            return Response({
                'client_secret': payment_intent.client_secret,
                'payment_id': payment.id,
                'risk_level': payment.risk_level,
            }, status=status.HTTP_200_OK)

        except Facture.DoesNotExist:
            logger.error(f"Facture not found: {facture_id}")
            return Response({"error": "Facture non trouvée"}, status=status.HTTP_404_NOT_FOUND)
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in PaymentIntentView: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PaymentConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, payment_id):
        try:
            payment = Payment.objects.get(id=payment_id)
            payment_intent = stripe.PaymentIntent.retrieve(payment.paypal_order_id.replace('stripe_', ''))

            payment.status = payment_intent.status
            payment.risk_level = payment_intent.get('risk_level', 'unknown')
            payment.save()

            if payment_intent.status == 'succeeded':
                facture = payment.facture
                facture.status = 'paid'
                facture.save()
                logger.info(f"Payment succeeded for facture {facture.invoice_number}")

            return Response({
                'status': payment.status,
                'risk_level': payment.risk_level,
            }, status=status.HTTP_200_OK)

        except Payment.DoesNotExist:
            logger.error(f"Payment not found: {payment_id}")
            return Response({"error": "Paiement non trouvé"}, status=status.HTTP_404_NOT_FOUND)
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error in PaymentConfirmView: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in PaymentConfirmView: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DevisListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            devis = Devis.objects.all()
            serializer = DevisSerializer(devis, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in DevisListView: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DevisUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def put(self, request, pk):
        try:
            devis = Devis.objects.get(pk=pk)
            status = request.data.get('status')
            if status not in ['approved', 'rejected']:
                return Response({"error": "Statut invalide."}, status=status.HTTP_400_BAD_REQUEST)
            
            devis.status = status
            devis.save()

            if status == 'approved':
                facture_exists = Facture.objects.filter(devis=devis).exists()
                if not facture_exists:
                    invoice_number = f"F{devis.id:04d}-{uuid.uuid4().hex[:3].upper()}"
                    facture = Facture.objects.create(
                        client=devis.client,
                        devis=devis,
                        invoice_number=invoice_number,
                        amount=devis.amount,
                        status='unpaid'
                    )
                    LigneFacture.objects.create(
                        facture=facture,
                        designation=devis.description,
                        prix_unitaire=devis.amount,
                        quantite=1,
                        total=devis.amount
                    )
                    Historique.objects.create(
                        client=devis.client,
                        action=f"Facture #{facture.invoice_number} créée pour devis #{devis.id}"
                    )
                    logger.info(f"Facture created for devis {devis.id}: {facture.invoice_number}")
                    self.send_sms_notification(facture)

            serializer = DevisSerializer(devis)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Devis.DoesNotExist:
            logger.error(f"Devis not found: {pk}")
            return Response({"error": "Devis non trouvé."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in DevisUpdateView: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def send_sms_notification(self, facture):
        try:
            if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_PHONE_NUMBER]):
                logger.error(f"Twilio configuration incomplete for facture #{facture.invoice_number}")
                return

            if not re.match(r'^\+\d{10,15}$', settings.TWILIO_PHONE_NUMBER):
                logger.error(f"Invalid TWILIO_PHONE_NUMBER {settings.TWILIO_PHONE_NUMBER} for facture #{facture.invoice_number}")
                return

            client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            phone = facture.client.phone.strip()
            if not re.match(r'^\+\d{10,15}$', phone):
                if re.match(r'^[2579]\d{7}$', phone):
                    phone = f"+216{phone}"
                    logger.info(f"Normalized phone number to {phone} for facture #{facture.invoice_number}")
                else:
                    logger.error(f"Invalid phone number {phone} for facture #{facture.invoice_number}")
                    return
            message_body = (
                f"Bonjour {facture.client.name}, Société Devloppini vous informe : votre devis #{facture.devis.id if facture.devis else 'N/A'} "
                f"est accepté. Consultez votre facture #{facture.invoice_number} de {facture.amount} TND. Payez pour démarrer."
            )
            message = client.messages.create(
                body=message_body,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=phone
            )
            logger.info(f"SMS sent to {phone} for facture #{facture.invoice_number}: {message.sid}")
        except TwilioRestException as e:
            if e.code == 21660:
                logger.error(
                    f"Twilio error 21660 for facture #{facture.invoice_number}: "
                    f"Mismatch between 'From' number {settings.TWILIO_PHONE_NUMBER} and account."
                )
            else:
                logger.error(f"Twilio error sending SMS for facture #{facture.invoice_number}: {str(e)}")
        except Exception as e:
            logger.error(f"Error sending SMS for facture #{facture.invoice_number}: {str(e)}")

class ClientFactureListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            token = request.headers.get('Authorization', '').split('Bearer ')[1]
            decoded_token = jwt.decode(token, options={"verify_signature": False})
            role = decoded_token.get('role')
            client_id = decoded_token.get('client_id')

            if role != 'client' or not client_id:
                return Response({"error": "Accès réservé aux clients authentifiés."}, status=status.HTTP_403_FORBIDDEN)

            factures = Facture.objects.filter(client_id=client_id)
            serializer = FactureSerializer(factures, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in ClientFactureListView: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PayPalPaymentCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_paypal_access_token(self):
        url = "https://api-m.sandbox.paypal.com/v1/oauth2/token" if settings.PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com/v1/oauth2/token"
        headers = {
            "Accept": "application/json",
            "Accept-Language": "en_US",
        }
        data = {"grant_type": "client_credentials"}
        response = requests.post(url, headers=headers, data=data, auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET))
        response.raise_for_status()
        logger.info("Jeton d’accès PayPal obtenu avec succès")
        return response.json()["access_token"]

    def post(self, request, facture_id):
        logger.info(f"Création commande PayPal pour facture ID: {facture_id}")
        try:
            facture = Facture.objects.get(id=facture_id, client__user=request.user)
            if facture.status != "unpaid":
                logger.warning(f"Facture {facture_id} n’est pas impayée")
                return Response({"error": "Facture déjà payée ou invalide"}, status=status.HTTP_400_BAD_REQUEST)

            amount_usd = str(round(float(facture.amount) / 3.1, 2))
            logger.info(f"Montant converti en USD: {amount_usd}")

            access_token = self.get_paypal_access_token()
            url = "https://api-m.sandbox.paypal.com/v2/checkout/orders" if settings.PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com/v2/checkout/orders"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
            }
            payload = {
                "intent": "CAPTURE",
                "purchase_units": [{"amount": {"currency_code": "USD", "value": amount_usd}}],
            }
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            order_data = response.json()
            logger.info(f"Commande PayPal créée: {order_data}")

            Payment.objects.create(
                facture=facture,
                amount=facture.amount,
                currency="USD",
                status="pending",
                paypal_order_id=order_data["id"],
            )
            return Response({"order_id": order_data["id"]}, status=status.HTTP_200_OK)
        except Facture.DoesNotExist:
            logger.error(f"Facture non trouvée: {facture_id}")
            return Response({"error": "Facture non trouvée"}, status=status.HTTP_404_NOT_FOUND)
        except requests.RequestException as e:
            logger.error(f"Erreur API PayPal: {str(e)} - Réponse: {e.response.text if e.response else 'Aucune réponse'}")
            return Response({"error": "Erreur lors de la création de la commande PayPal"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class PayPalPaymentExecuteView(APIView):
    permission_classes = [IsAuthenticated]

    def get_paypal_access_token(self):
        url = "https://api-m.sandbox.paypal.com/v1/oauth2/token" if settings.PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com/v1/oauth2/token"
        headers = {
            "Accept": "application/json",
            "Accept-Language": "en_US",
        }
        data = {"grant_type": "client_credentials"}
        response = requests.post(url, headers=headers, data=data, auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET))
        response.raise_for_status()
        logger.info("Jeton d’accès PayPal obtenu avec succès")
        return response.json()["access_token"]

    def post(self, request, facture_id):
        logger.info(f"Capture paiement PayPal pour facture ID: {facture_id}, orderID: {request.data.get('order_id')}")
        try:
            order_id = request.data.get("order_id")
            if not order_id:
                logger.warning("order_id manquant dans la requête")
                return Response({"error": "order_id manquant"}, status=status.HTTP_400_BAD_REQUEST)

            access_token = self.get_paypal_access_token()
            url = f"https://api-m.sandbox.paypal.com/v2/checkout/orders/{order_id}/capture" if settings.PAYPAL_MODE == "sandbox" else f"https://api-m.paypal.com/v2/checkout/orders/{order_id}/capture"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
            }
            response = requests.post(url, headers=headers)
            response.raise_for_status()
            capture_data = response.json()
            logger.info(f"Paiement PayPal capturé: {capture_data}")

            payment = Payment.objects.get(paypal_order_id=order_id, facture__id=facture_id)
            payment.status = "completed"
            payment.save()

            facture = payment.facture
            facture.status = "paid"
            facture.save()

            return Response({"status": "Paiement capturé avec succès"}, status=status.HTTP_200_OK)
        except Payment.DoesNotExist:
            logger.error(f"Paiement non trouvé pour order_id: {order_id}")
            return Response({"error": "Paiement non trouvé"}, status=status.HTTP_404_NOT_FOUND)
        except requests.RequestException as e:
            logger.error(f"Erreur API PayPal lors de la capture: {str(e)} - Réponse: {e.response.text if e.response else 'Aucune réponse'}")
            return Response({"error": "Erreur lors de la capture du paiement"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PayPalPaymentCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logger.info("PayPal payment cancelled")
        return Response({"status": "Paiement annulé"}, status=status.HTTP_200_OK)

class ChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            logger.info(f"ChatView received request: {request.data}")
            message = request.data.get('message', '').lower().strip()
            logger.info(f"Processing message: {message}")

            if not message:
                logger.warning("No message provided in request data")
                return Response({'reply': 'Aucun message fourni.'}, status=status.HTTP_400_BAD_REQUEST)

            if 'bonjour' in message or 'salut' in message or 'hello' in message:
                reply = "Bonjour ! Je suis votre assistant automatique. Comment puis-je vous aider ? Essayez 'paiement', 'facture', 'devis', 'aide', 'compte', ou 'statut'."
            elif 'paiement' in message or 'payment' in message:
                reply = "Vérifiez vos factures sur la page Mes Factures pour le statut de paiement. Voulez-vous des infos sur les méthodes de paiement (carte, PayPal) ?"
            elif 'facture' in message or 'invoice' in message:
                reply = "Consultez vos factures sur la page Mes Factures ou téléchargez le PDF. Besoin d'aide avec une facture spécifique ?"
            elif 'devis' in message or 'quote' in message:
                reply = "Pour demander un devis, rendez-vous sur la page Demander un Devis. Voulez-vous suivre un devis existant ?"
            elif 'aide' in message or 'help' in message:
                reply = "Je peux aider avec les paiements, factures, devis, votre compte, ou la navigation. Essayez 'paiement', 'facture', 'devis', 'compte', 'statut', ou 'que pouvez-vous faire'."
            elif 'compte' in message or 'profil' in message or 'account' in message:
                reply = "Pour gérer votre compte, allez à la page Mon Profil. Voulez-vous modifier vos informations ou vérifier vos historiques ?"
            elif 'carte' in message or 'paypal' in message or 'payment method' in message:
                reply = "Nous acceptons les paiements par carte bancaire et PayPal. Consultez les options de paiement sur la page Mes Factures."
            elif 'statut' in message or 'status' in message:
                reply = "Pour vérifier le statut d'une facture ou d'un devis, allez à Mes Factures ou Mes Devis. Indiquez 'facture' ou 'devis' pour plus de détails."
            elif 'que pouvez-vous faire' in message or 'what can you do' in message:
                reply = "Je peux répondre à vos questions sur les paiements, factures, devis, votre compte, les méthodes de paiement, et plus encore. Essayez des mots comme 'paiement', 'facture', 'devis', 'compte', ou 'aide'."
            elif 'page' in message or 'où' in message or 'where' in message:
                reply = "Besoin de trouver une page ? Dites 'facture' pour Mes Factures, 'devis' pour Demander un Devis, ou 'compte' pour Mon Profil."
            else:
                reply = "Je ne comprends pas votre demande. Essayez des mots comme 'bonjour', 'paiement', 'facture', 'devis', 'aide', 'compte', 'statut', ou 'que pouvez-vous faire' pour une réponse."

            logger.info(f"Response generated: {reply}")
            return Response({'reply': reply}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Exception in ChatView: {str(e)}", exc_info=True)
            return Response(
                {'reply': 'Désolé, une erreur s\'est produite. Essayez à nouveau.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class TestimonialListView(generics.ListAPIView):
    queryset = Testimonial.objects.filter(is_approved=True)
    serializer_class = TestimonialSerializer
    permission_classes = [AllowAny]

class TestimonialCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = request.headers.get('Authorization', '').split('Bearer ')[1]
            decoded_token = jwt.decode(token, options={"verify_signature": False})
            role = decoded_token.get('role')
            client_id = decoded_token.get('client_id')

            if role != 'client':
                return Response({"error": "Seuls les clients peuvent soumettre un avis."}, status=status.HTTP_403_FORBIDDEN)

            if not client_id:
                logger.error("client_id missing in token")
                return Response({"error": "Client non authentifié. client_id manquant dans le token."}, status=status.HTTP_401_UNAUTHORIZED)

            try:
                client = Client.objects.get(id=client_id)
                logger.info(f"Client found: {client.id} - {client.email}")
            except Client.DoesNotExist:
                logger.error(f"Client not found for client_id: {client_id}")
                return Response({"error": "Client non trouvé."}, status=status.HTTP_404_NOT_FOUND)

            testimonial_data = {
                'client_id': client.id,
                'content': request.data.get('content'),
                'rating': request.data.get('rating'),
            }
            serializer = TestimonialSerializer(data=testimonial_data)
            if serializer.is_valid():
                serializer.save()
                logger.info(f"Avis créé par le client {client.email}")
                return Response({
                    'message': 'Avis soumis avec succès. En attente d’approbation.',
                    'testimonial': serializer.data
                }, status=status.HTTP_201_CREATED)
            logger.error(f"Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error in TestimonialCreateView: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class AdminTestimonialListView(generics.ListAPIView):
    queryset = Testimonial.objects.all()  # Liste tous les avis, approuvés ou non
    serializer_class = TestimonialSerializer
    permission_classes = [IsAdminUser]

class AdminTestimonialUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def put(self, request, pk):
        try:
            testimonial = Testimonial.objects.get(pk=pk)
            is_approved = request.data.get('is_approved')
            if is_approved is None:
                return Response({"error": "Le champ is_approved est requis."}, status=status.HTTP_400_BAD_REQUEST)

            testimonial.is_approved = is_approved
            testimonial.save()

            # Ajouter une entrée dans l'historique
            action = f"Avis #{testimonial.id} {'approuvé' if is_approved else 'désapprouvé'}"
            Historique.objects.create(
                client=testimonial.client,
                action=action
            )
            logger.info(f"{action} par admin")

            serializer = TestimonialSerializer(testimonial)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Testimonial.DoesNotExist:
            logger.error(f"Avis non trouvé: {pk}")
            return Response({"error": "Avis non trouvé."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Erreur dans AdminTestimonialUpdateView: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class AdminDevisRejectWithCounterOfferView(APIView):
    permission_classes = [IsAdminUser]

    def put(self, request, pk):
        try:
            devis = Devis.objects.get(pk=pk)
            counter_offer = request.data.get('counter_offer')
            specification_file = request.FILES.get('specification_pdf')

            if not counter_offer:
                return Response(
                    {"error": "La contre-proposition est requise."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            devis.status = 'rejected'
            devis.counter_offer = counter_offer
            devis.counter_offer_status = 'pending'

            # Handle PDF: Use uploaded file or generate a default one
            if specification_file:
                # Validate file type
                if not specification_file.name.lower().endswith('.pdf'):
                    logger.error(f"Invalid file type uploaded for devis #{pk}: {specification_file.name}")
                    return Response(
                        {"error": "Le fichier doit être un PDF."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                devis.specification_pdf = specification_file
                logger.info(f"Uploaded PDF saved for devis #{pk}: {specification_file.name}")
            else:
                # Generate default PDF
                buffer = BytesIO()
                c = canvas.Canvas(buffer, pagesize=letter)
                width, height = letter

                c.setFont("Helvetica-Bold", 14)
                c.drawString(50, height - 40, "Cahier des Charges")
                c.setFont("Helvetica", 12)
                c.drawString(50, height - 70, f"Devis #{devis.id}")
                c.drawString(50, height - 90, f"Client: {devis.client.name}")
                c.drawString(50, height - 110, f"Description: {devis.description}")
                c.drawString(50, height - 130, f"Contre-proposition: {counter_offer}")

                if devis.produit_details.exists():
                    c.drawString(50, height - 160, "Détails du Produit:")
                    y = height - 180
                    for detail in devis.produit_details.all():
                        c.drawString(50, y, f"Type: {detail.type_site}")
                        c.drawString(50, y - 20, f"Fonctionnalités: {detail.fonctionnalites or 'Aucune'}")
                        c.drawString(50, y - 40, f"Design personnalisé: {'Oui' if detail.design_personnalise else 'Non'}")
                        c.drawString(50, y - 60, f"SEO: {'Oui' if detail.integration_seo else 'Non'}")
                        y -= 80

                c.showPage()
                c.save()
                buffer.seek(0)
                filename = f"devis_{devis.id}_spec.pdf"
                # Save to default storage
                saved_path = default_storage.save(f"specifications/{filename}", ContentFile(buffer.getvalue()))
                devis.specification_pdf.name = saved_path
                buffer.close()
                logger.info(f"Default PDF generated and saved for devis #{pk}: {saved_path}")

            devis.save()

            Historique.objects.create(
                client=devis.client,
                action=f"Devis #{devis.id} rejeté avec contre-proposition"
            )
            logger.info(f"Devis #{devis.id} rejeté avec contre-proposition par admin")

            serializer = DevisSerializer(devis)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Devis.DoesNotExist:
            logger.error(f"Devis non trouvé: {pk}")
            return Response({"error": "Devis non trouvé."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Erreur dans AdminDevisRejectWithCounterOfferView: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
logger = logging.getLogger(__name__)

class ClientCounterOfferResponseView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        try:
            devis = Devis.objects.get(pk=pk)
            
            token = request.headers.get('Authorization', '').split('Bearer ')[1]
            decoded_token = jwt.decode(token, options={"verify_signature": False})
            role = decoded_token.get('role')
            client_id = decoded_token.get('client_id')

            if role != 'client':
                logger.warning(f"Non-client role ({role}) attempted to respond to counter-offer for devis #{pk}")
                return Response(
                    {"error": "Seuls les clients peuvent répondre à une contre-proposition."},
                    status=status.HTTP_403_FORBIDDEN
                )

            if not client_id or devis.client.id != client_id:
                logger.warning(f"Client ID mismatch or missing for devis #{pk}. Token client_id: {client_id}, Devis client_id: {devis.client.id}")
                return Response(
                    {"error": "Vous n'êtes pas autorisé à répondre à cette contre-proposition."},
                    status=status.HTTP_403_FORBIDDEN
                )

            if not devis.counter_offer or devis.counter_offer_status != 'pending':
                logger.warning(f"No pending counter-offer for devis #{pk}")
                return Response(
                    {"error": "Aucune contre-proposition en attente pour ce devis."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            action = request.data.get('action')
            modified_counter_offer = request.data.get('modified_counter_offer')

            if action not in ['accept', 'reject', 'modify']:
                logger.warning(f"Invalid action '{action}' for devis #{pk}")
                return Response(
                    {"error": "Action invalide. Utilisez 'accept', 'reject' ou 'modify'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if action == 'modify' and not modified_counter_offer:
                logger.warning(f"Missing modified counter-offer for devis #{pk}")
                return Response(
                    {"error": "Une contre-proposition modifiée est requise pour l'action 'modify'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if action == 'modify':
                devis.counter_offer = modified_counter_offer
                devis.counter_offer_status = 'pending'
                Historique.objects.create(
                    client=devis.client,
                    action=f"Devis #{devis.id}: Nouvelle contre-proposition soumise par le client"
                )
            else:
                devis.counter_offer_status = 'accepted' if action == 'accept' else 'rejected'
                if action == 'accept':
                    devis.status = 'approved'
                    amount_match = re.search(r'(\d+(?:\.\d{1,2})?)\s*TND', devis.counter_offer)
                    if amount_match:
                        new_amount = float(amount_match.group(1))
                        devis.amount = new_amount
                        logger.info(f"Updated devis #{pk} amount to {new_amount} TND based on counter-offer")

                    invoice_number = f"F{devis.id:04d}-{uuid.uuid4().hex[:3].upper()}"
                    facture = Facture.objects.create(
                        client=devis.client,
                        devis=devis,
                        invoice_number=invoice_number,
                        amount=devis.amount,
                        status='unpaid'
                    )
                    LigneFacture.objects.create(
                        facture=facture,
                        designation=devis.description,
                        prix_unitaire=devis.amount,
                        quantite=1,
                        total=devis.amount
                    )
                    logger.info(f"Facture #{facture.invoice_number} created for devis #{devis.id}")

            devis.save()

            Historique.objects.create(
                client=devis.client,
                action=f"Contre-proposition pour devis #{devis.id} {'acceptée' if action == 'accept' else 'rejetée' if action == 'reject' else 'modifiée'}"
            )
            logger.info(f"Contre-proposition pour devis #{devis.id} {devis.counter_offer_status if action != 'modify' else 'modified'} par client_id {client_id}")

            self.send_sms_notification(devis, action, facture if action == 'accept' else None)

            serializer = DevisSerializer(devis)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Devis.DoesNotExist:
            logger.error(f"Devis non trouvé: {pk}")
            return Response({"error": "Devis non trouvé."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Erreur dans ClientCounterOfferResponseView: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def send_sms_notification(self, devis, action, facture=None):
        try:
            if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_PHONE_NUMBER]):
                logger.error(f"Twilio configuration incomplete for devis #{devis.id}")
                return

            if not re.match(r'^\+\d{10,15}$', settings.TWILIO_PHONE_NUMBER):
                logger.error(f"Invalid TWILIO_PHONE_NUMBER {settings.TWILIO_PHONE_NUMBER} for devis #{devis.id}")
                return

            client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            phone = devis.client.phone.strip()
            if not re.match(r'^\+\d{10,15}$', phone):
                if re.match(r'^[2579]\d{7}$', phone):
                    phone = f"+216{phone}"
                    logger.info(f"Normalized phone number to {phone} for devis #{devis.id}")
                else:
                    logger.error(f"Invalid phone number {phone} for devis #{devis.id}")
                    return

            if action == 'accept' and facture:
                message_body = (
                    f"Vous avez accepté la contre-proposition pour le devis #{devis.id}. "
                    f"Consultez votre facture #{facture.invoice_number} de {facture.amount} TND."
                )
            elif action == 'modify':
                message_body = (
                    f"Vous avez soumis une modification à la contre-proposition pour le devis #{devis.id}. "
                    f"En attente de réponse de l'admin."
                )
            else:
                message_body = (
                    f"Vous avez rejeté la contre-proposition pour le devis #{devis.id}. "
                    f"Contactez-nous pour plus d'informations."
                )

            message = client.messages.create(
                body=message_body,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=phone
            )
            logger.info(f"SMS sent to {phone} for devis #{devis.id}: {message.sid}")
        except TwilioRestException as e:
            logger.error(f"Twilio error sending SMS for devis #{devis.id}: {str(e)}")
        except Exception as e:
            logger.error(f"Error sending SMS for devis #{devis.id}: {str(e)}")

# views.py (only the relevant DevisSpecificationPDFView part)
logger = logging.getLogger(__name__)

class DevisSpecificationPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            # Retrieve the devis
            devis = Devis.objects.get(pk=pk)
            
            # Extract and validate token
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                logger.error(f"Missing or malformed authentication token for devis {pk}, IP: {request.META.get('REMOTE_ADDR')}")
                return Response(
                    {"error": "Token d'authentification manquant ou mal formé."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            token = auth_header.split('Bearer ')[1]
            
            # Decode token with signature verification
            try:
                decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            except jwt.ExpiredSignatureError:
                logger.error(f"Expired token for devis {pk}, IP: {request.META.get('REMOTE_ADDR')}")
                return Response(
                    {"error": "Token expiré. Veuillez vous reconnecter."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            except jwt.InvalidTokenError:
                logger.error(f"Invalid token for devis {pk}, IP: {request.META.get('REMOTE_ADDR')}")
                return Response(
                    {"error": "Token invalide."},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            role = decoded_token.get('role')
            client_id = decoded_token.get('client_id')

            # Check permissions
            if role == 'client' and (not client_id or devis.client.id != int(client_id)):
                logger.warning(
                    f"Unauthorized access to devis {pk} by client_id {client_id}, "
                    f"Devis client_id: {devis.client.id}, IP: {request.META.get('REMOTE_ADDR')}"
                )
                return Response(
                    {"error": "Accès non autorisé au PDF."},
                    status=status.HTTP_403_FORBIDDEN
                )
            elif role not in ['admin', 'client']:
                logger.warning(
                    f"Unauthorized role ({role}) attempting to access devis {pk} PDF, "
                    f"IP: {request.META.get('REMOTE_ADDR')}"
                )
                return Response(
                    {"error": "Rôle non autorisé."},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check if PDF exists
            if not devis.specification_pdf:
                logger.warning(f"No PDF associated with devis {pk}, IP: {request.META.get('REMOTE_ADDR')}")
                return Response(
                    {"error": "Aucun PDF de spécifications disponible pour ce devis."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Verify file existence in storage using the model's method
            if not devis.has_pdf():
                logger.error(
                    f"PDF file not found at {devis.specification_pdf.name} for devis {pk}, "
                    f"IP: {request.META.get('REMOTE_ADDR')}"
                )
                return Response(
                    {"error": "Fichier PDF introuvable sur le serveur."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Log access in history
            Historique.objects.create(
                client=devis.client,
                action=f"Consultation du PDF de spécifications du devis #{devis.id}"
            )
            logger.info(
                f"Devis {pk} PDF accessed by {role} (client_id: {client_id or 'admin'}), "
                f"File: {devis.specification_pdf.name}, IP: {request.META.get('REMOTE_ADDR')}"
            )

            # Stream the file
            file = default_storage.open(devis.specification_pdf.name, 'rb')
            response = FileResponse(
                file,
                content_type='application/pdf'
            )
            filename = os.path.basename(devis.specification_pdf.name).replace(' ', '_')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response

        except Devis.DoesNotExist:
            logger.error(
                f"Devis not found: {pk}, IP: {request.META.get('REMOTE_ADDR')}"
            )
            return Response(
                {"error": "Devis non trouvé."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(
                f"Error in DevisSpecificationPDFView for devis {pk}: {str(e)}, "
                f"IP: {request.META.get('REMOTE_ADDR')}",
                exc_info=True
            )
            return Response(
                {"error": f"Erreur serveur: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class ClientProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            token = request.headers.get('Authorization', '').split('Bearer ')[1]
            decoded_token = jwt.decode(token, options={"verify_signature": False})
            client_id = decoded_token.get('client_id')

            if not client_id:
                logger.error("client_id missing in token")
                return Response({"error": "Client non authentifié."}, status=status.HTTP_401_UNAUTHORIZED)

            client = Client.objects.get(id=client_id)
            serializer = ClientSerializer(client)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Client.DoesNotExist:
            logger.error(f"Client not found for client_id: {client_id}")
            return Response({"error": "Client non trouvé."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in ClientProfileView: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Custom token generator for Client
logger = logging.getLogger(__name__)

# Custom token generator for Client
class ClientPasswordResetTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        return (
            str(user.pk) + str(timestamp) + str(user.is_active)
        )

password_reset_token = ClientPasswordResetTokenGenerator()

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            logger.error("Password reset requested without email")
            return Response(
                {"error": "L'email est requis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            client = Client.objects.get(email__iexact=email)
            if not client.is_active:
                logger.warning(f"Password reset requested for inactive client: {email}")
                return Response(
                    {"error": "Ce compte est désactivé."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Generate token and UID
            uid = urlsafe_base64_encode(force_bytes(client.pk))
            token = password_reset_token.make_token(client)
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"

            # Send email
            subject = "Réinitialisation de votre mot de passe"
            message = (
                f"Bonjour {client.name},\n\n"
                f"Vous avez demandé à réinitialiser votre mot de passe. "
                f"Cliquez sur le lien suivant pour définir un nouveau mot de passe :\n\n"
                f"{reset_url}\n\n"
                f"Ce lien est valide pendant 24 heures. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.\n\n"
                f"Cordialement,\nL'équipe de votre application"
            )
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [client.email], fail_silently=False)
            logger.info(f"Password reset email sent to {email}")

            return Response(
                {"message": "Un lien de réinitialisation a été envoyé à votre email."},
                status=status.HTTP_200_OK
            )

        except Client.DoesNotExist:
            logger.warning(f"Password reset requested for non-existent email: {email}")
            return Response(
                {"message": "Si un compte existe avec cet email, un lien de réinitialisation vous a été envoyé."},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Error in PasswordResetRequestView: {str(e)}", exc_info=True)
            return Response(
                {"error": "Une erreur est survenue. Veuillez réessayer."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')

        if not all([uidb64, token, new_password]):
            logger.error("Password reset confirmation missing required fields")
            return Response(
                {"error": "Tous les champs sont requis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            client = Client.objects.get(pk=uid)

            if not password_reset_token.check_token(client, token):
                logger.warning(f"Invalid or expired password reset token for client {client.email}")
                return Response(
                    {"error": "Lien de réinitialisation invalide ou expiré."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            client.set_password(new_password)
            client.save()

            # Sync password with User if exists
            try:
                user = User.objects.get(email=client.email)
                user.set_password(new_password)
                user.save()
                logger.info(f"Synced password for User {user.email}")
            except User.DoesNotExist:
                logger.info(f"No User found for client {client.email}, no sync needed")

            logger.info(f"Password reset successfully for client {client.email}")

            return Response(
                {"message": "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter."},
                status=status.HTTP_200_OK
            )

        except (TypeError, ValueError, OverflowError, Client.DoesNotExist):
            logger.warning(f"Invalid UID or client not found: {uidb64}")
            return Response(
                {"error": "Lien de réinitialisation invalide."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error in PasswordResetConfirmView: {str(e)}", exc_info=True)
            return Response(
                {"error": "Une erreur est survenue. Veuillez réessayer."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not all([current_password, new_password, confirm_password]):
            logger.error("Missing required fields in change password request")
            return Response(
                {"error": "Tous les champs sont requis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password != confirm_password:
            logger.error("New password and confirm password do not match")
            return Response(
                {"error": "Les nouveaux mots de passe ne correspondent pas."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Get the authenticated user
            user = request.user
            # Verify current password
            if not user.check_password(current_password):
                logger.warning(f"Invalid current password for user {user.email}")
                return Response(
                    {"error": "Mot de passe actuel incorrect."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Update User password
            user.set_password(new_password)
            user.save()

            # Sync with Client model
            try:
                client = Client.objects.get(email__iexact=user.email)
                client.set_password(new_password)
                client.save()
                logger.info(f"Password changed and synced for client {client.email}")
            except Client.DoesNotExist:
                logger.info(f"No Client found for user {user.email}, only User password updated")

            logger.info(f"Password changed successfully for user {user.email}")

            return Response(
                {"message": "Mot de passe changé avec succès."},
                status=status.HTTP_200_OK
            )

        except Exception as e:
            logger.error(f"Error in ChangePasswordView: {str(e)}", exc_info=True)
            return Response(
                {"error": "Une erreur est survenue. Veuillez réessayer."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class FactureSendEmailView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            # Retrieve the facture
            facture = Facture.objects.get(pk=pk)
            if facture.status != 'paid':
                logger.warning(f"Attempt to send email for non-paid facture {facture.invoice_number}")
                return Response(
                    {"error": "Seules les factures payées peuvent être envoyées par email."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verify client email
            client = facture.client
            if not client.email:
                logger.error(f"No email found for client {client.name}")
                return Response(
                    {"error": "Aucune adresse email trouvée pour ce client."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Generate PDF in memory (reused from FacturePDFView)
            buffer = BytesIO()
            c = canvas.Canvas(buffer, pagesize=letter)
            width, height = letter

            c.setFont("Helvetica-Bold", 14)
            c.setFillColor(colors.red)
            c.drawString(50, height - 40, "Ste Bonjour")
            c.setFont("Helvetica", 10)
            c.setFillColor(colors.black)
            c.drawString(50, height - 55, "Rue Salem Alaykom, Ariana Tunisie")
            c.drawString(50, height - 70, "Matricule Fiscale: XXXXXXXXXXXX")
            c.drawString(400, height - 40, "Tél: +216 XX XXX XXX")
            c.drawString(400, height - 55, "e-mail: Bonjour@gmail.com")
            c.drawString(400, height - 70, "Site: www.aaaaa.com")

            c.setFont("Helvetica", 10)
            c.drawString(50, height - 100, f"Date: {facture.created_at.strftime('%d/%m/%Y')}")
            c.setFont("Helvetica-Bold", 12)
            c.drawString(50, height - 115, f"Facture: {facture.invoice_number}")

            c.setFont("Helvetica", 10)
            c.drawString(400, height - 100, f"{facture.client.name}")
            c.drawString(400, height - 115, "Rue N°1, Ariana")
            c.drawString(400, height - 130, "Matricule Fiscale: XXXXXXXXXXXX")

            data = [["Désignation", "Prix unitaire", "Quantité", "Total"]]
            lignes = facture.lignes.all()
            if lignes.exists():
                for ligne in lignes:
                    data.append([
                        ligne.designation,
                        f"{ligne.prix_unitaire:,.2f} TND",
                        str(ligne.quantite),
                        f"{ligne.total:,.2f} TND"
                    ])

            table = Table(data, colWidths=[200, 100, 80, 100])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('GRID', (0, 0), (-1, 0), 1, colors.black),
                ('GRID', (0, -1), (-1, -1), 1, colors.black),
            ]))

            table_start_y = height - 180
            table_width, table_height = table.wrap(width - 100, table_start_y)
            table.drawOn(c, 50, table_start_y - table_height)

            y_position = table_start_y - table_height - 20
            total_ht = float(facture.amount)
            tva_rate = 0.13
            tva = total_ht * tva_rate
            timbre = 0.60
            total_ttc = total_ht + tva + timbre

            c.setFont("Helvetica", 10)
            c.drawRightString(width - 50, y_position, f"Total HT: {total_ht:,.2f} TND")
            c.drawRightString(width - 50, y_position - 15, f"TVA 13%: {tva:,.2f} TND")
            c.drawRightString(width - 50, y_position - 30, f"Timbre: {timbre:.2f} TND")
            c.setFont("Helvetica-Bold", 12)
            c.drawRightString(width - 50, y_position - 50, f"Total TTC: {total_ttc:,.2f} TND")

            c.showPage()
            c.save()
            buffer.seek(0)

            # Create and send email
            subject = f"Votre facture {facture.invoice_number} - Ste Bonjour"
            message = (
                f"Bonjour {client.name},\n\n"
                f"Veuillez trouver ci-joint votre facture {facture.invoice_number} pour un montant de {facture.amount} TND.\n"
                f"Merci pour votre paiement.\n\n"
                f"Cordialement,\nL'équipe Ste Bonjour"
            )
            email = EmailMessage(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [client.email],
            )
            email.attach(f"facture_{facture.invoice_number}.pdf", buffer.getvalue(), 'application/pdf')
            email.send()

            logger.info(f"Email sent for facture {facture.invoice_number} to {client.email}")
            buffer.close()

            return Response(
                {"message": "Email envoyé avec succès."},
                status=status.HTTP_200_OK
            )

        except Facture.DoesNotExist:
            logger.error(f"Facture not found: {pk}")
            return Response(
                {"error": "Facture non trouvée."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error sending email for facture {pk}: {str(e)}")
            return Response(
                {"error": f"Erreur lors de l'envoi de l'email: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

