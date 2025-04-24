import jwt
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
import re
from pdf2image import convert_from_path
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from .models import Client, Devis, Facture, Historique, Payment, Service, UserProfile
from .serializers import (
    ClientSerializer, DevisSerializer, FactureSerializer,
    HistoriqueSerializer, PaymentSerializer, LigneFactureSerializer, ProduitDetailSerializer, ServiceSerializer,
    CustomTokenObtainPairSerializer
)
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

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

            # Step 1: Check if the user is a superuser (admin)
            user = authenticate(username=email, password=password)
            if user is not None:
                if user.is_superuser:
                    # Ensure UserProfile exists for the superuser
                    profile, created = UserProfile.objects.get_or_create(user=user, defaults={'role': 'admin'})
                    if created:
                        print(f"Created UserProfile for admin {email} with role 'admin'")
                    else:
                        # Ensure the role is 'admin' for superusers
                        if profile.role != 'admin':
                            profile.role = 'admin'
                            profile.save()
                            print(f"Updated UserProfile role for {email} to 'admin'")

                    # Admin login
                    refresh = RefreshToken.for_user(user)
                    refresh['role'] = 'admin'
                    return Response({
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    }, status=status.HTTP_200_OK)
                else:
                    # If the user exists but is not a superuser, check if they have a Client record
                    try:
                        client = Client.objects.get(email=email)
                        if not client.check_password(password):
                            return Response({"error": "Mot de passe incorrect."}, status=status.HTTP_400_BAD_REQUEST)

                        # Ensure UserProfile exists for the client
                        profile, created = UserProfile.objects.get_or_create(user=user, defaults={'role': 'client'})
                        if created:
                            print(f"Created UserProfile for client {email} with role 'client'")
                        else:
                            # Ensure the role is 'client' for non-superusers
                            if profile.role != 'client':
                                profile.role = 'client'
                                profile.save()
                                print(f"Updated UserProfile role for {email} to 'client'")

                        # Generate JWT token for Client
                        refresh = RefreshToken.for_user(user)
                        refresh['client_id'] = client.id
                        refresh['role'] = 'client'

                        return Response({
                            'refresh': str(refresh),
                            'access': str(refresh.access_token),
                        }, status=status.HTTP_200_OK)

                    except Client.DoesNotExist:
                        return Response({"error": "Compte utilisateur trouvé mais pas de compte client associé. Contactez l'administrateur."}, status=status.HTTP_400_BAD_REQUEST)

            # Step 2: If authenticate failed, check the Client model directly
            try:
                client = Client.objects.get(email=email)
                if not client.check_password(password):
                    return Response({"error": "Mot de passe incorrect."}, status=status.HTTP_400_BAD_REQUEST)

                # Find or create a User instance for JWT
                user, created = User.objects.get_or_create(
                    username=email,
                    defaults={'email': email}
                )
                if created:
                    user.set_password(password)
                    user.save()
                    UserProfile.objects.create(user=user, role='client')
                    print(f"Created new User and UserProfile for client {email}")
                else:
                    if not user.check_password(password):
                        user.set_password(password)
                        user.save()
                        print(f"Updated password for existing User {email}")

                    # Ensure UserProfile exists
                    profile, created = UserProfile.objects.get_or_create(user=user, defaults={'role': 'client'})
                    if created:
                        print(f"Created UserProfile for client {email} with role 'client'")
                    else:
                        if profile.role != 'client':
                            profile.role = 'client'
                            profile.save()
                            print(f"Updated UserProfile role for {email} to 'client'")

                # Generate JWT token for Client
                refresh = RefreshToken.for_user(user)
                refresh['client_id'] = client.id
                refresh['role'] = 'client'

                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }, status=status.HTTP_200_OK)

            except Client.DoesNotExist:
                return Response({"error": "Aucun compte (admin ou client) trouvé avec cet email."}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
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

            client = Client(
                name=name,
                email=email,
                phone=phone,
            )
            print(f"Before hashing - Raw password: {password}")
            client.set_password(password)
            print(f"After hashing - In-memory password: {client.password}")
            client.save()
            saved_client = Client.objects.get(email=email)
            print(f"After saving - Stored password in DB: {saved_client.password}")

            # Create a corresponding User for JWT
            user, created = User.objects.get_or_create(
                username=email,
                defaults={'email': email}
            )
            if created:
                user.set_password(password)
                user.save()
                UserProfile.objects.create(user=user, role='client')

            return Response({"message": "Client créé avec succès."}, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ServiceListView(generics.ListAPIView):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [AllowAny]

class PublicDevisCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Extract and decode the JWT token
            token = request.headers.get('Authorization', '').split('Bearer ')[1]
            decoded_token = jwt.decode(token, options={"verify_signature": False})
            print("Decoded JWT token:", decoded_token)  # Debugging: Log the token contents
            role = decoded_token.get('role')
            client_id = decoded_token.get('client_id')

            # Verify the role and client_id
            if role != 'client':
                return Response({"error": "Seuls les clients peuvent créer un devis."}, status=status.HTTP_403_FORBIDDEN)

            if not client_id:
                print("client_id manquant dans le token.")  # Debugging
                return Response({"error": "Client non authentifié. client_id manquant dans le token."}, status=status.HTTP_401_UNAUTHORIZED)

            try:
                client = Client.objects.get(id=client_id)
                print(f"Client trouvé: {client.id} - {client.email}")  # Debugging
            except Client.DoesNotExist:
                print(f"Client non trouvé pour client_id: {client_id}")  # Debugging
                return Response({"error": "Client non trouvé."}, status=status.HTTP_404_NOT_FOUND)

            # Prepare devis data without the client field for now
            devis_data = {
                'description': request.data.get('project_type'),
                'amount': float(request.data.get('budget', 0)),
                'details': request.data.get('details', ''),
                'status': 'pending',
            }
            print("Données du devis avant sérialisation:", devis_data)  # Debugging

            # Serialize the devis data
            devis_serializer = DevisSerializer(data=devis_data)
            if not devis_serializer.is_valid():
                print("Erreurs de validation du devis:", devis_serializer.errors)  # Debugging
                return Response(devis_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Save the devis with the client explicitly set
            devis = devis_serializer.save(client=client)  # Explicitly set the client
            print(f"Devis créé avec ID: {devis.id}, client_id: {devis.client.id}")  # Debugging

            # Create associated ProduitDetail
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
                print("Erreurs de validation de ProduitDetail:", produit_detail_serializer.errors)  # Debugging
                return Response(produit_detail_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            produit_detail_serializer.save()

            # Create a history entry
            Historique.objects.create(
                client=client,
                action=f"Demande de devis soumise - {devis.description}",
            )

            return Response({
                'message': 'Demande de devis soumise avec succès.',
                'devis': devis_serializer.data,
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            print("Erreur lors de la création du devis:", str(e))  # Debugging
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

class ClientDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer

class DevisListCreateView(generics.ListCreateAPIView):
    serializer_class = DevisSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Get the JWT token from the request headers
        token = self.request.headers.get('Authorization', '').split('Bearer ')[1]
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        role = decoded_token.get('role')
        client_id = decoded_token.get('client_id')

        if role == 'admin':
            # Admins can see all devis
            return Devis.objects.all()
        elif role == 'client' and client_id:
            # Clients can only see their own devis
            return Devis.objects.filter(client_id=client_id)
        else:
            return Devis.objects.none()  # Return empty queryset if role is invalid

class DevisDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Devis.objects.all()
    serializer_class = DevisSerializer
    permission_classes = [IsAuthenticated]

class FactureListCreateView(generics.ListCreateAPIView):
    queryset = Facture.objects.all()
    serializer_class = FactureSerializer

class FactureDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Facture.objects.all()
    serializer_class = FactureSerializer

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
            return Response({"error": f"Erreur lors du traitement OCR: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FacturePDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
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
                    f"{ligne.prix_unitaire:,.3f} DT",
                    str(ligne.quantite),
                    f"{ligne.total:,.3f} DT"
                ])
        else:
            pass

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
        timbre = 0.600
        total_ttc = total_ht + tva + timbre

        c.setFont("Helvetica", 10)
        c.drawRightString(width - 50, y_position, f"Total HT: {total_ht:,.3f} DT")
        c.drawRightString(width - 50, y_position - 15, f"TVA 13%: {tva:,.3f} DT")
        c.drawRightString(width - 50, y_position - 30, f"Timbre: {timbre:.3f} DT")
        c.setFont("Helvetica-Bold", 12)
        c.drawRightString(width - 50, y_position - 50, f"Total TTC: {total_ttc:,.3f} DT")

        c.showPage()
        c.save()

        return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_path)

stripe.api_key = settings.STRIPE_SECRET_KEY

class PaymentIntentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, facture_id):
        try:
            facture = Facture.objects.get(id=facture_id)
            amount = int(float(facture.amount) * 100)

            payment_intent = stripe.PaymentIntent.create(
                amount=amount,
                currency='tnd',
                payment_method_types=['card'],
                metadata={'facture_id': facture.id},
                automatic_payment_methods={
                    'enabled': True,
                    'allow_redirects': 'never'
                },
            )

            payment = Payment.objects.create(
                facture=facture,
                stripe_payment_intent_id=payment_intent.id,
                amount=facture.amount,
                currency='TND',
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
            return Response({"error": "Facture non trouvée"}, status=status.HTTP_404_NOT_FOUND)
        except stripe.error.StripeError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PaymentConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, payment_id):
        try:
            payment = Payment.objects.get(id=payment_id)
            payment_intent = stripe.PaymentIntent.retrieve(payment.stripe_payment_intent_id)

            payment.status = payment_intent.status
            payment.risk_level = payment_intent.get('risk_level', 'unknown')
            payment.save()

            if payment_intent.status == 'succeeded':
                facture = payment.facture
                facture.status = 'paid'
                facture.save()

            return Response({
                'status': payment.status,
                'risk_level': payment.risk_level,
            }, status=status.HTTP_200_OK)

        except Payment.DoesNotExist:
            return Response({"error": "Paiement non trouvé"}, status=status.HTTP_404_NOT_FOUND)
        except stripe.error.StripeError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DevisListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            devis = Devis.objects.all()
            serializer = DevisSerializer(devis, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
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
            serializer = DevisSerializer(devis)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Devis.DoesNotExist:
            return Response({"error": "Devis non trouvé."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)