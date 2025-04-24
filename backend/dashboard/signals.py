from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        # Créer un UserProfile avec le rôle par défaut 'client'
        # Si l'utilisateur est un superuser, on lui attribue le rôle 'admin'
        role = 'admin' if instance.is_superuser else 'client'
        UserProfile.objects.create(user=instance, role=role)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    # S'assurer que le UserProfile est sauvegardé si l'utilisateur est mis à jour
    if hasattr(instance, 'profile'):
        instance.profile.save()