import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="branch",
            name="hint",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.CreateModel(
            name="UserProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("display_name", models.CharField(blank=True, max_length=255)),
                ("phone", models.CharField(blank=True, max_length=64)),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("client", "client"),
                            ("trainer", "trainer"),
                            ("admin", "admin"),
                            ("director", "director"),
                        ],
                        default="client",
                        max_length=32,
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="courtly_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
    ]
