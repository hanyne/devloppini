# Generated by Django 5.1.7 on 2025-05-07 22:58

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("dashboard", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="lignefacture",
            name="prix_unitaire",
            field=models.DecimalField(decimal_places=2, max_digits=10),
        ),
        migrations.AlterField(
            model_name="lignefacture",
            name="total",
            field=models.DecimalField(decimal_places=2, editable=False, max_digits=10),
        ),
        migrations.AlterField(
            model_name="payment",
            name="amount",
            field=models.DecimalField(decimal_places=2, max_digits=10),
        ),
        migrations.AlterField(
            model_name="payment",
            name="currency",
            field=models.CharField(default="USD", max_length=3),
        ),
        migrations.AlterField(
            model_name="service",
            name="price_range",
            field=models.CharField(help_text="Ex: 500-1000 USD", max_length=50),
        ),
        migrations.DeleteModel(
            name="Quote",
        ),
    ]
